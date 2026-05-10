import json

from sqlalchemy import inspect, select, text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.entities.games.models import Game, GameQuestion, GameSetting
from app.entities.home.models import HomeSliderItem
from app.entities.lessons.models import Lesson, LessonVideoLink
from app.entities.tasks.models import Task
from app.entities.users.schemas import UserRegister
from app.entities.users.service import create_user, get_by_email
from app.models import Comment, GameScore, TaskSubmission  # noqa: F401

DEMO_LESSONS = [
    {
        "title_en": "Python Basics in 15 Minutes",
        "title_ru": "Основы Python за 15 минут",
        "description_en": "Variables, loops, functions, and your first script structure.",
        "description_ru": "Переменные, циклы, функции и структура первого скрипта.",
        "youtube_url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
    },
    {
        "title_en": "FastAPI Crash Course",
        "title_ru": "Быстрый старт с FastAPI",
        "description_en": "Build your first API with routing, models, and validation.",
        "description_ru": "Создайте первое API с роутами, моделями и валидацией.",
        "youtube_url": "https://www.youtube.com/watch?v=0sOvCWFmrtA",
    },
    {
        "title_en": "SQLAlchemy ORM Intro",
        "title_ru": "Введение в SQLAlchemy ORM",
        "description_en": "How models, sessions, and relationships work in practice.",
        "description_ru": "Как в реальном проекте работают модели, сессии и связи.",
        "youtube_url": "https://www.youtube.com/watch?v=woKYyhLCcnU",
    },
]

DEMO_TASKS = [
    {
        "title_en": "FizzBuzz",
        "title_ru": "FizzBuzz",
        "description_en": (
            "Write Python code that prints numbers from 1 to 100. "
            "For multiples of 3 print Fizz, for multiples of 5 print Buzz, "
            "for both print FizzBuzz."
        ),
        "description_ru": (
            "Напишите код на Python, который выводит числа от 1 до 100. "
            "Для чисел, кратных 3, выводите Fizz, для кратных 5 — Buzz, "
            "для кратных 3 и 5 — FizzBuzz."
        ),
        "difficulty": "easy",
        "solution_keywords": "for,if,3,5,fizzbuzz",
    },
    {
        "title_en": "Reverse String",
        "title_ru": "Перевернуть строку",
        "description_en": "Return reversed string for input text `hello`.",
        "description_ru": "Верните строку `hello` в обратном порядке.",
        "difficulty": "easy",
        "solution_text": "olleh",
    },
    {
        "title_en": "FastAPI Endpoint",
        "title_ru": "Эндпоинт FastAPI",
        "description_en": 'Create GET endpoint returning JSON `{ "status": "ok" }`.',
        "description_ru": 'Создайте GET-эндпоинт, который возвращает JSON `{ "status": "ok" }`.',
        "difficulty": "medium",
        "solution_keywords": "get,status,ok,json",
    },
]

DEMO_GAMES = [
    {
        "slug": "binary-blitz",
        "title_en": "Binary Blitz",
        "title_ru": "Binary Blitz",
        "description_en": "Convert decimal numbers to binary as fast as possible.",
        "description_ru": "Преобразуйте десятичные числа в двоичные как можно быстрее.",
        "engine": "binary-blitz",
    },
    {
        "slug": "bug-hunt",
        "title_en": "Bug Hunt",
        "title_ru": "Bug Hunt",
        "description_en": "Find the correct output and catch logic bugs.",
        "description_ru": "Найдите правильный вывод и поймайте логические ошибки.",
        "engine": "bug-hunt",
    },
    {
        "slug": "code-runner-race",
        "title_en": "Code Runner Race",
        "title_ru": "Гонка Code Runner",
        "description_en": "A speed challenge for writing the right code before the timer runs out.",
        "description_ru": "Скоростной челлендж: напишите правильный код до окончания таймера.",
        "engine": "code-runner-race",
    },
    {
        "slug": "memory-syntax",
        "title_en": "Memory Syntax",
        "title_ru": "Память синтаксиса",
        "description_en": "Memorize short snippets and choose the missing syntax piece.",
        "description_ru": "Запоминайте короткие фрагменты кода и выбирайте недостающий элемент.",
        "engine": "memory-syntax",
    },
    {
        "slug": "binary-blitz-2",
        "title_en": "Binary Blitz 2.0",
        "title_ru": "Binary Blitz 2.0",
        "description_en": "Binary conversion with higher numbers, combo bonuses, and boss-style rounds.",
        "description_ru": "Двоичные числа с большими значениями, комбо-бонусами и boss-раундами.",
        "engine": "binary-blitz-2",
    },
    {
        "slug": "hacker-escape",
        "title_en": "Hacker Escape",
        "title_ru": "Hacker Escape",
        "description_en": "Solve programming puzzles to unlock the next stage.",
        "description_ru": "Решайте programming puzzle, чтобы открыть следующий этап.",
        "engine": "hacker-escape",
    },
    {
        "slug": "typing-speed-code",
        "title_en": "Typing Speed Code",
        "title_ru": "Скоростная печать кода",
        "description_en": "Type code fragments quickly and accurately to build a combo.",
        "description_ru": "Печатайте фрагменты кода быстро и точно, чтобы набрать комбо.",
        "engine": "typing-speed-code",
    },
    {
        "slug": "external-playground",
        "title_en": "External Playground",
        "title_ru": "Внешний Playground",
        "description_en": "An external coding playground embedded via link.",
        "description_ru": "Внешняя coding-площадка, подключаемая по ссылке.",
        "engine": "external",
    },
]

DEMO_GAME_SETTINGS = {
    "binary-blitz": {
        "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"rounds": 5, "minDecimal": 1, "maxDecimal": 31, "pointsPerCorrect": 10},
    },
    "bug-hunt": {
        "image_url": "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 10},
    },
    "code-runner-race": {
        "image_url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 12, "timeLimit": 90},
    },
    "memory-syntax": {
        "image_url": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 10},
    },
    "binary-blitz-2": {
        "image_url": "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"rounds": 8, "minDecimal": 1, "maxDecimal": 255, "pointsPerCorrect": 14},
    },
    "hacker-escape": {
        "image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 12},
    },
    "typing-speed-code": {
        "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 8, "timeLimit": 60},
    },
    "external-playground": {
        "image_url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80",
        "external_url": "https://www.programiz.com/python-programming/online-compiler/",
        "config": None,
    },
}

DEMO_GAME_QUESTIONS = {
    "bug-hunt": [
        {
            "position": 1,
            "prompt_en": "What is output?",
            "prompt_ru": "Какой будет вывод?",
            "code_snippet": "print(2 + 2 * 2)",
            "options_en": ["6", "8", "4"],
            "options_ru": ["6", "8", "4"],
            "correct_index": 0,
        },
        {
            "position": 2,
            "prompt_en": "What is output?",
            "prompt_ru": "Какой будет вывод?",
            "code_snippet": "print('a' * 3)",
            "options_en": ["aaa", "a3", "error"],
            "options_ru": ["aaa", "a3", "ошибка"],
            "correct_index": 0,
        },
        {
            "position": 3,
            "prompt_en": "What is output?",
            "prompt_ru": "Какой будет вывод?",
            "code_snippet": "x = [1, 2]\nprint(len(x))",
            "options_en": ["1", "2", "3"],
            "options_ru": ["1", "2", "3"],
            "correct_index": 1,
        },
        {
            "position": 4,
            "prompt_en": "Choose valid boolean result.",
            "prompt_ru": "Выберите правильный булев результат.",
            "code_snippet": "print(5 > 3 and 2 < 1)",
            "options_en": ["True", "False", "None"],
            "options_ru": ["True", "False", "None"],
            "correct_index": 1,
        },
    ]
}

DEMO_SLIDER_ITEMS = [
    {
        "position": 1,
        "title_en": "Build Real Projects",
        "title_ru": "Создавайте реальные проекты",
        "description_en": "Learn through practical FastAPI + React workflows with admin control.",
        "description_ru": "Изучайте разработку через практику FastAPI + React и полный контроль через админку.",
        "image_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        "target_url": "/lessons",
    },
    {
        "position": 2,
        "title_en": "Solve Coding Tasks",
        "title_ru": "Решайте задачи по коду",
        "description_en": "Improve your skills with tasks and instant validation.",
        "description_ru": "Прокачивайте навыки через задачи и мгновенную проверку ответов.",
        "image_url": "https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?auto=format&fit=crop&w=1200&q=80",
        "target_url": "/tasks",
    },
    {
        "position": 3,
        "title_en": "Compete in Mini Games",
        "title_ru": "Соревнуйтесь в мини-играх",
        "description_en": "Play coding games, set records, and track leaderboard.",
        "description_ru": "Играйте в coding-мини-игры, ставьте рекорды и следите за лидерами.",
        "image_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
        "target_url": "/games",
    },
]


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def ensure_multilang_columns() -> None:
    required_columns = {
        "lessons": ["title_en", "title_ru", "description_en", "description_ru"],
        "tasks": ["title_en", "title_ru", "description_en", "description_ru"],
    }
    type_map = {
        "title_en": "VARCHAR(255)",
        "title_ru": "VARCHAR(255)",
        "description_en": "TEXT",
        "description_ru": "TEXT",
    }

    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in required_columns.items():
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name in columns:
                if column_name not in existing:
                    column_type = type_map[column_name]
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def ensure_lesson_admin_columns() -> None:
    columns = {
        "thumbnail_url": "VARCHAR(1000)",
        "difficulty": "VARCHAR(30) NOT NULL DEFAULT 'beginner'",
        "duration": "VARCHAR(30)",
        "xp_reward": "INTEGER NOT NULL DEFAULT 50",
        "is_published": "BOOLEAN NOT NULL DEFAULT 1",
    }

    with engine.begin() as connection:
        inspector = inspect(connection)
        existing = {column["name"] for column in inspector.get_columns("lessons")}
        for column_name, column_type in columns.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE lessons ADD COLUMN {column_name} {column_type}"))


def ensure_user_role_column() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        existing = {column["name"] for column in inspector.get_columns("users")}
        if "role" not in existing:
            connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'user'"))
        connection.execute(text("UPDATE users SET role = 'super_admin' WHERE is_admin = 1 AND (role IS NULL OR role = 'user')"))


def ensure_admin_indexes() -> None:
    """Create indexes used by admin dashboards and moderation screens."""
    statements = [
        "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_lesson_video_links_lesson_created ON lesson_video_links(lesson_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_task_submissions_task_created ON task_submissions(task_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_task_submissions_user_created ON task_submissions(user_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_game_scores_user_created ON game_scores(user_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_game_scores_slug_created ON game_scores(game_slug, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_comments_lesson_created ON comments(lesson_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_user_activities_type_created ON user_activities(activity_type, created_at)",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def seed_admin() -> None:
    with SessionLocal() as db:
        existing_admin = get_by_email(db, settings.admin_email.lower())
        if existing_admin:
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
            existing_admin.role = "super_admin"
            db.add(existing_admin)
            db.commit()
            return

        create_user(
            db,
            UserRegister(
                email=settings.admin_email,
                full_name="Администратор платформы",
                password=settings.admin_password,
            ),
            is_admin=True,
        )


def seed_lessons() -> None:
    with SessionLocal() as db:
        any_lesson = db.scalar(select(Lesson.id).limit(1))
        if any_lesson:
            return

        for payload in DEMO_LESSONS:
            db.add(
                Lesson(
                    title=payload["title_en"],
                    description=payload["description_en"],
                    title_en=payload["title_en"],
                    title_ru=payload["title_ru"],
                    description_en=payload["description_en"],
                    description_ru=payload["description_ru"],
                    youtube_url=payload["youtube_url"],
                )
            )
        db.commit()


def seed_tasks() -> None:
    with SessionLocal() as db:
        any_task = db.scalar(select(Task.id).limit(1))
        if any_task:
            return

        for payload in DEMO_TASKS:
            db.add(
                Task(
                    title=payload["title_en"],
                    description=payload["description_en"],
                    title_en=payload["title_en"],
                    title_ru=payload["title_ru"],
                    description_en=payload["description_en"],
                    description_ru=payload["description_ru"],
                    difficulty=payload["difficulty"],
                    solution_text=payload.get("solution_text"),
                    solution_keywords=payload.get("solution_keywords"),
                )
            )
        db.commit()


def seed_games() -> None:
    with SessionLocal() as db:
        existing_games = {item.slug: item for item in db.scalars(select(Game)).all()}

        for payload in DEMO_GAMES:
            game = existing_games.get(payload["slug"])
            if not game:
                game = Game(
                    slug=payload["slug"],
                    title_en=payload["title_en"],
                    title_ru=payload["title_ru"],
                    description_en=payload["description_en"],
                    description_ru=payload["description_ru"],
                    engine=payload["engine"],
                    is_active=True,
                )
            else:
                game.title_en = payload["title_en"]
                game.title_ru = payload["title_ru"]
                game.description_en = payload["description_en"]
                game.description_ru = payload["description_ru"]
                game.engine = payload["engine"] or game.engine or "external"
                game.is_active = True
            db.add(game)
        db.commit()


def seed_game_settings_and_questions() -> None:
    with SessionLocal() as db:
        games = list(db.scalars(select(Game)).all())
        game_by_slug = {item.slug: item for item in games}

        for slug, setting_payload in DEMO_GAME_SETTINGS.items():
            game = game_by_slug.get(slug)
            if not game:
                continue

            setting = db.scalar(select(GameSetting).where(GameSetting.game_id == game.id))
            if not setting:
                setting = GameSetting(
                    game_id=game.id,
                    image_url=setting_payload.get("image_url"),
                    external_url=setting_payload.get("external_url"),
                    config_json=json.dumps(setting_payload.get("config")) if setting_payload.get("config") is not None else None,
                )
                db.add(setting)

        for slug, questions in DEMO_GAME_QUESTIONS.items():
            game = game_by_slug.get(slug)
            if not game:
                continue

            any_questions = db.scalar(select(GameQuestion.id).where(GameQuestion.game_id == game.id).limit(1))
            if any_questions:
                continue

            for payload in questions:
                db.add(
                    GameQuestion(
                        game_id=game.id,
                        position=payload["position"],
                        prompt_en=payload["prompt_en"],
                        prompt_ru=payload["prompt_ru"],
                        code_snippet=payload.get("code_snippet"),
                        options_en_json=json.dumps(payload["options_en"], ensure_ascii=False),
                        options_ru_json=json.dumps(payload["options_ru"], ensure_ascii=False),
                        correct_index=payload["correct_index"],
                    )
                )

        db.commit()


def sync_existing_multilang_content() -> None:
    lesson_by_url = {item["youtube_url"]: item for item in DEMO_LESSONS}
    task_by_title = {item["title_en"]: item for item in DEMO_TASKS}

    with SessionLocal() as db:
        lessons = list(db.scalars(select(Lesson)).all())
        for lesson in lessons:
            lesson.title_en = lesson.title_en or lesson.title
            lesson.description_en = lesson.description_en or lesson.description
            seeded = lesson_by_url.get(lesson.youtube_url)
            if seeded:
                lesson.title_en = seeded["title_en"]
                lesson.title_ru = seeded["title_ru"]
                lesson.description_en = seeded["description_en"]
                lesson.description_ru = seeded["description_ru"]
                lesson.title = seeded["title_en"]
                lesson.description = seeded["description_en"]
            else:
                lesson.title_ru = lesson.title_ru or lesson.title_en or lesson.title
                lesson.description_ru = lesson.description_ru or lesson.description_en or lesson.description
            db.add(lesson)

        tasks = list(db.scalars(select(Task)).all())
        for task in tasks:
            task.title_en = task.title_en or task.title
            task.description_en = task.description_en or task.description
            seeded = task_by_title.get(task.title_en or task.title)
            if seeded:
                task.title_en = seeded["title_en"]
                task.title_ru = seeded["title_ru"]
                task.description_en = seeded["description_en"]
                task.description_ru = seeded["description_ru"]
                task.title = seeded["title_en"]
                task.description = seeded["description_en"]
            else:
                task.title_ru = task.title_ru or task.title_en or task.title
                task.description_ru = task.description_ru or task.description_en or task.description
            db.add(task)

        db.commit()


def seed_lesson_video_links() -> None:
    with SessionLocal() as db:
        lessons = list(db.scalars(select(Lesson)).all())
        for lesson in lessons:
            has_links = db.scalar(select(LessonVideoLink.id).where(LessonVideoLink.lesson_id == lesson.id).limit(1))
            if has_links or not lesson.youtube_url:
                continue
            db.add(
                LessonVideoLink(
                    lesson_id=lesson.id,
                    title_en=lesson.title_en or lesson.title,
                    title_ru=lesson.title_ru or lesson.title_en or lesson.title,
                    url=lesson.youtube_url,
                    position=1,
                )
            )
        db.commit()


def seed_demo_users() -> None:
    with SessionLocal() as db:
        demo_user = get_by_email(db, "student@example.com")
        if demo_user:
            return
        create_user(
            db,
            UserRegister(email="student@example.com", full_name="Demo Student", password="Student123!"),
            is_admin=False,
        )


def seed_home_slider() -> None:
    with SessionLocal() as db:
        existing = len(db.scalars(select(HomeSliderItem.id)).all())
        if existing:
            return

        for payload in DEMO_SLIDER_ITEMS:
            db.add(
                HomeSliderItem(
                    position=payload["position"],
                    title_en=payload["title_en"],
                    title_ru=payload["title_ru"],
                    description_en=payload["description_en"],
                    description_ru=payload["description_ru"],
                    image_url=payload["image_url"],
                    target_url=payload.get("target_url"),
                    is_active=True,
                )
            )
        db.commit()


def bootstrap() -> None:
    create_tables()
    ensure_multilang_columns()
    ensure_lesson_admin_columns()
    ensure_user_role_column()
    ensure_admin_indexes()
    seed_admin()
    seed_demo_users()
    seed_lessons()
    seed_tasks()
    seed_games()
    seed_game_settings_and_questions()
    sync_existing_multilang_content()
    seed_lesson_video_links()
    seed_home_slider()
