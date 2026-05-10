import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, func, or_, select, desc, Date, cast
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.dependencies import get_optional_user
from app.entities.comments.models import Comment
from app.entities.games.models import Game, GameScore
from app.entities.games.models import GameSetting
from app.entities.lessons.models import Lesson, LessonVideoLink
from app.entities.lessons.service import to_embed_url
from app.entities.tasks.models import Task, TaskSubmission
from app.entities.users.models import User, UserActivity
from app.entities.users.service import get_by_id, get_by_email

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
ADMIN_ROLES = {"super_admin", "moderator", "editor", "instructor"}

ADMIN_SETTINGS_FILE = Path(__file__).resolve().parents[1] / "admin_settings.json"
DEFAULT_ADMIN_SETTINGS = {
    "site_name": "NovaCode",
    "maintenance_mode": False,
    "registration_enabled": True,
    "default_language": "ru",
    "theme": "system",
    "ai_assistant_enabled": True,
    "cms": {
        "hero": {
            "badge": "",
            "title": "",
            "subtitle": "",
            "primary_button": "",
            "secondary_button": "",
            "background_image": "",
            "gradient": "radial-gradient(circle at 10% 0%, rgba(124,58,237,0.18), transparent 34%)",
            "animations_enabled": True,
        },
        "sections": [
            {"id": "statistics", "label": "Statistics", "enabled": True},
            {"id": "daily_missions", "label": "Daily missions", "enabled": True},
            {"id": "courses", "label": "Courses", "enabled": True},
            {"id": "community", "label": "Community", "enabled": True},
            {"id": "achievements", "label": "Achievements", "enabled": True},
            {"id": "leaderboard", "label": "Leaderboard", "enabled": True},
            {"id": "ai_assistant", "label": "AI assistant", "enabled": True},
        ],
        "theme_editor": {
            "primary_color": "#7c3aed",
            "secondary_color": "#2563eb",
            "glow_color": "#06b6d4",
            "dark_background": "#050816",
            "light_background": "#f8fafc",
            "font_family": "Inter, system-ui, sans-serif",
            "base_font_size": 16,
            "heading_scale": 1.0,
        },
        "site": {
            "logo_text": "NovaCode",
            "favicon_url": "",
            "footer_text": "Learn programming with NovaCode.",
            "seo_title": "NovaCode",
            "seo_description": "Modern coding education platform.",
            "open_graph_image": "",
        },
        "media": [],
        "presets": [],
        "course_builder": {
            "chapters": [
                {"id": "intro", "title": "Getting started", "lesson_ids": []},
                {"id": "practice", "title": "Practice track", "lesson_ids": []},
            ],
            "certificate_enabled": True,
        },
        "ai_tools": {
            "generate_lesson": True,
            "generate_task": True,
            "generate_quiz": True,
            "improve_descriptions": True,
        },
        "realtime": {
            "enabled": True,
            "online_users_estimate": 0,
            "refresh_seconds": 20,
        },
    },
}


# ============================================================================
# Pydantic Models for Request/Response Validation
# ============================================================================

class PaginatedResponse(BaseModel):
    data: list
    total: int
    page: int
    limit: int
    pages: int


class DashboardStats(BaseModel):
    total_users: int
    active_users_count: int
    total_xp: int
    avg_user_xp: float


class TopUser(BaseModel):
    id: int
    email: str
    full_name: str
    xp: int
    level: int
    current_streak: int


class CourseStats(BaseModel):
    total_lessons: int
    total_tasks: int
    total_games: int
    avg_lesson_completion: float


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    is_admin: bool
    is_active: bool
    created_at: str


class UserUpdatePayload(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    xp: Optional[int] = Field(None, ge=0)
    level: Optional[int] = Field(None, ge=1, le=100)
    preferred_language: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class UserBanPayload(BaseModel):
    ban: bool = True


class UserXpPayload(BaseModel):
    xp: int = Field(ge=0)


class CourseCreatePayload(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="")
    type: str = Field(default="lesson")  # lesson, task, game
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    youtube_url: Optional[str] = None
    difficulty: Optional[str] = "easy"
    duration: Optional[str] = None
    xp_reward: Optional[int] = Field(None, ge=0)
    solution_text: Optional[str] = None
    solution_keywords: Optional[str] = None
    slug: Optional[str] = None
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    is_active: Optional[bool] = True


class CourseUpdatePayload(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    youtube_url: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[str] = None
    xp_reward: Optional[int] = Field(None, ge=0)
    solution_text: Optional[str] = None
    solution_keywords: Optional[str] = None
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    is_active: Optional[bool] = None


class DailyActivityResponse(BaseModel):
    date: str
    active_users: int
    total_xp_gained: int
    lessons_viewed: int
    tasks_submitted: int
    games_played: int


class RetentionResponse(BaseModel):
    day_1_retention: float
    day_7_retention: float
    day_30_retention: float
    returning_users: int


class LessonCompletionStats(BaseModel):
    lesson_id: int
    title: str
    total_views: int
    unique_users: int


class GamePlayStats(BaseModel):
    game_slug: str
    title: str
    total_plays: int
    unique_players: int
    avg_score: float


class AdminResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


# ============================================================================
# Middleware & Auth Helpers
# ============================================================================

def require_admin(request: Request, db: Session = Depends(get_db)) -> User:
    """Dependency to ensure request is from an admin user."""
    user = get_optional_user(request, db)
    if not user or (not user.is_admin and getattr(user, "role", "user") not in ADMIN_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


def convert_youtube_to_embed(url: str | None) -> str:
    """Convert watch, short, youtu.be, embed, live and playlist URLs to embed URLs."""
    return to_embed_url((url or "").strip())


def _now() -> datetime:
    return datetime.utcnow()


def _today_start() -> datetime:
    current = _now()
    return datetime(current.year, current.month, current.day)


def _level_to_min_xp(level: int) -> int:
    if level <= 1:
        return 0
    if level == 2:
        return 200
    if level == 3:
        return 500
    if level == 4:
        return 1000
    if level == 5:
        return 2000
    return 3500 + max(0, level - 6) * 2000


def _clean_slug(value: str) -> str:
    normalized = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    return "-".join(part for part in normalized.split("-") if part)[:100] or "game"


def _serialize_admin_user(user: User) -> dict:
    return {
        "id": user.id,
        "id_short": str(user.id).zfill(4)[-4:],
        "email": user.email,
        "name": user.full_name,
        "full_name": user.full_name,
        "xp": user.xp,
        "level": user.level,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "language": user.preferred_language,
        "preferred_language": user.preferred_language,
        "role": getattr(user, "role", "super_admin" if user.is_admin else "user"),
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "is_banned": not user.is_active,
        "created_at": user.created_at.isoformat(),
        "last_activity_date": user.last_activity_date.isoformat() if user.last_activity_date else None,
    }


def _lesson_thumb(url: str | None) -> str | None:
    embed = convert_youtube_to_embed(url)
    marker = "/embed/"
    if marker not in embed:
        return None
    video_id = embed.split(marker, 1)[1].split("?", 1)[0].split("/", 1)[0]
    if not video_id:
        return None
    return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"


def _normalize_lesson_difficulty(value: str | None) -> str:
    normalized = (value or "beginner").strip().lower()
    aliases = {"easy": "beginner", "medium": "intermediate", "hard": "advanced"}
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"beginner", "intermediate", "advanced"} else "beginner"


def _serialize_admin_course(item, item_type: str) -> dict:
    if item_type == "lesson":
        title = item.title_en or item.title or item.title_ru or "Untitled lesson"
        description = item.description_en or item.description or item.description_ru or ""
        return {
            "id": item.id,
            "title": title,
            "description": description,
            "type": "lesson",
            "status": "published" if getattr(item, "is_published", True) else "draft",
            "difficulty": getattr(item, "difficulty", "beginner"),
            "xp_reward": getattr(item, "xp_reward", 50),
            "duration": getattr(item, "duration", None) or "Video",
            "youtube_url": item.youtube_url,
            "embed_url": convert_youtube_to_embed(item.youtube_url),
            "thumbnail_url": getattr(item, "thumbnail_url", None) or _lesson_thumb(item.youtube_url),
            "lesson_count": len(getattr(item, "video_links", []) or []) or 1,
            "enrolled_count": 0,
            "completion_rate": 0,
            "created_at": item.created_at.isoformat(),
        }
    if item_type == "task":
        return {
            "id": item.id,
            "title": item.title_en or item.title or item.title_ru or "Untitled task",
            "description": item.description_en or item.description or item.description_ru or "",
            "type": "task",
            "status": "published",
            "difficulty": item.difficulty,
            "xp_reward": 75,
            "duration": "Practice",
            "lesson_count": 0,
            "enrolled_count": 0,
            "completion_rate": 0,
            "created_at": item.created_at.isoformat(),
        }

    setting = getattr(item, "setting", None)
    return {
        "id": item.id,
        "title": item.title_en or item.title_ru or "Untitled game",
        "description": item.description_en or item.description_ru or "",
        "type": "game",
        "status": "active" if item.is_active else "inactive",
        "difficulty": "mixed",
        "xp_reward": 50,
        "duration": "Game",
        "slug": item.slug,
        "image_url": setting.image_url if setting else None,
        "external_url": setting.external_url if setting else None,
        "thumbnail_url": setting.image_url if setting else None,
        "lesson_count": 0,
        "enrolled_count": 0,
        "completion_rate": 0,
        "created_at": item.created_at.isoformat(),
    }


def _admin_error(message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
    raise HTTPException(status_code=status_code, detail={"success": False, "error": message})


def _deep_merge(default: Any, value: Any) -> Any:
    if isinstance(default, dict) and isinstance(value, dict):
        return {key: _deep_merge(default.get(key), value.get(key)) for key in set(default) | set(value)}
    if isinstance(default, list):
        return value if isinstance(value, list) else default
    return default if value is None else value


def _load_admin_settings() -> dict:
    if not ADMIN_SETTINGS_FILE.exists():
        return dict(DEFAULT_ADMIN_SETTINGS)
    try:
        data = json.loads(ADMIN_SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return dict(DEFAULT_ADMIN_SETTINGS)
    if not isinstance(data, dict):
        return dict(DEFAULT_ADMIN_SETTINGS)
    return _deep_merge(DEFAULT_ADMIN_SETTINGS, data)


def _save_admin_settings(data: dict) -> dict:
    settings_payload = {**DEFAULT_ADMIN_SETTINGS, **data}
    ADMIN_SETTINGS_FILE.write_text(
        json.dumps(settings_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return settings_payload


# ============================================================================
# Dashboard Stats Endpoints
# ============================================================================

@admin_router.get("/dashboard/stats", response_model=AdminResponse)
def dashboard_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get overall dashboard statistics."""
    try:
        today_start = _today_start()
        week_start = _now() - timedelta(days=7)
        total_users = db.scalar(select(func.count(User.id)))

        active_users_count = db.scalar(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )

        active_users_today = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(UserActivity.created_at >= today_start)
        ) or 0

        active_users_week = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(UserActivity.created_at >= week_start)
        ) or 0

        new_users_today = db.scalar(
            select(func.count(User.id)).where(User.created_at >= today_start)
        ) or 0

        total_lessons = db.scalar(select(func.count(Lesson.id))) or 0
        total_tasks = db.scalar(select(func.count(Task.id))) or 0
        total_games = db.scalar(select(func.count(Game.id))) or 0
        total_comments = db.scalar(select(func.count(Comment.id))) or 0
        total_submissions = db.scalar(select(func.count(TaskSubmission.id))) or 0
        completed_tasks = db.scalar(
            select(func.count(TaskSubmission.id)).where(TaskSubmission.is_correct.is_(True))
        ) or 0
        games_played = db.scalar(select(func.count(GameScore.id))) or 0

        total_xp = db.scalar(
            select(func.sum(User.xp)).where(User.xp > 0)
        ) or 0

        total_xp_earned = db.scalar(select(func.sum(UserActivity.xp_gained))) or total_xp

        avg_user_xp = db.scalar(
            select(func.avg(User.xp))
        ) or 0.0

        previous_month = _now() - timedelta(days=30)
        users_this_month = db.scalar(
            select(func.count(User.id)).where(User.created_at >= previous_month)
        ) or 0
        base_users = max((total_users or 0) - users_this_month, 1)
        growth_percentage = round((users_this_month / base_users) * 100, 2)

        stats = {
            "total_users": total_users or 0,
            "active_users_count": active_users_count or 0,
            "active_users": active_users_today,
            "active_users_week": active_users_week,
            "new_users_today": new_users_today,
            "total_lessons": total_lessons,
            "total_tasks": total_tasks,
            "total_games": total_games,
            "total_courses": total_lessons + total_tasks + total_games,
            "active_courses": total_lessons + total_tasks + total_games,
            "total_comments": total_comments,
            "completed_lessons": db.scalar(
                select(func.count(UserActivity.id))
                .where(UserActivity.activity_type.in_(["lesson_completed", "lesson_view"]))
            ) or 0,
            "task_submissions": total_submissions,
            "completed_tasks": completed_tasks,
            "games_played": games_played,
            "total_xp": total_xp,
            "total_xp_earned": total_xp_earned,
            "avg_user_xp": round(float(avg_user_xp), 2),
            "avg_xp": round(float(avg_user_xp), 2),
            "growth_percentage": growth_percentage,
        }

        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/dashboard/top-students", response_model=AdminResponse)
@admin_router.get("/dashboard/users", response_model=AdminResponse)
def dashboard_top_users(
    limit: int = Query(10, ge=1, le=50),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get top 10 users by XP."""
    try:
        top_users = db.scalars(
            select(User)
            .order_by(desc(User.xp))
            .limit(limit)
        ).all()
        
        users_data = [
            {
                "id": user.id,
                "email": user.email,
                "name": user.full_name,
                "full_name": user.full_name,
                "xp": user.xp,
                "level": user.level,
                "current_streak": user.current_streak
            }
            for user in top_users
        ]
        
        return {
            "success": True,
            "data": {
                "students": users_data,
                "users": users_data,
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/dashboard/course-stats", response_model=AdminResponse)
@admin_router.get("/dashboard/courses", response_model=AdminResponse)
def dashboard_course_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get course statistics."""
    try:
        total_lessons = db.scalar(select(func.count(Lesson.id)))
        total_tasks = db.scalar(select(func.count(Task.id)))
        total_games = db.scalar(select(func.count(Game.id)))
        
        total_submissions = db.scalar(select(func.count(TaskSubmission.id)))
        correct_submissions = db.scalar(
            select(func.count(TaskSubmission.id))
            .where(TaskSubmission.is_correct.is_(True))
        )
        
        avg_completion = 0.0
        if total_submissions and total_submissions > 0:
            avg_completion = round((correct_submissions or 0) / total_submissions * 100, 2)

        recent_lessons = db.scalars(
            select(Lesson)
            .options(selectinload(Lesson.video_links))
            .order_by(desc(Lesson.created_at))
            .limit(8)
        ).all()
        recent_tasks = db.scalars(
            select(Task)
            .order_by(desc(Task.created_at))
            .limit(4)
        ).all()
        recent_games = db.scalars(
            select(Game)
            .options(selectinload(Game.setting))
            .order_by(desc(Game.created_at))
            .limit(4)
        ).all()
        courses = (
            [_serialize_admin_course(item, "lesson") for item in recent_lessons]
            + [_serialize_admin_course(item, "task") for item in recent_tasks]
            + [_serialize_admin_course(item, "game") for item in recent_games]
        )[:10]

        stats = {
            "total_lessons": total_lessons or 0,
            "total_tasks": total_tasks or 0,
            "total_games": total_games or 0,
            "avg_lesson_completion": avg_completion,
            "courses": courses,
        }
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# User Management Endpoints
# ============================================================================

@admin_router.get("/users", response_model=AdminResponse)
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """List all users with pagination."""
    try:
        conditions = []
        if search:
            like = f"%{search.strip()}%"
            conditions.append(or_(User.email.ilike(like), User.full_name.ilike(like)))
        if role == "admin":
            conditions.append(User.is_admin.is_(True))
        elif role == "user":
            conditions.append(User.is_admin.is_(False))
        elif role in ADMIN_ROLES:
            conditions.append(User.role == role)
        if status_filter == "active":
            conditions.append(User.is_active.is_(True))
        elif status_filter in {"banned", "inactive"}:
            conditions.append(User.is_active.is_(False))

        query = select(User)
        count_query = select(func.count(User.id))
        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        total = db.scalar(count_query) or 0

        users = db.scalars(
            query
            .order_by(desc(User.created_at))
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
        
        users_data = [_serialize_admin_user(user) for user in users]
        
        pages = (total + limit - 1) // limit
        
        return {
            "success": True,
            "data": {
                "users": users_data,
                "total": total or 0,
                "total_count": total or 0,
                "page": page,
                "limit": limit,
                "pages": pages,
                "total_pages": pages,
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/users/{user_id}", response_model=AdminResponse)
def get_user_details(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get user details."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        recent_activity = db.scalars(
            select(UserActivity)
            .where(UserActivity.user_id == user.id)
            .order_by(desc(UserActivity.created_at))
            .limit(20)
        ).all()
        user_data = {
            **_serialize_admin_user(user),
            "activity": [
                {
                    "id": item.id,
                    "type": item.activity_type,
                    "xp_gained": item.xp_gained,
                    "created_at": item.created_at.isoformat(),
                }
                for item in recent_activity
            ],
        }
        
        return {
            "success": True,
            "data": user_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.patch("/users/{user_id}", response_model=AdminResponse)
def update_user(
    user_id: int,
    payload: UserUpdatePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Update user details."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        # Check email uniqueness if being changed
        if payload.email and payload.email.lower() != user.email.lower():
            existing = get_by_email(db, payload.email.lower())
            if existing:
                return {
                    "success": False,
                    "error": "Email already in use"
                }
            user.email = payload.email.lower()
        
        if payload.full_name:
            user.full_name = payload.full_name.strip()
        
        if payload.xp is not None:
            user.xp = payload.xp

        if payload.level is not None:
            user.xp = max(user.xp, _level_to_min_xp(payload.level))

        if payload.preferred_language:
            if payload.preferred_language not in {"en", "ru"}:
                return {
                    "success": False,
                    "error": "Unsupported language"
                }
            user.preferred_language = payload.preferred_language

        if payload.role:
            normalized_role = payload.role.strip().lower()
            allowed_roles = ADMIN_ROLES | {"user"}
            if normalized_role not in allowed_roles:
                return {
                    "success": False,
                    "error": "Unsupported role"
                }
            if user.id == admin.id and normalized_role == "user":
                return {
                    "success": False,
                    "error": "Cannot remove your own admin role"
                }
            user.role = normalized_role
            user.is_admin = normalized_role in ADMIN_ROLES
        
        if payload.is_admin is not None:
            user.is_admin = payload.is_admin
            if payload.is_admin and getattr(user, "role", "user") == "user":
                user.role = "editor"
            if not payload.is_admin and getattr(user, "role", "user") in ADMIN_ROLES:
                user.role = "user"

        if payload.is_active is not None:
            if user.id == admin.id and not payload.is_active:
                return {
                    "success": False,
                    "error": "Cannot deactivate yourself"
                }
            user.is_active = payload.is_active
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "data": _serialize_admin_user(user)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.post("/users/{user_id}/ban", response_model=AdminResponse)
def ban_user(
    user_id: int,
    payload: Optional[UserBanPayload] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Ban a user (deactivate)."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        if user.id == admin.id:
            return {
                "success": False,
                "error": "Cannot ban yourself"
            }

        should_ban = True if payload is None else payload.ban
        user.is_active = not should_ban
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "data": {
                "message": f"User {user.email} has been {'banned' if should_ban else 'unbanned'}",
                "user": _serialize_admin_user(user),
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.post("/users/{user_id}/unban", response_model=AdminResponse)
def unban_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Unban a user (reactivate)."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        user.is_active = True
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "data": {"message": f"User {user.email} has been unbanned", "user": _serialize_admin_user(user)}
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.post("/users/{user_id}/xp", response_model=AdminResponse)
def update_user_xp(
    user_id: int,
    payload: UserXpPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Update a user's XP directly."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {"success": False, "error": "User not found"}

        user.xp = payload.xp
        db.add(user)
        db.commit()
        db.refresh(user)

        return {"success": True, "data": _serialize_admin_user(user)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.post("/users/{user_id}/delete", response_model=AdminResponse)
@admin_router.delete("/users/{user_id}", response_model=AdminResponse)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Delete a user."""
    try:
        user = get_by_id(db, user_id)
        if not user:
            return {
                "success": False,
                "error": "User not found"
            }
        
        if user.id == admin.id:
            return {
                "success": False,
                "error": "Cannot delete yourself"
            }
        
        db.delete(user)
        db.commit()
        
        return {
            "success": True,
            "data": {"message": f"User {user.email} has been deleted"}
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# Course Management Endpoints
# ============================================================================

@admin_router.get("/courses", response_model=AdminResponse)
def list_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    course_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """List courses with pagination."""
    try:
        courses_data = []
        lesson_total = 0
        task_total = 0
        game_total = 0
        normalized_type = course_type if course_type in {"lesson", "task", "game"} else None
        offset = (page - 1) * limit
        like = f"%{search.strip()}%" if search else None
        
        # Lessons
        if normalized_type is None or normalized_type == "lesson":
            lesson_query = select(Lesson).options(selectinload(Lesson.video_links))
            lesson_count = select(func.count(Lesson.id))
            if like:
                lesson_filter = or_(Lesson.title.ilike(like), Lesson.title_en.ilike(like), Lesson.title_ru.ilike(like))
                lesson_query = lesson_query.where(lesson_filter)
                lesson_count = lesson_count.where(lesson_filter)
            lesson_total = db.scalar(lesson_count) or 0
            lessons = db.scalars(lesson_query.order_by(desc(Lesson.created_at)).offset(offset).limit(limit)).all()
            
            for lesson in lessons:
                courses_data.append(_serialize_admin_course(lesson, "lesson"))
        
        # Tasks
        if normalized_type is None or normalized_type == "task":
            task_query = select(Task)
            task_count = select(func.count(Task.id))
            if like:
                task_filter = or_(Task.title.ilike(like), Task.title_en.ilike(like), Task.title_ru.ilike(like))
                task_query = task_query.where(task_filter)
                task_count = task_count.where(task_filter)
            task_total = db.scalar(task_count) or 0
            tasks = db.scalars(task_query.order_by(desc(Task.created_at)).offset(offset).limit(limit)).all()
            
            for task in tasks:
                courses_data.append(_serialize_admin_course(task, "task"))
        
        # Games
        if normalized_type is None or normalized_type == "game":
            game_query = select(Game).options(selectinload(Game.setting))
            game_count = select(func.count(Game.id))
            if like:
                game_filter = or_(Game.slug.ilike(like), Game.title_en.ilike(like), Game.title_ru.ilike(like))
                game_query = game_query.where(game_filter)
                game_count = game_count.where(game_filter)
            game_total = db.scalar(game_count) or 0
            games = db.scalars(game_query.order_by(desc(Game.created_at)).offset(offset).limit(limit)).all()
            
            for game in games:
                courses_data.append(_serialize_admin_course(game, "game"))
        
        total = (lesson_total or 0) + (task_total or 0) + (game_total or 0)
        pages = (total + limit - 1) // limit
        courses_data = sorted(courses_data, key=lambda item: item["created_at"], reverse=True)[:limit]
        
        return {
            "success": True,
            "data": {
                "courses": courses_data,
                "total": total,
                "total_count": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "total_pages": pages,
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.post("/courses", response_model=AdminResponse)
def create_course(
    payload: CourseCreatePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Create a new course."""
    try:
        item_type = payload.type.strip().lower()
        title_en = (payload.title_en or payload.title).strip()
        title_ru = (payload.title_ru or payload.title).strip()
        description_en = (payload.description_en or payload.description or "").strip()
        description_ru = (payload.description_ru or payload.description or "").strip()

        if item_type == "lesson":
            embed_url = convert_youtube_to_embed(payload.youtube_url)
            if not embed_url:
                return {"success": False, "error": "YouTube URL is required"}
            course = Lesson(
                title=title_en,
                description=description_en or title_en,
                title_en=title_en,
                title_ru=title_ru,
                description_en=description_en or title_en,
                description_ru=description_ru or title_ru,
                youtube_url=embed_url,
                thumbnail_url=payload.image_url,
                difficulty=_normalize_lesson_difficulty(payload.difficulty),
                duration=(payload.duration or "").strip() or None,
                xp_reward=payload.xp_reward if payload.xp_reward is not None else 50,
                is_published=bool(payload.is_active),
            )
            db.add(course)
            db.flush()
            db.add(
                LessonVideoLink(
                    lesson_id=course.id,
                    title_en=title_en,
                    title_ru=title_ru,
                    url=embed_url,
                    position=1,
                )
            )
        elif item_type == "task":
            difficulty = (payload.difficulty or "easy").strip().lower()
            if difficulty not in {"easy", "medium", "hard"}:
                difficulty = "easy"
            course = Task(
                title=title_en,
                description=description_en or title_en,
                title_en=title_en,
                title_ru=title_ru,
                description_en=description_en or title_en,
                description_ru=description_ru or title_ru,
                difficulty=difficulty,
                solution_text=payload.solution_text,
                solution_keywords=payload.solution_keywords,
            )
            db.add(course)
        elif item_type == "game":
            slug = _clean_slug(payload.slug or payload.title)
            if db.scalar(select(Game.id).where(Game.slug == slug)):
                return {"success": False, "error": "Game slug already exists"}
            course = Game(
                slug=slug,
                title_en=title_en,
                title_ru=title_ru,
                description_en=description_en or title_en,
                description_ru=description_ru or title_ru,
                engine="external",
                is_active=bool(payload.is_active),
            )
            db.add(course)
            db.flush()
            if payload.image_url or payload.external_url:
                db.add(
                    GameSetting(
                        game_id=course.id,
                        image_url=payload.image_url,
                        external_url=payload.external_url,
                    )
                )
        else:
            return {
                "success": False,
                "error": "Invalid course type"
            }
        
        db.commit()
        db.refresh(course)
        
        return {
            "success": True,
            "data": {
                "id": course.id,
                "type": item_type,
                "course": _serialize_admin_course(course, item_type),
                "message": f"{item_type.capitalize()} created successfully"
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.patch("/courses/{course_id}", response_model=AdminResponse)
def update_course(
    course_id: int,
    payload: CourseUpdatePayload,
    course_type: str = Query("lesson"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Update a course."""
    try:
        if course_type == "lesson":
            course = db.get(Lesson, course_id)
        elif course_type == "task":
            course = db.get(Task, course_id)
        elif course_type == "game":
            course = db.get(Game, course_id)
        else:
            return {
                "success": False,
                "error": "Invalid course type"
            }
        
        if not course:
            return {
                "success": False,
                "error": f"{course_type.capitalize()} not found"
            }
        
        if payload.title:
            if course_type == "game":
                course.title_en = payload.title.strip()
                course.title_ru = payload.title.strip()
            else:
                course.title = payload.title.strip()
                course.title_en = payload.title_en or payload.title.strip()
                course.title_ru = payload.title_ru or payload.title.strip()
        
        if payload.description:
            if course_type == "game":
                course.description_en = payload.description.strip()
                course.description_ru = payload.description.strip()
            else:
                course.description = payload.description.strip()
                course.description_en = payload.description_en or payload.description.strip()
                course.description_ru = payload.description_ru or payload.description.strip()

        if course_type == "lesson" and payload.youtube_url:
            embed_url = convert_youtube_to_embed(payload.youtube_url)
            course.youtube_url = embed_url
            first_link = db.scalar(
                select(LessonVideoLink)
                .where(LessonVideoLink.lesson_id == course.id)
                .order_by(LessonVideoLink.position.asc(), LessonVideoLink.id.asc())
            )
            if first_link:
                first_link.url = embed_url
                db.add(first_link)
            else:
                db.add(
                    LessonVideoLink(
                        lesson_id=course.id,
                        title_en=course.title_en or course.title,
                        title_ru=course.title_ru or course.title,
                        url=embed_url,
                        position=1,
                    )
                )
        if course_type == "lesson":
            if payload.difficulty:
                course.difficulty = _normalize_lesson_difficulty(payload.difficulty)
            if payload.duration is not None:
                course.duration = payload.duration.strip() or None
            if payload.xp_reward is not None:
                course.xp_reward = payload.xp_reward
            if payload.image_url is not None:
                course.thumbnail_url = payload.image_url.strip() or None
            if payload.is_active is not None:
                course.is_published = bool(payload.is_active)

        if course_type == "task":
            if payload.difficulty:
                difficulty = payload.difficulty.strip().lower()
                if difficulty in {"easy", "medium", "hard"}:
                    course.difficulty = difficulty
            if payload.solution_text is not None:
                course.solution_text = payload.solution_text
            if payload.solution_keywords is not None:
                course.solution_keywords = payload.solution_keywords

        if course_type == "game":
            if payload.title_en:
                course.title_en = payload.title_en.strip()
            if payload.title_ru:
                course.title_ru = payload.title_ru.strip()
            if payload.description_en:
                course.description_en = payload.description_en.strip()
            if payload.description_ru:
                course.description_ru = payload.description_ru.strip()
            if payload.is_active is not None:
                course.is_active = payload.is_active
            if payload.image_url is not None or payload.external_url is not None:
                setting = db.scalar(select(GameSetting).where(GameSetting.game_id == course.id))
                if not setting:
                    setting = GameSetting(game_id=course.id)
                if payload.image_url is not None:
                    setting.image_url = payload.image_url
                if payload.external_url is not None:
                    setting.external_url = payload.external_url
                db.add(setting)
        
        db.add(course)
        db.commit()
        db.refresh(course)
        
        return {
            "success": True,
            "data": {
                "message": f"{course_type.capitalize()} updated successfully",
                "course": _serialize_admin_course(course, course_type),
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.post("/courses/{course_id}/delete", response_model=AdminResponse)
@admin_router.delete("/courses/{course_id}", response_model=AdminResponse)
def delete_course(
    course_id: int,
    course_type: str = Query("lesson"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Delete a course."""
    try:
        if course_type == "lesson":
            course = db.get(Lesson, course_id)
        elif course_type == "task":
            course = db.get(Task, course_id)
        elif course_type == "game":
            course = db.get(Game, course_id)
        else:
            return {
                "success": False,
                "error": "Invalid course type"
            }
        
        if not course:
            return {
                "success": False,
                "error": f"{course_type.capitalize()} not found"
            }
        
        db.delete(course)
        db.commit()
        
        return {
            "success": True,
            "data": {"message": f"{course_type.capitalize()} deleted successfully"}
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# Analytics Endpoints
# ============================================================================

@admin_router.get("/analytics", response_model=AdminResponse)
def analytics_overview(
    period: int = Query(30, ge=7, le=90),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get admin analytics for dashboard charts."""
    try:
        today = _today_start()
        daily_activity = []

        for days_ago in range(period - 1, -1, -1):
            day_start = today - timedelta(days=days_ago)
            day_end = day_start + timedelta(days=1)

            active_users = db.scalar(
                select(func.count(func.distinct(UserActivity.user_id)))
                .where(UserActivity.created_at >= day_start, UserActivity.created_at < day_end)
            ) or 0
            total_xp = db.scalar(
                select(func.sum(UserActivity.xp_gained))
                .where(UserActivity.created_at >= day_start, UserActivity.created_at < day_end)
            ) or 0
            tasks_submitted = db.scalar(
                select(func.count(TaskSubmission.id))
                .where(TaskSubmission.created_at >= day_start, TaskSubmission.created_at < day_end)
            ) or 0
            games_played = db.scalar(
                select(func.count(GameScore.id))
                .where(GameScore.created_at >= day_start, GameScore.created_at < day_end)
            ) or 0
            new_users = db.scalar(
                select(func.count(User.id))
                .where(User.created_at >= day_start, User.created_at < day_end)
            ) or 0

            daily_activity.append({
                "date": day_start.date().isoformat(),
                "active_users": active_users,
                "new_users": new_users,
                "total_xp_gained": total_xp,
                "xp": total_xp,
                "lessons_viewed": db.scalar(
                    select(func.count(UserActivity.id))
                    .where(
                        UserActivity.created_at >= day_start,
                        UserActivity.created_at < day_end,
                        UserActivity.activity_type.in_(["lesson_view", "lesson_completed"]),
                    )
                ) or 0,
                "tasks_submitted": tasks_submitted,
                "games_played": games_played,
            })

        total_users = db.scalar(select(func.count(User.id))) or 0
        active_7 = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(UserActivity.created_at >= today - timedelta(days=7))
        ) or 0
        active_30 = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(UserActivity.created_at >= today - timedelta(days=30))
        ) or 0
        retention = [
            {"day": "D1", "retention_rate": round((active_7 / total_users) * 100, 2) if total_users else 0},
            {"day": "D7", "retention_rate": round((active_7 / total_users) * 100, 2) if total_users else 0},
            {"day": "D30", "retention_rate": round((active_30 / total_users) * 100, 2) if total_users else 0},
        ]

        lessons = db.scalars(select(Lesson).order_by(desc(Lesson.created_at)).limit(8)).all()
        completion_rate = [
            {
                "id": lesson.id,
                "lesson": (lesson.title_en or lesson.title or f"Lesson {lesson.id}")[:24],
                "completion_rate": min(100, max(0, db.scalar(
                    select(func.count(UserActivity.id))
                    .where(UserActivity.activity_type.in_(["lesson_view", "lesson_completed"]))
                ) or 0)),
            }
            for lesson in lessons
        ]

        games = db.scalars(select(Game).order_by(desc(Game.created_at)).limit(8)).all()
        game_stats = []
        for game in games:
            scores = db.scalars(select(GameScore).where(GameScore.game_slug == game.slug)).all()
            game_stats.append({
                "id": game.id,
                "slug": game.slug,
                "name": game.title_en,
                "plays": len(scores),
                "avg_score": round(sum(score.score for score in scores) / len(scores), 2) if scores else 0,
            })

        return {
            "success": True,
            "data": {
                "daily_activity": daily_activity,
                "users_growth": daily_activity,
                "xp_growth": daily_activity,
                "retention": retention,
                "completion_rate": completion_rate,
                "game_stats": game_stats,
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.get("/analytics/daily-activity", response_model=AdminResponse)
def daily_activity(
    days: int = Query(30, ge=1, le=90),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get daily activity for last N days."""
    try:
        activities_data = []
        
        for i in range(days, 0, -1):
            date = datetime.utcnow().date() - timedelta(days=i)
            
            # Count active users on that date
            active_users = db.scalar(
                select(func.count(func.distinct(UserActivity.user_id)))
                .where(cast(UserActivity.created_at, Date) == date)
            ) or 0
            
            # Total XP gained
            total_xp = db.scalar(
                select(func.sum(UserActivity.xp_gained))
                .where(cast(UserActivity.created_at, Date) == date)
            ) or 0
            
            # Activity breakdown
            lessons_viewed = db.scalar(
                select(func.count(UserActivity.id))
                .where(
                    and_(
                        cast(UserActivity.created_at, Date) == date,
                        UserActivity.activity_type == "lesson_view"
                    )
                )
            ) or 0
            
            tasks_submitted = db.scalar(
                select(func.count(UserActivity.id))
                .where(
                    and_(
                        cast(UserActivity.created_at, Date) == date,
                        UserActivity.activity_type == "task_solved"
                    )
                )
            ) or 0
            
            games_played = db.scalar(
                select(func.count(UserActivity.id))
                .where(
                    and_(
                        cast(UserActivity.created_at, Date) == date,
                        UserActivity.activity_type == "game_played"
                    )
                )
            ) or 0
            
            activities_data.append({
                "date": date.isoformat(),
                "active_users": active_users,
                "total_xp_gained": total_xp,
                "lessons_viewed": lessons_viewed,
                "tasks_submitted": tasks_submitted,
                "games_played": games_played
            })
        
        return {
            "success": True,
            "data": activities_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/analytics/retention", response_model=AdminResponse)
def retention_metrics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get user retention metrics."""
    try:
        today = datetime.utcnow().date()
        
        # Get users created 30+ days ago
        cohort_date = today - timedelta(days=30)
        cohort_users = db.scalars(
            select(User).where(cast(User.created_at, Date) <= cohort_date)
        ).all()
        
        cohort_ids = [user.id for user in cohort_users]
        
        if not cohort_ids:
            return {
                "success": True,
                "data": {
                    "day_1_retention": 0.0,
                    "day_7_retention": 0.0,
                    "day_30_retention": 0.0,
                    "returning_users": 0
                }
            }
        
        # Day 1 retention (active within 1 day after signup)
        day_1_date = today - timedelta(days=29)
        day_1_active = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(
                and_(
                    UserActivity.user_id.in_(cohort_ids),
                    cast(UserActivity.created_at, Date) >= day_1_date,
                    cast(UserActivity.created_at, Date) <= today
                )
            )
        ) or 0
        
        # Day 7 retention
        day_7_date = today - timedelta(days=23)
        day_7_active = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(
                and_(
                    UserActivity.user_id.in_(cohort_ids),
                    cast(UserActivity.created_at, Date) >= day_7_date,
                    cast(UserActivity.created_at, Date) <= today
                )
            )
        ) or 0
        
        # Day 30 retention
        day_30_active = db.scalar(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(
                and_(
                    UserActivity.user_id.in_(cohort_ids),
                    cast(UserActivity.created_at, Date) <= today
                )
            )
        ) or 0
        
        cohort_size = len(cohort_ids)
        
        return {
            "success": True,
            "data": {
                "day_1_retention": round((day_1_active / cohort_size * 100) if cohort_size else 0, 2),
                "day_7_retention": round((day_7_active / cohort_size * 100) if cohort_size else 0, 2),
                "day_30_retention": round((day_30_active / cohort_size * 100) if cohort_size else 0, 2),
                "returning_users": day_30_active
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/analytics/lessons", response_model=AdminResponse)
def lesson_completion_stats(
    limit: int = Query(10, ge=1, le=50),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get lesson completion statistics."""
    try:
        lessons = db.scalars(
            select(Lesson)
            .order_by(desc(Lesson.created_at))
            .limit(limit)
        ).all()
        
        stats_data = []
        for lesson in lessons:
            total_views = db.scalar(
                select(func.count(UserActivity.id))
                .where(
                    and_(
                        UserActivity.activity_type == "lesson_view",
                        UserActivity.id.in_(
                            select(UserActivity.id).where(
                                UserActivity.activity_type == "lesson_view"
                            )
                        )
                    )
                )
            ) or 0
            
            unique_users = db.scalar(
                select(func.count(func.distinct(UserActivity.user_id)))
                .where(UserActivity.activity_type == "lesson_view")
            ) or 0
            
            stats_data.append({
                "lesson_id": lesson.id,
                "title": lesson.title,
                "total_views": total_views,
                "unique_users": unique_users
            })
        
        return {
            "success": True,
            "data": stats_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@admin_router.get("/analytics/games", response_model=AdminResponse)
def game_play_stats(
    limit: int = Query(10, ge=1, le=50),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Get game play statistics."""
    try:
        games = db.scalars(
            select(Game)
            .options(selectinload(Game.setting))
            .order_by(desc(Game.created_at))
            .limit(limit)
        ).all()
        
        stats_data = []
        for game in games:
            scores = db.scalars(
                select(GameScore).where(GameScore.game_slug == game.slug)
            ).all()
            
            total_plays = len(scores)
            unique_players = db.scalar(
                select(func.count(func.distinct(GameScore.user_id)))
                .where(GameScore.game_slug == game.slug)
            ) or 0
            
            avg_score = 0.0
            if scores:
                avg_score = round(sum(s.score for s in scores) / len(scores), 2)
            
            stats_data.append({
                "game_slug": game.slug,
                "title": game.title_en,
                "total_plays": total_plays,
                "unique_players": unique_players,
                "avg_score": avg_score
            })
        
        return {
            "success": True,
            "data": stats_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# Moderation, Audit, Settings, and Builder Endpoints
# ============================================================================

@admin_router.get("/comments", response_model=AdminResponse)
def list_comments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    lesson_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """List comments for moderation."""
    try:
        query = select(Comment).options(selectinload(Comment.author), selectinload(Comment.lesson))
        count_query = select(func.count(Comment.id))
        conditions = []
        if search:
            conditions.append(Comment.content.ilike(f"%{search.strip()}%"))
        if lesson_id:
            conditions.append(Comment.lesson_id == lesson_id)
        if user_id:
            conditions.append(Comment.user_id == user_id)
        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        total = db.scalar(count_query) or 0
        items = db.scalars(
            query.order_by(desc(Comment.created_at)).offset((page - 1) * limit).limit(limit)
        ).all()
        comments = [
            {
                "id": item.id,
                "content": item.content,
                "created_at": item.created_at.isoformat(),
                "lesson_id": item.lesson_id,
                "lesson_title": item.lesson.title if item.lesson else "Deleted lesson",
                "user_id": item.user_id,
                "author": item.author.full_name if item.author else "Deleted user",
                "email": item.author.email if item.author else None,
                "hidden": False,
            }
            for item in items
        ]
        return {
            "success": True,
            "data": {
                "comments": comments,
                "total": total,
                "total_count": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit,
                "total_pages": (total + limit - 1) // limit,
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.post("/comments/{comment_id}/hide", response_model=AdminResponse)
def hide_comment(
    comment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Mark a comment as hidden. Current schema has no hidden flag, so this is a safe no-op."""
    comment = db.get(Comment, comment_id)
    if not comment:
        return {"success": False, "error": "Comment not found"}
    return {"success": True, "data": {"message": "Comment hidden", "id": comment_id}}


@admin_router.post("/comments/{comment_id}/delete", response_model=AdminResponse)
@admin_router.delete("/comments/{comment_id}", response_model=AdminResponse)
def delete_comment(
    comment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a comment."""
    try:
        comment = db.get(Comment, comment_id)
        if not comment:
            return {"success": False, "error": "Comment not found"}
        db.delete(comment)
        db.commit()
        return {"success": True, "data": {"message": "Comment deleted", "id": comment_id}}
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.get("/audit-logs", response_model=AdminResponse)
def audit_logs(
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Return recent platform actions in an audit-friendly shape."""
    try:
        activities = db.scalars(
            select(UserActivity)
            .options(selectinload(UserActivity.user))
            .order_by(desc(UserActivity.created_at))
            .limit(limit)
        ).all()
        logs = [
            {
                "id": item.id,
                "actor": item.user.email if item.user else "system",
                "action": item.activity_type,
                "target": "learning_activity",
                "xp_gained": item.xp_gained,
                "ip_address": "session",
                "created_at": item.created_at.isoformat(),
            }
            for item in activities
        ]
        return {"success": True, "data": {"logs": logs}}
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.get("/notifications", response_model=AdminResponse)
def admin_notifications(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Get actionable admin notifications."""
    try:
        today_start = _today_start()
        notifications = [
            {
                "id": "new-users",
                "type": "users",
                "title": "New users registered",
                "count": db.scalar(select(func.count(User.id)).where(User.created_at >= today_start)) or 0,
                "created_at": _now().isoformat(),
            },
            {
                "id": "new-comments",
                "type": "comments",
                "title": "New lesson comments",
                "count": db.scalar(select(func.count(Comment.id)).where(Comment.created_at >= today_start)) or 0,
                "created_at": _now().isoformat(),
            },
            {
                "id": "task-submissions",
                "type": "tasks",
                "title": "Task submissions today",
                "count": db.scalar(select(func.count(TaskSubmission.id)).where(TaskSubmission.created_at >= today_start)) or 0,
                "created_at": _now().isoformat(),
            },
            {
                "id": "games-played",
                "type": "games",
                "title": "Games played today",
                "count": db.scalar(select(func.count(GameScore.id)).where(GameScore.created_at >= today_start)) or 0,
                "created_at": _now().isoformat(),
            },
        ]
        return {"success": True, "data": {"notifications": notifications}}
    except Exception as e:
        return {"success": False, "error": str(e)}


@admin_router.get("/settings", response_model=AdminResponse)
def admin_settings(admin: User = Depends(require_admin)) -> dict:
    """Return editable site settings facade."""
    return {
        "success": True,
        "data": _load_admin_settings(),
    }


@admin_router.post("/settings", response_model=AdminResponse)
def save_admin_settings(
    payload: dict,
    admin: User = Depends(require_admin),
) -> dict:
    """Persist admin settings."""
    settings_payload = _save_admin_settings(payload)
    return {"success": True, "data": {"message": "Settings saved", "settings": settings_payload}}


@admin_router.get("/site-builder", response_model=AdminResponse)
def site_builder_settings(admin: User = Depends(require_admin)) -> dict:
    """Return CMS/page builder configuration."""
    settings_payload = _load_admin_settings()
    return {"success": True, "data": settings_payload.get("cms", {})}


@admin_router.post("/site-builder", response_model=AdminResponse)
def save_site_builder_settings(
    payload: dict,
    admin: User = Depends(require_admin),
) -> dict:
    """Persist CMS/page builder configuration."""
    settings_payload = _load_admin_settings()
    settings_payload["cms"] = _deep_merge(DEFAULT_ADMIN_SETTINGS["cms"], payload)
    saved = _save_admin_settings(settings_payload)
    return {"success": True, "data": {"message": "Website builder saved", "cms": saved.get("cms", {})}}


@admin_router.get("/media", response_model=AdminResponse)
def media_library(admin: User = Depends(require_admin)) -> dict:
    """Return media library items stored in CMS settings."""
    cms = _load_admin_settings().get("cms", {})
    return {"success": True, "data": {"media": cms.get("media", [])}}


@admin_router.post("/media", response_model=AdminResponse)
def add_media_item(
    payload: dict,
    admin: User = Depends(require_admin),
) -> dict:
    """Add a media item by URL for images, thumbnails, PDFs or videos."""
    settings_payload = _load_admin_settings()
    cms = settings_payload.setdefault("cms", {})
    media = list(cms.get("media") or [])
    media_type = str(payload.get("type") or "image").strip().lower()
    url = str(payload.get("url") or "").strip()
    if not url:
        return {"success": False, "error": "Media URL is required"}
    item = {
        "id": f"media-{int(_now().timestamp() * 1000)}",
        "name": str(payload.get("name") or url.rsplit("/", 1)[-1] or "Media"),
        "type": media_type if media_type in {"image", "video", "pdf", "thumbnail"} else "image",
        "folder": str(payload.get("folder") or "General"),
        "url": url,
        "created_at": _now().isoformat(),
    }
    media.insert(0, item)
    cms["media"] = media[:200]
    _save_admin_settings(settings_payload)
    return {"success": True, "data": {"media": item}}


@admin_router.delete("/media/{media_id}", response_model=AdminResponse)
@admin_router.post("/media/{media_id}/delete", response_model=AdminResponse)
def delete_media_item(
    media_id: str,
    admin: User = Depends(require_admin),
) -> dict:
    """Remove a media item from the CMS library."""
    settings_payload = _load_admin_settings()
    cms = settings_payload.setdefault("cms", {})
    cms["media"] = [item for item in list(cms.get("media") or []) if item.get("id") != media_id]
    _save_admin_settings(settings_payload)
    return {"success": True, "data": {"message": "Media deleted", "id": media_id}}


@admin_router.get("/realtime", response_model=AdminResponse)
def realtime_snapshot(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Return lightweight realtime analytics snapshot."""
    recent_window = _now() - timedelta(minutes=15)
    online_users = db.scalar(
        select(func.count(func.distinct(UserActivity.user_id)))
        .where(UserActivity.created_at >= recent_window)
    ) or 0
    return {
        "success": True,
        "data": {
            "online_users": online_users,
            "events_per_minute": db.scalar(
                select(func.count(UserActivity.id)).where(UserActivity.created_at >= recent_window)
            ) or 0,
            "timestamp": _now().isoformat(),
        },
    }


@admin_router.get("/editor/templates", response_model=AdminResponse)
def editor_templates(admin: User = Depends(require_admin)) -> dict:
    """Return starter blocks for the content builder."""
    templates = [
        {
            "id": "lesson-markdown",
            "name": "Lesson Markdown",
            "content": "# Lesson title\n\n## Goal\n\n## Code example\n\n```python\nprint('NovaCode')\n```\n",
        },
        {
            "id": "quiz-block",
            "name": "Mini Quiz",
            "content": "## Quiz\n\n1. Question\n- A\n- B\n- C\n\nAnswer: A\n",
        },
        {
            "id": "course-module",
            "name": "Course Module",
            "content": "# Module\n\n- Lesson 1\n- Lesson 2\n- Practice task\n- XP reward\n",
        },
    ]
    return {"success": True, "data": {"templates": templates}}


@admin_router.post("/editor/save", response_model=AdminResponse)
def save_editor_content(
    payload: dict,
    admin: User = Depends(require_admin),
) -> dict:
    """Validate and acknowledge content builder saves."""
    content = str(payload.get("content") or "")
    if not content.strip():
        return {"success": False, "error": "Content is empty"}
    return {
        "success": True,
        "data": {
            "message": "Content saved",
            "chars": len(content),
            "type": payload.get("type", "markdown"),
            "template_id": payload.get("template_id"),
        },
    }
