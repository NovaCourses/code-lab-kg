from typing import Any

from datetime import datetime, timedelta

from fastapi import FastAPI
from sqlalchemy import desc, func, select
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from wtforms import SelectField
from wtforms.validators import DataRequired

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.entities.comments.models import Comment
from app.entities.games.models import Game, GameQuestion, GameScore, GameSetting
from app.entities.lessons.models import Lesson, LessonVideoLink
from app.entities.lessons.service import to_embed_url
from app.entities.tasks.models import Task, TaskSubmission
from app.entities.users.models import User, UserActivity
from app.entities.users.service import authenticate_user, get_by_id

SUPPORTED_ADMIN_LANGS = {"en", "ru"}
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


def _normalize_lang(lang: str | None) -> str:
    if lang in SUPPORTED_ADMIN_LANGS:
        return lang
    if settings.default_language in SUPPORTED_ADMIN_LANGS:
        return settings.default_language
    return "ru"


def _request_lang(request: Request | None) -> str:
    if request is not None:
        try:
            lang = request.session.get("language")
        except Exception:
            lang = None
        return _normalize_lang(lang)
    return _normalize_lang(None)


def _admin_text(request: Request | None, ru: str, en: str) -> str:
    return en if _request_lang(request) == "en" else ru


class AdminAuth(AuthenticationBackend):
    def __init__(self):
        super().__init__(secret_key=settings.secret_key)

    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username")
        password = form.get("password")
        if not email or not password:
            return False

        with SessionLocal() as db:
            user = authenticate_user(db, str(email), str(password))
            if not user or not user.is_admin:
                return False
            request.session["user_id"] = user.id
            return True

    async def logout(self, request: Request) -> bool:
        request.session.pop("user_id", None)
        return True

    async def authenticate(self, request: Request) -> bool:
        user_id = request.session.get("user_id")
        if not user_id:
            return False

        with SessionLocal() as db:
            user = get_by_id(db, int(user_id))
            return bool(user and user.is_admin)


class LocalizedAdminView(ModelView):
    locale_config: dict[str, dict[str, Any]] = {}

    def apply_locale(self, lang: str) -> None:
        config = self.locale_config.get(lang) or self.locale_config.get("ru") or {}

        name = config.get("name")
        if name:
            self.name = name

        name_plural = config.get("name_plural")
        if name_plural:
            self.name_plural = name_plural

        category = config.get("category")
        if category:
            self.category = category

        column_labels = config.get("column_labels")
        if column_labels:
            self.column_labels = column_labels


class UserAdmin(LocalizedAdminView, model=User):
    icon = "fa-solid fa-user"

    can_create = False
    can_export = True
    column_list = [User.id, User.email, User.full_name, User.preferred_language, User.role, User.is_admin, User.is_active, User.created_at]
    form_columns = [User.email, User.full_name, User.preferred_language, User.role, User.is_admin, User.is_active]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.full_name, User.created_at]

    locale_config = {
        "ru": {
            "name": "Пользователь",
            "name_plural": "Пользователи",
            "category": "Доступ и пользователи",
            "column_labels": {
                User.id: "ID",
                User.email: "Email",
                User.full_name: "Имя",
                User.preferred_language: "Язык",
                User.role: "Роль",
                User.is_admin: "Админ",
                User.is_active: "Активен",
                User.created_at: "Создан",
            },
        },
        "en": {
            "name": "User",
            "name_plural": "Users",
            "category": "Access and Users",
            "column_labels": {
                User.id: "ID",
                User.email: "Email",
                User.full_name: "Full name",
                User.preferred_language: "Language",
                User.role: "Role",
                User.is_admin: "Admin",
                User.is_active: "Active",
                User.created_at: "Created",
            },
        },
    }


class LessonAdmin(LocalizedAdminView, model=Lesson):
    icon = "fa-solid fa-video"

    can_export = True
    column_list = [
        Lesson.id,
        Lesson.title_ru,
        Lesson.title_en,
        Lesson.difficulty,
        Lesson.duration,
        Lesson.xp_reward,
        Lesson.is_published,
        Lesson.youtube_url,
        Lesson.created_at,
    ]
    form_columns = [
        Lesson.title_ru,
        Lesson.title_en,
        Lesson.description_ru,
        Lesson.description_en,
        Lesson.youtube_url,
        Lesson.thumbnail_url,
        Lesson.difficulty,
        Lesson.duration,
        Lesson.xp_reward,
        Lesson.is_published,
    ]
    column_searchable_list = [Lesson.title_ru, Lesson.title_en]
    column_sortable_list = [Lesson.id, Lesson.created_at]

    locale_config = {
        "ru": {
            "name": "Видеоурок",
            "name_plural": "Видеоуроки",
            "category": "Контент",
            "column_labels": {
                Lesson.id: "ID",
                Lesson.title_ru: "Название (RU)",
                Lesson.title_en: "Название (EN)",
                Lesson.description_ru: "Описание (RU)",
                Lesson.description_en: "Описание (EN)",
                Lesson.youtube_url: "Основной YouTube URL",
                Lesson.thumbnail_url: "Thumbnail URL",
                Lesson.difficulty: "Сложность",
                Lesson.duration: "Длительность",
                Lesson.xp_reward: "XP reward",
                Lesson.is_published: "Опубликован",
                Lesson.created_at: "Создан",
            },
        },
        "en": {
            "name": "Lesson",
            "name_plural": "Lessons",
            "category": "Content",
            "column_labels": {
                Lesson.id: "ID",
                Lesson.title_ru: "Title (RU)",
                Lesson.title_en: "Title (EN)",
                Lesson.description_ru: "Description (RU)",
                Lesson.description_en: "Description (EN)",
                Lesson.youtube_url: "Primary YouTube URL",
                Lesson.thumbnail_url: "Thumbnail URL",
                Lesson.difficulty: "Difficulty",
                Lesson.duration: "Duration",
                Lesson.xp_reward: "XP reward",
                Lesson.is_published: "Published",
                Lesson.created_at: "Created",
            },
        },
    }
    form_overrides = {
        "difficulty": SelectField,
    }

    form_args = {
        "title_ru": {"validators": [DataRequired(message="Required field.")]},
        "title_en": {"validators": [DataRequired(message="Required field.")]},
        "description_ru": {"validators": [DataRequired(message="Required field.")]},
        "description_en": {"validators": [DataRequired(message="Required field.")]},
        "youtube_url": {"validators": [DataRequired(message="Required field.")]},
        "difficulty": {
            "choices": [
                ("beginner", "Beginner"),
                ("intermediate", "Intermediate"),
                ("advanced", "Advanced"),
            ],
            "default": "beginner",
            "validators": [DataRequired(message="Required field.")],
        },
        "xp_reward": {"default": 50},
        "is_published": {"default": True},
    }
    form_widget_args = {
        "youtube_url": {"placeholder": "https://www.youtube.com/watch?v=VIDEO_ID"},
        "thumbnail_url": {"placeholder": "https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg"},
        "duration": {"placeholder": "12:30"},
        "xp_reward": {"placeholder": "50"},
    }

    async def on_model_change(self, data: dict, model: Lesson, is_created: bool, request: Request) -> None:
        title_en = (data.get("title_en") or "").strip()
        title_ru = (data.get("title_ru") or "").strip()
        description_en = (data.get("description_en") or "").strip()
        description_ru = (data.get("description_ru") or "").strip()
        youtube_url = (data.get("youtube_url") or "").strip()
        thumbnail_url = (data.get("thumbnail_url") or "").strip()
        difficulty = (data.get("difficulty") or "beginner").strip().lower()
        duration = (data.get("duration") or "").strip()

        if not title_en or not title_ru:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните название на русском и английском.",
                    "Fill in title in Russian and English.",
                )
            )
        if not description_en or not description_ru:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните описание на русском и английском.",
                    "Fill in description in Russian and English.",
                )
            )
        if not youtube_url:
            raise ValueError(
                _admin_text(
                    request,
                    "Укажите основную ссылку YouTube.",
                    "Specify the main YouTube URL.",
                )
            )

        if difficulty not in {"beginner", "intermediate", "advanced"}:
            difficulty = "beginner"

        try:
            xp_reward = int(data.get("xp_reward") or 50)
        except (TypeError, ValueError) as exc:
            raise ValueError(_admin_text(request, "XP reward должен быть числом.", "XP reward must be a number.")) from exc
        if xp_reward < 0:
            xp_reward = 0

        data["title"] = title_en
        data["description"] = description_en
        data["youtube_url"] = to_embed_url(youtube_url)
        data["thumbnail_url"] = thumbnail_url or None
        data["difficulty"] = difficulty
        data["duration"] = duration or None
        data["xp_reward"] = xp_reward
        data["is_published"] = bool(data.get("is_published"))


class LessonVideoLinkAdmin(LocalizedAdminView, model=LessonVideoLink):
    icon = "fa-solid fa-link"

    can_export = True
    column_list = [
        LessonVideoLink.id,
        LessonVideoLink.lesson,
        LessonVideoLink.position,
        LessonVideoLink.title_ru,
        LessonVideoLink.title_en,
        LessonVideoLink.url,
        LessonVideoLink.created_at,
    ]
    form_columns = [
        LessonVideoLink.lesson,
        LessonVideoLink.position,
        LessonVideoLink.title_ru,
        LessonVideoLink.title_en,
        LessonVideoLink.url,
    ]
    column_searchable_list = [LessonVideoLink.title_ru, LessonVideoLink.title_en, LessonVideoLink.url]
    column_sortable_list = [LessonVideoLink.id, LessonVideoLink.position, LessonVideoLink.created_at]
    form_ajax_refs = {
        "lesson": {"fields": ("title_ru", "title_en", "title")},
    }

    locale_config = {
        "ru": {
            "name": "Видео-ссылка",
            "name_plural": "Видео-ссылки уроков",
            "category": "Контент",
            "column_labels": {
                LessonVideoLink.id: "ID",
                LessonVideoLink.lesson: "Урок",
                LessonVideoLink.position: "Позиция",
                LessonVideoLink.title_ru: "Название (RU)",
                LessonVideoLink.title_en: "Название (EN)",
                LessonVideoLink.url: "URL видео",
                LessonVideoLink.created_at: "Создана",
            },
        },
        "en": {
            "name": "Lesson Video Link",
            "name_plural": "Lesson Video Links",
            "category": "Content",
            "column_labels": {
                LessonVideoLink.id: "ID",
                LessonVideoLink.lesson: "Lesson",
                LessonVideoLink.position: "Position",
                LessonVideoLink.title_ru: "Title (RU)",
                LessonVideoLink.title_en: "Title (EN)",
                LessonVideoLink.url: "Video URL",
                LessonVideoLink.created_at: "Created",
            },
        },
    }

    form_args = {
        "lesson": {"validators": [DataRequired(message="Required field.")]},
        "position": {"validators": [DataRequired(message="Required field.")]},
        "title_ru": {"validators": [DataRequired(message="Required field.")]},
        "title_en": {"validators": [DataRequired(message="Required field.")]},
        "url": {"validators": [DataRequired(message="Required field.")]},
    }

    async def on_model_change(self, data: dict, model: LessonVideoLink, is_created: bool, request: Request) -> None:
        raw_lesson_id = data.get("lesson_id")
        selected_lesson = data.get("lesson")
        if raw_lesson_id in (None, "") and selected_lesson not in (None, ""):
            raw_lesson_id = getattr(selected_lesson, "id", selected_lesson)

        try:
            lesson_id = int(raw_lesson_id)
        except (TypeError, ValueError) as exc:
            raise ValueError(_admin_text(request, "Выберите урок.", "Choose a lesson.")) from exc

        title_ru = (data.get("title_ru") or "").strip()
        title_en = (data.get("title_en") or "").strip()
        video_url = (data.get("url") or "").strip()

        try:
            position = int(data.get("position") or 1)
        except (TypeError, ValueError) as exc:
            raise ValueError(_admin_text(request, "Позиция должна быть числом.", "Position must be a number.")) from exc

        if position < 1:
            position = 1

        if not title_ru or not title_en:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните название ссылки на русском и английском.",
                    "Fill in link title in Russian and English.",
                )
            )
        if not video_url:
            raise ValueError(_admin_text(request, "Укажите URL видео.", "Specify video URL."))

        with SessionLocal() as db:
            lesson_exists = db.scalar(select(Lesson.id).where(Lesson.id == lesson_id))
            if not lesson_exists:
                raise ValueError(_admin_text(request, "Урок не найден.", "Lesson not found."))

            should_check_limit = is_created or lesson_id != getattr(model, "lesson_id", None)
            if should_check_limit:
                links_count = len(db.scalars(select(LessonVideoLink.id).where(LessonVideoLink.lesson_id == lesson_id)).all())
                if links_count >= 50:
                    raise ValueError(
                        _admin_text(
                            request,
                            "В одном уроке может быть максимум 50 видео-ссылок.",
                            "A lesson can contain at most 50 video links.",
                        )
                    )

        data["lesson_id"] = lesson_id
        data["position"] = position
        data["title_ru"] = title_ru
        data["title_en"] = title_en
        data["url"] = to_embed_url(video_url)


class CommentAdmin(LocalizedAdminView, model=Comment):
    icon = "fa-solid fa-comments"

    can_export = True
    column_list = [Comment.id, Comment.lesson, Comment.author, Comment.content, Comment.created_at]
    form_columns = [Comment.lesson, Comment.author, Comment.content]
    column_searchable_list = [Comment.content]
    column_sortable_list = [Comment.id, Comment.created_at]
    form_ajax_refs = {
        "lesson": {"fields": ("title_ru", "title_en", "title")},
        "author": {"fields": ("email", "full_name")},
    }

    locale_config = {
        "ru": {
            "name": "Комментарий",
            "name_plural": "Комментарии",
            "category": "Контент",
            "column_labels": {
                Comment.id: "ID",
                Comment.lesson: "Видеоурок",
                Comment.author: "Пользователь",
                Comment.content: "Текст",
                Comment.created_at: "Создан",
            },
        },
        "en": {
            "name": "Comment",
            "name_plural": "Comments",
            "category": "Content",
            "column_labels": {
                Comment.id: "ID",
                Comment.lesson: "Lesson",
                Comment.author: "User",
                Comment.content: "Content",
                Comment.created_at: "Created",
            },
        },
    }

    form_args = {
        "lesson": {"validators": [DataRequired(message="Required field.")]},
        "author": {"validators": [DataRequired(message="Required field.")]},
        "content": {"validators": [DataRequired(message="Required field.")]},
    }


class GameAdmin(LocalizedAdminView, model=Game):
    icon = "fa-solid fa-gamepad"

    can_export = True
    column_list = [Game.id, Game.slug, Game.title_ru, Game.title_en, Game.engine, Game.is_active, Game.created_at]
    form_columns = [Game.slug, Game.title_ru, Game.title_en, Game.description_ru, Game.description_en, Game.engine, Game.is_active]
    column_searchable_list = [Game.slug, Game.title_ru, Game.title_en]
    column_sortable_list = [Game.id, Game.slug, Game.created_at]

    locale_config = {
        "ru": {
            "name": "Игра",
            "name_plural": "Игры",
            "category": "Контент",
            "column_labels": {
                Game.id: "ID",
                Game.slug: "Slug",
                Game.title_ru: "Название (RU)",
                Game.title_en: "Название (EN)",
                Game.description_ru: "Описание (RU)",
                Game.description_en: "Описание (EN)",
                Game.engine: "Движок",
                Game.is_active: "Активна",
                Game.created_at: "Создана",
            },
        },
        "en": {
            "name": "Game",
            "name_plural": "Games",
            "category": "Content",
            "column_labels": {
                Game.id: "ID",
                Game.slug: "Slug",
                Game.title_ru: "Title (RU)",
                Game.title_en: "Title (EN)",
                Game.description_ru: "Description (RU)",
                Game.description_en: "Description (EN)",
                Game.engine: "Engine",
                Game.is_active: "Active",
                Game.created_at: "Created",
            },
        },
    }

    form_args = {
        "slug": {"validators": [DataRequired(message="Required field.")]},
        "title_ru": {"validators": [DataRequired(message="Required field.")]},
        "title_en": {"validators": [DataRequired(message="Required field.")]},
        "description_ru": {"validators": [DataRequired(message="Required field.")]},
        "description_en": {"validators": [DataRequired(message="Required field.")]},
        "engine": {"validators": [DataRequired(message="Required field.")]},
    }
    form_widget_args = {
        "engine": {"placeholder": "binary-blitz | bug-hunt | quiz-arena"},
    }

    async def on_model_change(self, data: dict, model: Game, is_created: bool, request: Request) -> None:
        slug = (data.get("slug") or "").strip().lower()
        title_ru = (data.get("title_ru") or "").strip()
        title_en = (data.get("title_en") or "").strip()
        description_ru = (data.get("description_ru") or "").strip()
        description_en = (data.get("description_en") or "").strip()
        engine_name = (data.get("engine") or "").strip().lower()

        if not slug:
            raise ValueError(_admin_text(request, "Укажите slug игры.", "Specify game slug."))
        if not title_ru or not title_en:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните название игры на русском и английском.",
                    "Fill in game title in Russian and English.",
                )
            )
        if not description_ru or not description_en:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните описание игры на русском и английском.",
                    "Fill in game description in Russian and English.",
                )
            )
        if not engine_name:
            raise ValueError(_admin_text(request, "Укажите движок игры.", "Specify game engine."))
        if engine_name not in SUPPORTED_GAME_ENGINES:
            engine_name = "quiz-arena"

        if is_created or slug != model.slug:
            with SessionLocal() as db:
                exists_slug = db.scalar(select(Game.id).where(Game.slug == slug))
                if exists_slug:
                    raise ValueError(_admin_text(request, "Игра с таким slug уже существует.", "Game with this slug already exists."))

        data["slug"] = slug
        data["title_ru"] = title_ru
        data["title_en"] = title_en
        data["description_ru"] = description_ru
        data["description_en"] = description_en
        data["engine"] = engine_name


class TaskAdmin(LocalizedAdminView, model=Task):
    icon = "fa-solid fa-code"

    can_export = True
    column_list = [Task.id, Task.title_ru, Task.title_en, Task.difficulty, Task.created_at]
    form_columns = [
        Task.title_ru,
        Task.title_en,
        Task.description_ru,
        Task.description_en,
        Task.difficulty,
        Task.solution_text,
        Task.solution_keywords,
    ]
    column_searchable_list = [Task.title_ru, Task.title_en]
    column_sortable_list = [Task.id, Task.created_at]

    locale_config = {
        "ru": {
            "name": "Задача",
            "name_plural": "Задачи",
            "category": "Контент",
            "column_labels": {
                Task.id: "ID",
                Task.title_ru: "Название (RU)",
                Task.title_en: "Название (EN)",
                Task.description_ru: "Описание (RU)",
                Task.description_en: "Описание (EN)",
                Task.difficulty: "Сложность",
                Task.solution_text: "Точный ответ",
                Task.solution_keywords: "Ключевые слова ответа",
                Task.created_at: "Создана",
            },
        },
        "en": {
            "name": "Task",
            "name_plural": "Tasks",
            "category": "Content",
            "column_labels": {
                Task.id: "ID",
                Task.title_ru: "Title (RU)",
                Task.title_en: "Title (EN)",
                Task.description_ru: "Description (RU)",
                Task.description_en: "Description (EN)",
                Task.difficulty: "Difficulty",
                Task.solution_text: "Exact solution",
                Task.solution_keywords: "Solution keywords",
                Task.created_at: "Created",
            },
        },
    }

    form_args = {
        "title_ru": {"validators": [DataRequired(message="Required field.")]},
        "title_en": {"validators": [DataRequired(message="Required field.")]},
        "description_ru": {"validators": [DataRequired(message="Required field.")]},
        "description_en": {"validators": [DataRequired(message="Required field.")]},
        "difficulty": {"validators": [DataRequired(message="Required field.")]},
    }

    async def on_model_change(self, data: dict, model: Task, is_created: bool, request: Request) -> None:
        title_en = (data.get("title_en") or "").strip()
        title_ru = (data.get("title_ru") or "").strip()
        description_en = (data.get("description_en") or "").strip()
        description_ru = (data.get("description_ru") or "").strip()
        difficulty = (data.get("difficulty") or "").strip().lower()

        if not title_en or not title_ru:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните название на русском и английском.",
                    "Fill in title in Russian and English.",
                )
            )
        if not description_en or not description_ru:
            raise ValueError(
                _admin_text(
                    request,
                    "Заполните описание на русском и английском.",
                    "Fill in description in Russian and English.",
                )
            )
        if difficulty not in {"easy", "medium", "hard"}:
            raise ValueError(
                _admin_text(
                    request,
                    "Сложность должна быть одной из: easy, medium, hard.",
                    "Difficulty must be one of: easy, medium, hard.",
                )
            )

        data["title"] = title_en
        data["description"] = description_en
        data["difficulty"] = difficulty


class SubmissionAdmin(LocalizedAdminView, model=TaskSubmission):
    icon = "fa-solid fa-paper-plane"

    can_create = False
    can_edit = False
    can_export = True
    column_list = [TaskSubmission.id, TaskSubmission.task, TaskSubmission.user, TaskSubmission.is_correct, TaskSubmission.created_at]
    column_searchable_list = [TaskSubmission.answer]
    column_sortable_list = [TaskSubmission.id, TaskSubmission.created_at]
    form_ajax_refs = {
        "task": {"fields": ("title_ru", "title_en", "title")},
        "user": {"fields": ("email", "full_name")},
    }

    locale_config = {
        "ru": {
            "name": "Отправка решения",
            "name_plural": "Отправки решений",
            "category": "Результаты",
            "column_labels": {
                TaskSubmission.id: "ID",
                TaskSubmission.task: "Задача",
                TaskSubmission.user: "Пользователь",
                TaskSubmission.answer: "Ответ",
                TaskSubmission.is_correct: "Верно",
                TaskSubmission.created_at: "Создана",
            },
        },
        "en": {
            "name": "Submission",
            "name_plural": "Submissions",
            "category": "Results",
            "column_labels": {
                TaskSubmission.id: "ID",
                TaskSubmission.task: "Task",
                TaskSubmission.user: "User",
                TaskSubmission.answer: "Answer",
                TaskSubmission.is_correct: "Correct",
                TaskSubmission.created_at: "Created",
            },
        },
    }


class ScoreAdmin(LocalizedAdminView, model=GameScore):
    icon = "fa-solid fa-trophy"

    can_export = True
    column_list = [GameScore.id, GameScore.game_slug, GameScore.user, GameScore.score, GameScore.created_at]
    form_columns = [GameScore.game_slug, GameScore.user, GameScore.score]
    column_searchable_list = [GameScore.game_slug]
    column_sortable_list = [GameScore.id, GameScore.score, GameScore.created_at]
    form_ajax_refs = {
        "user": {"fields": ("email", "full_name")},
    }

    locale_config = {
        "ru": {
            "name": "Результат игры",
            "name_plural": "Результаты игр",
            "category": "Результаты",
            "column_labels": {
                GameScore.id: "ID",
                GameScore.game_slug: "Код игры",
                GameScore.user: "Пользователь",
                GameScore.score: "Счет",
                GameScore.created_at: "Создан",
            },
        },
        "en": {
            "name": "Game score",
            "name_plural": "Game scores",
            "category": "Results",
            "column_labels": {
                GameScore.id: "ID",
                GameScore.game_slug: "Game slug",
                GameScore.user: "User",
                GameScore.score: "Score",
                GameScore.created_at: "Created",
            },
        },
    }

    form_args = {
        "game_slug": {"validators": [DataRequired(message="Required field.")]},
        "score": {"validators": [DataRequired(message="Required field.")]},
    }

    async def on_model_change(self, data: dict, model: GameScore, is_created: bool, request: Request) -> None:
        game_slug = (data.get("game_slug") or "").strip().lower()
        if not game_slug:
            raise ValueError(_admin_text(request, "Укажите код игры.", "Specify game slug."))

        with SessionLocal() as db:
            game_exists = db.scalar(select(Game.id).where(Game.slug == game_slug))
        if not game_exists:
            raise ValueError(_admin_text(request, "Игра с таким slug не найдена.", "Game with this slug was not found."))

        raw_user_id = data.get("user_id")
        selected_user = data.get("user")
        if raw_user_id in (None, "") and selected_user not in (None, ""):
            raw_user_id = getattr(selected_user, "id", selected_user)

        if raw_user_id in (None, ""):
            session_user_id = request.session.get("user_id")
            if is_created and session_user_id:
                raw_user_id = int(session_user_id)
            elif not getattr(model, "user_id", None):
                raise ValueError(
                    _admin_text(
                        request,
                        "Выберите пользователя для результата игры.",
                        "Choose a user for the game score.",
                    )
                )

        if raw_user_id not in (None, ""):
            try:
                data["user_id"] = int(raw_user_id)
            except (TypeError, ValueError) as exc:
                raise ValueError(_admin_text(request, "Некорректный пользователь.", "Invalid user value.")) from exc

        raw_score = data.get("score")
        try:
            score_value = int(raw_score)
        except (TypeError, ValueError) as exc:
            raise ValueError(_admin_text(request, "Счет должен быть числом.", "Score must be a number.")) from exc

        if score_value < 0:
            raise ValueError(_admin_text(request, "Счет не может быть отрицательным.", "Score cannot be negative."))

        data["game_slug"] = game_slug
        data["score"] = score_value


def _activity_label(activity_type: str, lang: str) -> str:
    labels = {
        "lesson_view": ("Просмотр урока", "Lesson view"),
        "lesson_completed": ("Урок завершен", "Lesson completed"),
        "task_solved": ("Задача решена", "Task solved"),
        "game_played": ("Игра сыграна", "Game played"),
        "daily_login": ("Ежедневный вход", "Daily login"),
    }
    ru, en = labels.get(activity_type, (activity_type.replace("_", " "), activity_type.replace("_", " ")))
    return en if lang == "en" else ru


def _zero_admin_dashboard(error: str | None = None) -> dict[str, Any]:
    return {
        "error": error,
        "stats": {
            "total_users": 0,
            "active_users": 0,
            "active_today": 0,
            "new_users_today": 0,
            "total_lessons": 0,
            "total_tasks": 0,
            "total_games": 0,
            "total_comments": 0,
            "total_xp": 0,
            "submissions": 0,
            "game_scores": 0,
        },
        "top_students": [],
        "recent_activity": [],
        "activity_chart": [],
    }


def _admin_dashboard_data(request: Request | None = None) -> dict[str, Any]:
    lang = _request_lang(request)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    try:
        with SessionLocal() as db:
            stats = {
                "total_users": db.scalar(select(func.count(User.id))) or 0,
                "active_users": db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0,
                "active_today": db.scalar(
                    select(func.count(func.distinct(UserActivity.user_id))).where(UserActivity.created_at >= today_start)
                ) or 0,
                "new_users_today": db.scalar(select(func.count(User.id)).where(User.created_at >= today_start)) or 0,
                "total_lessons": db.scalar(select(func.count(Lesson.id))) or 0,
                "total_tasks": db.scalar(select(func.count(Task.id))) or 0,
                "total_games": db.scalar(select(func.count(Game.id))) or 0,
                "total_comments": db.scalar(select(func.count(Comment.id))) or 0,
                "total_xp": db.scalar(select(func.sum(User.xp))) or 0,
                "submissions": db.scalar(select(func.count(TaskSubmission.id))) or 0,
                "game_scores": db.scalar(select(func.count(GameScore.id))) or 0,
            }

            top_students_rows = db.scalars(
                select(User)
                .where(User.is_active.is_(True))
                .order_by(desc(User.xp), desc(User.created_at))
                .limit(6)
            ).all()
            top_students = [
                {
                    "name": user.full_name,
                    "email": user.email,
                    "xp": user.xp or 0,
                    "level": user.level,
                }
                for user in top_students_rows
            ]

            activity_rows = db.scalars(
                select(UserActivity)
                .order_by(desc(UserActivity.created_at))
                .limit(8)
            ).all()
            recent_activity = [
                {
                    "label": _activity_label(item.activity_type, lang),
                    "xp": item.xp_gained or 0,
                    "created_at": item.created_at.strftime("%d.%m %H:%M"),
                }
                for item in activity_rows
            ]

            activity_items = db.scalars(
                select(UserActivity).where(UserActivity.created_at >= week_start)
            ).all()
            activity_by_day: dict[str, dict[str, int]] = {}
            for offset in range(7):
                day = week_start + timedelta(days=offset)
                key = day.strftime("%d.%m")
                activity_by_day[key] = {"label": key, "count": 0, "xp": 0}

            for item in activity_items:
                key = item.created_at.strftime("%d.%m")
                if key in activity_by_day:
                    activity_by_day[key]["count"] += 1
                    activity_by_day[key]["xp"] += item.xp_gained or 0

            max_count = max((item["count"] for item in activity_by_day.values()), default=1) or 1
            activity_chart = [
                {
                    **item,
                    "height": max(8, round((item["count"] / max_count) * 100)),
                }
                for item in activity_by_day.values()
            ]

            return {
                "error": None,
                "stats": stats,
                "top_students": top_students,
                "recent_activity": recent_activity,
                "activity_chart": activity_chart,
            }
    except Exception as exc:
        return _zero_admin_dashboard(str(exc))


class _AdminLocaleManager:
    def __init__(self, admin: Admin):
        self.admin = admin

    def apply(self, lang: str | None) -> None:
        normalized = _normalize_lang(lang)
        self.admin.title = "NovaCode Admin Panel" if normalized == "en" else "NovaCode Админка"
        for view in self.admin.views:
            if hasattr(view, "apply_locale"):
                view.apply_locale(normalized)


def setup_admin(app: FastAPI, templates_dir: str = "templates") -> Admin:
    admin = Admin(
        app,
        engine,
        title="NovaCode Админка",
        authentication_backend=AdminAuth(),
        templates_dir=templates_dir,
    )

    admin.add_view(UserAdmin)
    admin.add_view(LessonAdmin)
    admin.add_view(LessonVideoLinkAdmin)
    admin.add_view(CommentAdmin)
    admin.add_view(GameAdmin)
    admin.add_view(TaskAdmin)
    admin.add_view(SubmissionAdmin)
    admin.add_view(ScoreAdmin)

    locale_manager = _AdminLocaleManager(admin)
    locale_manager.apply(settings.default_language)

    admin.templates.env.globals["admin_t"] = lambda request, ru, en: _admin_text(request, ru, en)
    admin.templates.env.globals["admin_dashboard_data"] = _admin_dashboard_data

    app.state.admin_instance = admin
    app.state.admin_locale_manager = locale_manager

    if not getattr(app.state, "admin_locale_middleware_added", False):
        class AdminLocaleMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request: Request, call_next):
                locale_manager.apply(_request_lang(request))
                return await call_next(request)

        admin.admin.add_middleware(AdminLocaleMiddleware)

        app.state.admin_locale_middleware_added = True

    return admin
