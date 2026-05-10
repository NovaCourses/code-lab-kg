# NovaCode

NovaCode - учебная LMS-платформа для программирования на FastAPI + React. В проекте есть видеоуроки, интерактивные задачи, рабочие мини-игры, XP/leaderboard, dashboard, code editor, RU/EN, light/dark theme и админ-панель.

## Что обновлено

- Sidebar исправлен для zoom 100%, 125%, 150%: `100vh`, нормальный scroll, sticky нижний user/admin block, стабильный hamburger на mobile.
- Игры теперь реально работают: Binary Blitz, Bug Hunt, Hacker Escape, Typing Race, Output Guess.
- В играх есть вопросы, проверка ответа, score, timer, combo, XP reward, restart, leaderboard save, win/lose screen и confetti.
- Tasks получили detail page, textarea/code editor, submit, проверку, hints, XP reward, сохранение submission и историю.
- Backend API поддерживает игры, задачи, score/submission и безопасное auto schema update для SQLite.

## Быстрый запуск

Основной локальный адрес:

```text
http://127.0.0.1:8000/
```

Самый простой запуск на Windows:

```bat
start.bat
```

Ручной запуск backend из корня проекта:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Backend сам проверяет `frontend_react/dist` и при необходимости пересобирает React frontend.

## Frontend build

```powershell
cd frontend_react
npm install
npm run build
```

Для dev hot reload можно использовать:

```bat
start-dev.bat
```

## Демо-аккаунты

Админ:

```text
admin@example.com
Admin123!
```

Студент:

```text
student@example.com
Student123!
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
GET  /api/auth/me
```

## Database

SQLite создаётся автоматически при старте. Bootstrap проверяет и обновляет нужные таблицы/поля:

- `users`
- `user_activities`
- `games`
- `game_scores`
- `tasks`
- `task_submissions`
- `lessons`
- `comments`

Если старая база не содержит новых полей для XP, hints, timers или task/game metadata, backend добавит их безопасно при запуске.

## Проверка перед релизом

```powershell
npm run build
python -m compileall backend
python -m uvicorn app.main:app --app-dir backend --reload
```

После запуска откройте:

```text
http://127.0.0.1:8000/
```

Проверьте sidebar при zoom 125-150%, игры, задачи, админку, RU/EN, light/dark theme и видеоуроки.
