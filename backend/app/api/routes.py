import json
from datetime import date, datetime, timedelta
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.admin import _load_admin_settings
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_optional_user
from app.entities.comments.models import Comment
from app.entities.games.models import Game, GameQuestion, GameScore, GameSetting
from app.entities.home.models import HomeSliderItem
from app.entities.lessons.models import LessonVideoLink
from app.entities.lessons.service import get_lesson, list_lessons, to_embed_url
from app.entities.localization.service import resolve_language
from app.entities.tasks.models import TaskSubmission
from app.entities.tasks.service import check_answer, get_task, get_user_submissions_for_task, list_tasks, submit_answer
from app.entities.users.models import User, UserActivity
from app.entities.users.schemas import UserRegister
from app.entities.users.service import (
    authenticate_user,
    create_google_user,
    create_user,
    get_by_email,
    get_by_google_sub,
)

api_router = APIRouter(prefix="/api", tags=["api"])
oauth_router = APIRouter(prefix="/auth", tags=["auth"])
SUPPORTED_GAME_ENGINES = {
    "binary-blitz",
    "binary-blitz-2",
    "bug-hunt",
    "code-runner-race",
    "memory-syntax",
    "hacker-escape",
    "typing-speed-code",
    "typing-race",
    "output-guess",
    "quiz-arena",
    "external",
}
MAX_LESSON_VIDEO_LINKS = 50


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterPayload(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class CommentPayload(BaseModel):
    content: str = Field(min_length=1, max_length=3000)


class TaskAnswerPayload(BaseModel):
    answer: str = Field(min_length=1, max_length=10000)


class ScorePayload(BaseModel):
    score: int = Field(ge=0, le=1_000_000)
    combo: int | None = Field(default=None, ge=0, le=1000)
    durationSeconds: int | None = Field(default=None, ge=0, le=24 * 60 * 60)


def _get_lang(request: Request, lang: str | None) -> str:
    if lang and lang in settings.supported_languages_list:
        request.session["language"] = lang
        return lang
    return resolve_language(request)


def _to_iso(value: datetime) -> str:
    return value.isoformat()


def _normalize_game_engine(engine: str | None) -> str:
    normalized = (engine or "").strip().lower()
    if normalized in SUPPORTED_GAME_ENGINES:
        return normalized
    return "quiz-arena"


def _safe_json_loads(raw: str | None, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def _task_xp_reward(task) -> int:
    fallback = 120 if task.difficulty == "hard" else 80 if task.difficulty == "medium" else 50
    return max(0, int(getattr(task, "xp_reward", None) or fallback))


def _award_user_xp(db: Session, user: User, amount: int, activity_type: str) -> int:
    amount = max(0, int(amount or 0))
    if amount <= 0:
        return 0

    today = date.today()
    yesterday = today - timedelta(days=1)
    if user.last_activity_date == today:
        next_streak = user.current_streak or 1
    elif user.last_activity_date == yesterday:
        next_streak = (user.current_streak or 0) + 1
    else:
        next_streak = 1

    user.xp = (user.xp or 0) + amount
    user.current_streak = next_streak
    user.longest_streak = max(user.longest_streak or 0, next_streak)
    user.last_activity_date = today
    db.add(user)
    db.add(UserActivity(user_id=user.id, activity_type=activity_type, xp_gained=amount))
    return amount


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "isAdmin": user.is_admin,
        "preferredLanguage": user.preferred_language,
        "role": getattr(user, "role", "super_admin" if user.is_admin else "user"),
        "xp": user.xp,
        "level": user.level,
        "currentStreak": user.current_streak,
        "longestStreak": user.longest_streak,
        "lastActivityDate": user.last_activity_date.isoformat() if user.last_activity_date else None,
        "totalActivities": len(user.user_activities) if getattr(user, "user_activities", None) is not None else 0,
    }


def _serialize_lesson_link(link: LessonVideoLink, lang: str) -> dict:
    return {
        "id": link.id,
        "title": link.localized_title(lang),
        "url": link.url,
        "embedUrl": to_embed_url(link.url),
        "position": link.position,
    }


def _serialize_lesson(lesson, lang: str, include_links: bool = False) -> dict:
    links = []
    for link in list(getattr(lesson, "video_links", []) or []):
        if not (link.url or "").strip():
            continue
        links.append(_serialize_lesson_link(link, lang))
        if len(links) >= MAX_LESSON_VIDEO_LINKS:
            break

    if not links and lesson.youtube_url:
        links = [
            {
                "id": None,
                "title": lesson.localized_title(lang),
                "url": lesson.youtube_url,
                "embedUrl": to_embed_url(lesson.youtube_url),
                "position": 1,
            }
        ]

    primary = links[0] if links else None
    return {
        "id": lesson.id,
        "title": lesson.localized_title(lang),
        "description": lesson.localized_description(lang),
        "youtubeUrl": primary["url"] if primary else lesson.youtube_url,
        "embedUrl": primary["embedUrl"] if primary else to_embed_url(lesson.youtube_url),
        "thumbnailUrl": getattr(lesson, "thumbnail_url", None),
        "category": getattr(lesson, "category", "python") or "python",
        "difficulty": getattr(lesson, "difficulty", "beginner"),
        "duration": getattr(lesson, "duration", None),
        "xpReward": getattr(lesson, "xp_reward", 50),
        "isPublished": getattr(lesson, "is_published", True),
        "linksCount": len(links),
        **({"links": links} if include_links else {}),
        "createdAt": _to_iso(lesson.created_at),
    }


def _serialize_slider_item(item: HomeSliderItem, lang: str) -> dict:
    return {
        "id": item.id,
        "title": item.localized_title(lang),
        "description": item.localized_description(lang),
        "imageUrl": item.image_url,
        "targetUrl": item.target_url,
        "position": item.position,
    }


def _serialize_task(task, lang: str) -> dict:
    return {
        "id": task.id,
        "title": task.localized_title(lang),
        "description": task.localized_description(lang),
        "difficulty": task.difficulty,
        "hint": task.localized_hint(lang) if hasattr(task, "localized_hint") else "",
        "xpReward": _task_xp_reward(task),
        "timeLimitMinutes": int(getattr(task, "time_limit_minutes", None) or 8),
        "createdAt": _to_iso(task.created_at),
    }


def _serialize_submission(submission) -> dict:
    return {
        "id": submission.id,
        "answer": submission.answer,
        "isCorrect": submission.is_correct,
        "createdAt": _to_iso(submission.created_at),
    }


def _serialize_comment(comment, lang: str) -> dict:
    author = comment.author
    deleted_user_name = "Deleted user" if lang == "en" else "Удаленный пользователь"
    return {
        "id": comment.id,
        "content": comment.content,
        "createdAt": _to_iso(comment.created_at),
        "author": {
            "id": author.id if author else None,
            "fullName": author.full_name if author else deleted_user_name,
        },
    }


def _serialize_game_question(question: GameQuestion, lang: str) -> dict:
    options = _safe_json_loads(question.localized_options_json(lang), [])
    if not isinstance(options, list):
        options = []
    normalized_options = [str(item) for item in options]
    return {
        "id": question.id,
        "position": question.position,
        "title": question.localized_prompt(lang),
        "code": question.code_snippet or "",
        "choices": normalized_options,
        "correct": question.correct_index,
    }


def _serialize_game(game: Game, lang: str, include_content: bool = False) -> dict:
    setting: GameSetting | None = game.setting
    config = _safe_json_loads(setting.config_json if setting else None, {})
    if not isinstance(config, dict):
        config = {}

    payload = {
        "id": game.id,
        "slug": game.slug,
        "title": game.localized_title(lang),
        "description": game.localized_description(lang),
        "engine": _normalize_game_engine(game.engine),
        "imageUrl": setting.image_url if setting else None,
        "externalUrl": setting.external_url if setting else None,
        "isActive": game.is_active,
        "xpReward": int(config.get("xpReward") or config.get("xp_reward") or 75),
        "timeLimit": int(config.get("timeLimit") or config.get("time_limit") or 60),
    }
    if include_content:
        payload["config"] = config
        payload["questions"] = [_serialize_game_question(item, lang) for item in list(game.questions or [])]
    return payload


def _google_redirect_uri(request: Request) -> str:
    configured = (settings.google_redirect_uri or "").strip()
    if configured and configured.lower() not in {"auto", "dynamic"}:
        return configured
    return str(request.url_for("google_callback"))


@api_router.get("/meta")
def api_meta(request: Request, db: Session = Depends(get_db)):
    current_user = get_optional_user(request, db)
    lang = resolve_language(request)
    google_enabled = bool(settings.google_client_id and settings.google_client_secret)
    return {
        "projectName": settings.project_name,
        "supportedLanguages": settings.supported_languages_list,
        "defaultLanguage": settings.default_language,
        "language": lang,
        "googleEnabled": google_enabled,
        "googleRedirectUri": _google_redirect_uri(request) if google_enabled else None,
        "user": _serialize_user(current_user) if current_user else None,
    }


@api_router.post("/auth/register")
def api_register(payload: RegisterPayload, request: Request, db: Session = Depends(get_db)):
    if get_by_email(db, payload.email.lower()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_exists")

    user = create_user(
        db,
        UserRegister(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        ),
    )
    language = resolve_language(request)
    user.preferred_language = language
    db.add(user)
    db.commit()
    db.refresh(user)
    request.session["user_id"] = user.id
    return {"ok": True, "user": _serialize_user(user)}


@api_router.post("/auth/login")
def api_login(payload: LoginPayload, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")

    request.session["user_id"] = user.id
    return {"ok": True, "user": _serialize_user(user)}


@api_router.post("/auth/logout")
def api_logout(request: Request):
    request.session.pop("user_id", None)
    return {"ok": True}


@api_router.get("/auth/me")
def api_me(request: Request, db: Session = Depends(get_db)):
    user = get_optional_user(request, db)
    lang = resolve_language(request)
    return {
        "authenticated": bool(user),
        "language": lang,
        "googleEnabled": bool(settings.google_client_id and settings.google_client_secret),
        "user": _serialize_user(user) if user else None,
    }


@api_router.get("/localization")
def api_localization_status(request: Request):
    return {
        "language": resolve_language(request),
        "supportedLanguages": settings.supported_languages_list,
    }


@api_router.post("/localization/{lang}")
def api_set_language(lang: str, request: Request, db: Session = Depends(get_db)):
    if lang not in settings.supported_languages_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported_language")

    request.session["language"] = lang
    current_user = get_optional_user(request, db)
    if current_user:
        current_user.preferred_language = lang
        db.add(current_user)
        db.commit()
    return {"ok": True, "language": lang}


@api_router.get("/home")
def api_home(request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    language = _get_lang(request, lang)
    lessons = [_serialize_lesson(item, language) for item in list_lessons(db)[:3]]
    tasks = [_serialize_task(item, language) for item in list_tasks(db)[:3]]
    slider_items = [
        _serialize_slider_item(item, language)
        for item in db.scalars(
            select(HomeSliderItem)
            .where(HomeSliderItem.is_active.is_(True))
            .order_by(HomeSliderItem.position.asc(), HomeSliderItem.created_at.asc())
            .limit(12)
        ).all()
    ]
    return {
        "lessons": lessons,
        "tasks": tasks,
        "slider": slider_items,
        "siteSettings": _load_admin_settings().get("cms", {}),
    }


@api_router.get("/lessons")
def api_lessons(
    request: Request,
    lang: str | None = Query(default=None),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    language = _get_lang(request, lang)
    lessons = [_serialize_lesson(item, language) for item in list_lessons(db, category=category)]
    return {"items": lessons}


@api_router.get("/lessons/{lesson_id}")
def api_lesson_detail(lesson_id: int, request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    language = _get_lang(request, lang)
    lesson = get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lesson_not_found")

    comments = list(
        db.scalars(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.lesson_id == lesson.id)
            .order_by(Comment.created_at.desc())
        ).all()
    )
    return {
        "lesson": _serialize_lesson(lesson, language, include_links=True),
        "comments": [_serialize_comment(comment, language) for comment in comments],
    }


@api_router.post("/lessons/{lesson_id}/comments")
def api_add_comment(
    lesson_id: int,
    payload: CommentPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth_required")

    lesson = get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lesson_not_found")

    comment = Comment(content=payload.content.strip(), lesson_id=lesson.id, user_id=current_user.id)
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "ok": True,
        "comment": {
            "id": comment.id,
            "content": comment.content,
            "createdAt": _to_iso(comment.created_at),
            "author": {"id": current_user.id, "fullName": current_user.full_name},
        },
    }


@api_router.get("/tasks")
def api_tasks(request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    language = _get_lang(request, lang)
    tasks = [_serialize_task(item, language) for item in list_tasks(db)]
    return {"items": tasks}


@api_router.get("/tasks/{task_id}")
def api_task_detail(task_id: int, request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    language = _get_lang(request, lang)
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_not_found")

    current_user = get_optional_user(request, db)
    submissions = []
    if current_user:
        submissions = get_user_submissions_for_task(db, task_id=task.id, user_id=current_user.id)

    return {
        "task": _serialize_task(task, language),
        "submissions": [_serialize_submission(item) for item in submissions],
    }


@api_router.post("/tasks/{task_id}/submit")
def api_submit_task(
    task_id: int,
    payload: TaskAnswerPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task_not_found")

    if not current_user:
        is_correct = check_answer(task, payload.answer)
        return {
            "ok": True,
            "result": "correct" if is_correct else "incorrect",
            "submission": {
                "id": None,
                "answer": payload.answer,
                "isCorrect": is_correct,
                "createdAt": _to_iso(datetime.utcnow()),
            },
            "xpReward": _task_xp_reward(task),
            "xpAwarded": 0,
            "saved": False,
            "requiresAuthForSave": True,
            "user": None,
        }

    had_correct_submission = db.scalar(
        select(TaskSubmission.id)
        .where(
            TaskSubmission.task_id == task.id,
            TaskSubmission.user_id == current_user.id,
            TaskSubmission.is_correct.is_(True),
        )
        .limit(1)
    )
    submission = submit_answer(db, task=task, user_id=current_user.id, answer=payload.answer)
    xp_reward = _task_xp_reward(task)
    xp_awarded = 0
    if submission.is_correct and not had_correct_submission:
        xp_awarded = _award_user_xp(db, current_user, xp_reward, "task_solved")
        db.commit()
        db.refresh(current_user)
    return {
        "ok": True,
        "result": "correct" if submission.is_correct else "incorrect",
        "submission": _serialize_submission(submission),
        "xpReward": xp_reward,
        "xpAwarded": xp_awarded,
        "saved": True,
        "requiresAuthForSave": False,
        "user": _serialize_user(current_user),
    }


@api_router.get("/games")
def api_games(request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    language = _get_lang(request, lang)
    items = [
        _serialize_game(game, language)
        for game in db.scalars(
            select(Game)
            .options(selectinload(Game.setting))
            .where(Game.is_active.is_(True))
            .order_by(Game.created_at.asc())
        ).all()
    ]
    return {"items": items}


@api_router.get("/games/{game_slug}")
def api_game_detail(game_slug: str, request: Request, lang: str | None = Query(default=None), db: Session = Depends(get_db)):
    game = db.scalar(
        select(Game)
        .options(selectinload(Game.setting), selectinload(Game.questions))
        .where(Game.slug == game_slug, Game.is_active.is_(True))
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="game_not_found")

    language = _get_lang(request, lang)
    deleted_user_name = "Deleted user" if language == "en" else "Удаленный пользователь"
    leaderboard = list(
        db.scalars(
            select(GameScore)
            .options(selectinload(GameScore.user))
            .where(GameScore.game_slug == game_slug)
            .order_by(GameScore.score.desc(), GameScore.created_at.asc())
            .limit(10)
        ).all()
    )
    return {
        "game": _serialize_game(game, language, include_content=True),
        "leaderboard": [
            {
                "id": item.id,
                "score": item.score,
                "createdAt": _to_iso(item.created_at),
                "user": {
                    "id": item.user.id if item.user else None,
                    "fullName": item.user.full_name if item.user else deleted_user_name,
                },
            }
            for item in leaderboard
        ],
    }


@api_router.post("/games/{game_slug}/score")
def api_submit_score(
    game_slug: str,
    payload: ScorePayload,
    request: Request,
    db: Session = Depends(get_db),
):
    game = db.scalar(
        select(Game)
        .options(selectinload(Game.setting))
        .where(Game.slug == game_slug, Game.is_active.is_(True))
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="game_not_found")

    current_user = get_optional_user(request, db)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="auth_required")

    game_score = GameScore(game_slug=game_slug, score=max(0, payload.score), user_id=current_user.id)
    db.add(game_score)
    config = _safe_json_loads(game.setting.config_json if game.setting else None, {})
    if not isinstance(config, dict):
        config = {}
    xp_reward = int(config.get("xpReward") or config.get("xp_reward") or 75)
    xp_awarded = _award_user_xp(db, current_user, xp_reward if payload.score > 0 else 0, "game_played")
    db.commit()
    db.refresh(current_user)
    return {"ok": True, "xpReward": xp_reward, "xpAwarded": xp_awarded, "user": _serialize_user(current_user)}


@oauth_router.get("/login")
def legacy_login_page():
    return RedirectResponse(url="/login", status_code=307)


@oauth_router.get("/register")
def legacy_register_page():
    return RedirectResponse(url="/register", status_code=307)


@oauth_router.get("/logout")
def legacy_logout(request: Request):
    request.session.pop("user_id", None)
    return RedirectResponse(url="/", status_code=303)


@oauth_router.get("/google/login")
async def google_login(request: Request):
    oauth = request.app.state.oauth
    if not hasattr(oauth, "google"):
        return RedirectResponse(url="/login?google_error=google_disabled", status_code=303)
    redirect_uri = _google_redirect_uri(request)
    return await oauth.google.authorize_redirect(request, redirect_uri)


@oauth_router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    oauth = request.app.state.oauth
    if not hasattr(oauth, "google"):
        return RedirectResponse(url="/login?google_error=google_disabled", status_code=303)

    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or await oauth.google.parse_id_token(request, token)
    except Exception:
        return RedirectResponse(url="/login?google_error=google_userinfo", status_code=303)

    if not user_info:
        return RedirectResponse(url="/login?google_error=google_userinfo", status_code=303)

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    full_name = user_info.get("name") or user_info.get("given_name") or "Google User"
    if not email or not google_sub:
        return RedirectResponse(url="/login?google_error=google_data", status_code=303)

    user = get_by_google_sub(db, google_sub)
    if not user:
        user = get_by_email(db, email.lower())
        if user:
            user.google_sub = google_sub
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user = create_google_user(db, email=email, full_name=full_name, google_sub=google_sub)

    request.session["user_id"] = user.id
    target = "/"
    if user.preferred_language in settings.supported_languages_list:
        target += f"?lang={quote_plus(user.preferred_language)}"
    return RedirectResponse(url=target, status_code=303)
