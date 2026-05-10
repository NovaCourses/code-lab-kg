# NovaCode

NovaCode - учебная LMS-платформа для программирования на FastAPI + React. В проекте есть видеоуроки, интерактивные задачи, рабочие мини-игры, XP/leaderboard, dashboard, code editor, RU/EN, light/dark theme и админ-панель.

## Что есть сейчас

- Рабочие игры: Binary Blitz, Bug Hunt, Hacker Escape, Typing Race, Output Guess.
- Задачи с detail page, textarea/code editor, submit, hints, XP reward и историей отправок.
- Уроки разделены по категориям: Python, JavaScript, React, FastAPI, PostgreSQL, Docker.
- На каждую технологию добавлено по 3 YouTube-урока с thumbnail, duration, difficulty и XP reward.
- Блок "Технологии будущего" на главной ведёт на `/lessons?category=...`.
- Sidebar адаптирован под zoom 100-150%, mobile menu и нормальный scroll.
- Админ-панель читаемая в dark/light mode: labels, inputs, placeholders, tables и sidebar.
- Backend безопасно обновляет SQLite schema при старте.

## Быстрый запуск

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Откройте:

```text
http://127.0.0.1:8000/
```

На Windows также можно запустить:

```bat
start.bat
```

## Frontend

```powershell
cd frontend_react
npm install
npm run build
```

Для dev hot reload:

```bat
start-dev.bat
```

## Демо-аккаунты

```text
Admin:   admin@example.com / Admin123!
Student: student@example.com / Student123!
```

## Основные страницы

```text
/
/games
/games/binary-blitz
/games/bug-hunt
/games/hacker-escape
/games/typing-race
/games/output-guess
/tasks
/tasks/:taskId
/lessons
/lessons?category=python
/admin/
```

## API

```text
GET  /api/games
GET  /api/games/{slug}
POST /api/games/{slug}/score
GET  /api/tasks
GET  /api/tasks/{id}
POST /api/tasks/{id}/submit
GET  /api/lessons
GET  /api/lessons?category=python
GET  /api/lessons/{id}
```

## Проверка перед релизом

```powershell
cd frontend_react
npm run build
cd ..
python -m uvicorn app.main:app --app-dir backend --reload
```

Проверьте sidebar при zoom 125-150%, игры, задачи, админку, RU/EN, light/dark theme и видеоуроки.
