import json

from sqlalchemy import inspect, select, text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.entities.games.models import Game, GameQuestion, GameSetting
from app.entities.home.models import HomeSliderItem
from app.entities.lessons.models import Lesson, LessonVideoLink
from app.entities.lessons.service import extract_youtube_video_id
from app.entities.tasks.models import Task
from app.entities.users.schemas import UserRegister
from app.entities.users.service import create_user, get_by_email
from app.models import Comment, GameScore, TaskSubmission  # noqa: F401

def lesson_payload(
    category: str,
    title: str,
    video_id: str,
    duration: str,
    difficulty: str,
    xp_reward: int,
    description: str,
) -> dict:
    embed_url = f"https://www.youtube.com/embed/{video_id}"
    return {
        "category": category,
        "title_en": title,
        "title_ru": title,
        "description_en": description,
        "description_ru": description,
        "youtube_url": embed_url,
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "difficulty": difficulty,
        "duration": duration,
        "xp_reward": xp_reward,
    }


DEMO_LESSONS = [
    lesson_payload(
        "python",
        "Python for Beginners - freeCodeCamp",
        "rfscVS0vtbw",
        "4:26:52",
        "beginner",
        120,
        "A complete Python foundation course covering syntax, variables, functions, and core programming ideas.",
    ),
    lesson_payload(
        "python",
        "Python Tutorial for Beginners - Programming with Mosh",
        "kqtD5dpn9C8",
        "1:00:06",
        "beginner",
        80,
        "Beginner-friendly Python tutorial with practical examples and clean explanations.",
    ),
    lesson_payload(
        "python",
        "Python OOP Tutorial - Corey Schafer",
        "ZDa-Z5JzLYM",
        "57:00",
        "intermediate",
        95,
        "Learn classes, objects, methods, and object-oriented design in Python.",
    ),
    lesson_payload(
        "javascript",
        "JavaScript Full Course - freeCodeCamp",
        "PkZNo7MFNFg",
        "3:26:43",
        "beginner",
        115,
        "A full JavaScript course from basics to practical browser scripting.",
    ),
    lesson_payload(
        "javascript",
        "JavaScript Crash Course - Traversy Media",
        "hdI2bqOjy3c",
        "1:40:30",
        "beginner",
        85,
        "A compact crash course on modern JavaScript fundamentals.",
    ),
    lesson_payload(
        "javascript",
        "JavaScript Tutorial for Beginners - Programming with Mosh",
        "W6NZfCO5SIk",
        "48:17",
        "beginner",
        70,
        "Learn JavaScript syntax, control flow, objects, and functions.",
    ),
    lesson_payload(
        "react",
        "React JS Crash Course - Traversy Media",
        "w7ejDZ8SWv8",
        "1:48:00",
        "beginner",
        90,
        "Build a React app while learning components, props, state, and hooks.",
    ),
    lesson_payload(
        "react",
        "React Course - freeCodeCamp",
        "bMknfKXIFA8",
        "11:55:27",
        "intermediate",
        160,
        "A project-based React course covering modern UI development.",
    ),
    lesson_payload(
        "react",
        "React Tutorial for Beginners - Programming with Mosh",
        "SqcY0GlETPk",
        "1:20:00",
        "beginner",
        90,
        "Learn React fundamentals through reusable components and stateful UI.",
    ),
    lesson_payload(
        "fastapi",
        "FastAPI Course - freeCodeCamp",
        "0sOvCWFmrtA",
        "19:00:00",
        "intermediate",
        180,
        "Build APIs with FastAPI, validation, database access, and authentication patterns.",
    ),
    lesson_payload(
        "fastapi",
        "FastAPI Tutorial - Tech With Tim",
        "-ykeT6kk4bk",
        "1:06:00",
        "beginner",
        80,
        "Create a practical FastAPI project and understand routing and request handling.",
    ),
    lesson_payload(
        "fastapi",
        "FastAPI Crash Course",
        "7t2alSnE2-I",
        "1:15:00",
        "beginner",
        85,
        "A focused FastAPI crash course for quickly building working API endpoints.",
    ),
    lesson_payload(
        "postgresql",
        "PostgreSQL Tutorial for Beginners - freeCodeCamp",
        "qw--VYLpxG4",
        "4:19:34",
        "beginner",
        115,
        "Learn PostgreSQL tables, queries, joins, and database fundamentals.",
    ),
    lesson_payload(
        "postgresql",
        "PostgreSQL Course - Amigoscode",
        "85pG_pDkITY",
        "2:22:00",
        "intermediate",
        100,
        "A practical PostgreSQL course with schema design and SQL examples.",
    ),
    lesson_payload(
        "postgresql",
        "PostgreSQL Tutorial - ProgrammingKnowledge",
        "SpfIwlAYaKk",
        "1:35:00",
        "beginner",
        85,
        "Get started with PostgreSQL installation, SQL commands, and database workflows.",
    ),
    lesson_payload(
        "docker",
        "Docker Tutorial for Beginners - TechWorld with Nana",
        "3c-iBn73dDE",
        "2:54:00",
        "beginner",
        105,
        "Learn containers, images, Dockerfiles, and everyday Docker workflows.",
    ),
    lesson_payload(
        "docker",
        "Docker Course - freeCodeCamp",
        "fqMOX6JJhGo",
        "3:10:00",
        "intermediate",
        120,
        "A deeper Docker course covering images, containers, volumes, and deployment basics.",
    ),
    lesson_payload(
        "docker",
        "Docker Crash Course - Traversy Media",
        "pg19Z8LL06w",
        "1:08:00",
        "beginner",
        85,
        "A concise Docker crash course for app containers and local development.",
    ),
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
        "hint_en": "Use a loop from 1 to 100 and check divisibility by 15 before 3 or 5.",
        "hint_ru": "Use a loop from 1 to 100 and check divisibility by 15 before 3 or 5.",
        "xp_reward": 50,
        "time_limit_minutes": 8,
        "solution_keywords": "for,if,3,5,fizzbuzz",
    },
    {
        "title_en": "Reverse String",
        "title_ru": "Перевернуть строку",
        "description_en": "Return reversed string for input text `hello`.",
        "description_ru": "Верните строку `hello` в обратном порядке.",
        "difficulty": "easy",
        "hint_en": "Python slices can step backwards with -1.",
        "hint_ru": "Python slices can step backwards with -1.",
        "xp_reward": 50,
        "time_limit_minutes": 6,
        "solution_text": "olleh",
    },
    {
        "title_en": "FastAPI Endpoint",
        "title_ru": "Эндпоинт FastAPI",
        "description_en": 'Create GET endpoint returning JSON `{ "status": "ok" }`.',
        "description_ru": 'Создайте GET-эндпоинт, который возвращает JSON `{ "status": "ok" }`.',
        "difficulty": "medium",
        "hint_en": "Use a route decorator and return a dict with status set to ok.",
        "hint_ru": "Use a route decorator and return a dict with status set to ok.",
        "xp_reward": 80,
        "time_limit_minutes": 12,
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
        "slug": "typing-race",
        "title_en": "Typing Race",
        "title_ru": "Typing Race",
        "description_en": "Type code fragments quickly and accurately to build a combo.",
        "description_ru": "Type code fragments quickly and accurately to build a combo.",
        "engine": "typing-race",
    },
    {
        "slug": "output-guess",
        "title_en": "Output Guess",
        "title_ru": "Output Guess",
        "description_en": "Read code, predict the exact output, and lock in the result.",
        "description_ru": "Read code, predict the exact output, and lock in the result.",
        "engine": "output-guess",
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
        "config": {"rounds": 5, "minDecimal": 1, "maxDecimal": 31, "pointsPerCorrect": 10, "timeLimit": 60, "xpReward": 75},
    },
    "bug-hunt": {
        "image_url": "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 10, "timeLimit": 75, "xpReward": 75},
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
        "config": {"pointsPerCorrect": 12, "timeLimit": 90, "xpReward": 90},
    },
    "typing-race": {
        "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 15, "timeLimit": 60, "xpReward": 80},
    },
    "output-guess": {
        "image_url": "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80",
        "external_url": None,
        "config": {"pointsPerCorrect": 12, "timeLimit": 75, "xpReward": 80},
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
    ],
    "hacker-escape": [
        {
            "position": 1,
            "prompt_en": "Stage 1: choose the condition that unlocks only admins.",
            "prompt_ru": "Stage 1: choose the condition that unlocks only admins.",
            "code_snippet": "user = {'role': 'admin', 'active': True}\n# door opens when user is admin and active",
            "options_en": ["user['role'] == 'admin' and user['active']", "user['role'] == 'admin' or user['active']", "user['role'] != 'admin'"],
            "options_ru": ["user['role'] == 'admin' and user['active']", "user['role'] == 'admin' or user['active']", "user['role'] != 'admin'"],
            "correct_index": 0,
        },
        {
            "position": 2,
            "prompt_en": "Stage 2: which expression fixes the off-by-one check?",
            "prompt_ru": "Stage 2: which expression fixes the off-by-one check?",
            "code_snippet": "codes = ['alpha', 'beta', 'gamma']\nindex = 2\n# index must be valid",
            "options_en": ["0 <= index < len(codes)", "0 <= index <= len(codes)", "index > len(codes)"],
            "options_ru": ["0 <= index < len(codes)", "0 <= index <= len(codes)", "index > len(codes)"],
            "correct_index": 0,
        },
        {
            "position": 3,
            "prompt_en": "Final lock: pick the safe token comparison.",
            "prompt_ru": "Final lock: pick the safe token comparison.",
            "code_snippet": "token = 'nova-42'\nexpected = 'nova-42'",
            "options_en": ["token == expected", "token = expected", "token in 'expected'"],
            "options_ru": ["token == expected", "token = expected", "token in 'expected'"],
            "correct_index": 0,
        },
    ],
    "typing-race": [
        {
            "position": 1,
            "prompt_en": "Type this Python line exactly.",
            "prompt_ru": "Type this Python line exactly.",
            "code_snippet": "for item in items:\n    print(item.upper())",
            "options_en": [""],
            "options_ru": [""],
            "correct_index": 0,
        },
        {
            "position": 2,
            "prompt_en": "Type this FastAPI route exactly.",
            "prompt_ru": "Type this FastAPI route exactly.",
            "code_snippet": "@app.get('/health')\ndef health():\n    return {'status': 'ok'}",
            "options_en": [""],
            "options_ru": [""],
            "correct_index": 0,
        },
        {
            "position": 3,
            "prompt_en": "Type this list comprehension exactly.",
            "prompt_ru": "Type this list comprehension exactly.",
            "code_snippet": "squares = [n * n for n in range(10)]",
            "options_en": [""],
            "options_ru": [""],
            "correct_index": 0,
        },
    ],
    "output-guess": [
        {
            "position": 1,
            "prompt_en": "What is the exact output?",
            "prompt_ru": "What is the exact output?",
            "code_snippet": "values = [1, 2, 3]\nprint(sum(values))",
            "options_en": ["6", "123", "3"],
            "options_ru": ["6", "123", "3"],
            "correct_index": 0,
        },
        {
            "position": 2,
            "prompt_en": "What is the exact output?",
            "prompt_ru": "What is the exact output?",
            "code_snippet": "name = 'Nova'\nprint(name[::-1])",
            "options_en": ["avoN", "Nova", "navo"],
            "options_ru": ["avoN", "Nova", "navo"],
            "correct_index": 0,
        },
        {
            "position": 3,
            "prompt_en": "What is the exact output?",
            "prompt_ru": "What is the exact output?",
            "code_snippet": "print(bool('False'))",
            "options_en": ["True", "False", "Error"],
            "options_ru": ["True", "False", "Error"],
            "correct_index": 0,
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
        "category": "VARCHAR(50) NOT NULL DEFAULT 'python'",
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


def ensure_table_columns(table_name: str, columns: dict[str, str]) -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if table_name not in inspector.get_table_names():
            return
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, column_type in columns.items():
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def ensure_task_gameplay_columns() -> None:
    ensure_table_columns(
        "tasks",
        {
            "difficulty": "VARCHAR(50) NOT NULL DEFAULT 'easy'",
            "hint_en": "TEXT",
            "hint_ru": "TEXT",
            "xp_reward": "INTEGER NOT NULL DEFAULT 50",
            "time_limit_minutes": "INTEGER NOT NULL DEFAULT 8",
            "solution_text": "TEXT",
            "solution_keywords": "TEXT",
        },
    )


def ensure_user_gamification_columns() -> None:
    ensure_table_columns(
        "users",
        {
            "xp": "INTEGER NOT NULL DEFAULT 0",
            "current_streak": "INTEGER NOT NULL DEFAULT 0",
            "longest_streak": "INTEGER NOT NULL DEFAULT 0",
            "last_activity_date": "DATE",
            "role": "VARCHAR(30) NOT NULL DEFAULT 'user'",
        },
    )


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
        "CREATE INDEX IF NOT EXISTS idx_lessons_category_created ON lessons(category, created_at)",
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
        existing_lessons = list(db.scalars(select(Lesson)).all())
        existing_by_url = {item.youtube_url: item for item in existing_lessons}
        existing_by_video_id = {
            video_id: item
            for item in existing_lessons
            if (video_id := extract_youtube_video_id(item.youtube_url))
        }

        for payload in DEMO_LESSONS:
            lesson = existing_by_url.get(payload["youtube_url"]) or existing_by_video_id.get(extract_youtube_video_id(payload["youtube_url"]))
            if not lesson:
                lesson = Lesson(
                    title=payload["title_en"],
                    description=payload["description_en"],
                    youtube_url=payload["youtube_url"],
                )
            lesson.title = payload["title_en"]
            lesson.description = payload["description_en"]
            lesson.title_en = payload["title_en"]
            lesson.title_ru = payload["title_ru"]
            lesson.description_en = payload["description_en"]
            lesson.description_ru = payload["description_ru"]
            lesson.thumbnail_url = payload.get("thumbnail_url")
            lesson.category = payload.get("category", "python")
            lesson.difficulty = payload.get("difficulty", "beginner")
            lesson.duration = payload.get("duration")
            lesson.xp_reward = payload.get("xp_reward", 50)
            lesson.is_published = True
            db.add(lesson)
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
                    hint_en=payload.get("hint_en"),
                    hint_ru=payload.get("hint_ru"),
                    xp_reward=payload.get("xp_reward", 50),
                    time_limit_minutes=payload.get("time_limit_minutes", 8),
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
            else:
                setting.image_url = setting_payload.get("image_url") or setting.image_url
                setting.external_url = setting_payload.get("external_url")
                setting.config_json = (
                    json.dumps(setting_payload.get("config"))
                    if setting_payload.get("config") is not None
                    else setting.config_json
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
    lesson_by_video_id = {
        video_id: item
        for item in DEMO_LESSONS
        if (video_id := extract_youtube_video_id(item["youtube_url"]))
    }
    task_by_title = {item["title_en"]: item for item in DEMO_TASKS}

    with SessionLocal() as db:
        lessons = list(db.scalars(select(Lesson).order_by(Lesson.id.asc())).all())
        published_demo_video_ids: set[str] = set()
        for lesson in lessons:
            lesson.title_en = lesson.title_en or lesson.title
            lesson.description_en = lesson.description_en or lesson.description
            lesson_video_id = extract_youtube_video_id(lesson.youtube_url)
            seeded = lesson_by_url.get(lesson.youtube_url) or lesson_by_video_id.get(lesson_video_id)
            if seeded:
                lesson.title_en = seeded["title_en"]
                lesson.title_ru = seeded["title_ru"]
                lesson.description_en = seeded["description_en"]
                lesson.description_ru = seeded["description_ru"]
                lesson.title = seeded["title_en"]
                lesson.description = seeded["description_en"]
                lesson.thumbnail_url = seeded.get("thumbnail_url") or lesson.thumbnail_url
                lesson.category = seeded.get("category", lesson.category or "python")
                lesson.difficulty = seeded.get("difficulty", lesson.difficulty or "beginner")
                lesson.duration = seeded.get("duration") or lesson.duration
                lesson.xp_reward = seeded.get("xp_reward", lesson.xp_reward or 50)
                if lesson_video_id in published_demo_video_ids:
                    lesson.is_published = False
                else:
                    lesson.is_published = True
                    if lesson_video_id:
                        published_demo_video_ids.add(lesson_video_id)
            else:
                lesson.title_ru = lesson.title_ru or lesson.title_en or lesson.title
                lesson.description_ru = lesson.description_ru or lesson.description_en or lesson.description
                if (lesson.title_en or lesson.title) == "SQLAlchemy ORM Intro":
                    lesson.category = "legacy"
                    lesson.is_published = False
                else:
                    lesson.category = lesson.category or "python"
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
                task.difficulty = seeded.get("difficulty", task.difficulty or "easy")
                task.hint_en = seeded.get("hint_en") or task.hint_en
                task.hint_ru = seeded.get("hint_ru") or task.hint_ru
                task.xp_reward = seeded.get("xp_reward", task.xp_reward or 50)
                task.time_limit_minutes = seeded.get("time_limit_minutes", task.time_limit_minutes or 8)
                task.solution_text = seeded.get("solution_text") or task.solution_text
                task.solution_keywords = seeded.get("solution_keywords") or task.solution_keywords
            else:
                task.title_ru = task.title_ru or task.title_en or task.title
                task.description_ru = task.description_ru or task.description_en or task.description
                task.xp_reward = task.xp_reward or 50
                task.time_limit_minutes = task.time_limit_minutes or 8
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
    ensure_task_gameplay_columns()
    ensure_user_gamification_columns()
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
