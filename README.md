# NovaCode

## Production/local single URL

Для обычного локального запуска используйте одну ссылку backend:

```text
http://127.0.0.1:8000/
```

Самый простой запуск на Windows:

```bat
start.bat
```

`start.bat` активирует Python venv и запускает FastAPI backend. Backend сам проверяет `frontend_react/dist`: если build отсутствует или frontend файлы новее `dist/index.html`, он автоматически выполнит `npm install` при необходимости и `npm run build`. Backend отдает актуальный frontend из `frontend_react/dist`, поэтому в production/local single URL режиме не нужно открывать `localhost:5173`.

Ручной запуск:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

После этого откройте:

```text
http://127.0.0.1:8000/
```

Важно: если меняли frontend, просто перезапустите backend или используйте `start.bat`. Backend сам пересоберет frontend, когда `package-lock.json`, `src`, `public`, `index.html`, `vite.config.js` или `package.json` новее текущего build. `index.html` отдается без кэша, а файлы из `/assets` кешируются долгосрочно, поэтому backend не должен показывать старую страницу после новой сборки.

Для разработки с hot reload можно использовать:

```bat
start-dev.bat
```

Этот режим запускает backend и Vite dev server отдельно. Для single URL режима используйте `start.bat`.

NovaCode - учебная SaaS/LMS-платформа для программирования. В проекте есть главная страница, регистрация, вход, уроки, задачи, мини-игры, dashboard, code editor, AI assistant UI и админ-панель.

Проект состоит из двух частей:

- `backend` - сервер на FastAPI. Он отвечает за API, базу данных, авторизацию и админ-панель.
- `frontend_react` - сайт на React + Vite. Это интерфейс, который открывается в браузере.

Для обычной разработки нужно запустить две команды в двух разных окнах терминала: отдельно backend и отдельно frontend.

## Что добавлено в premium UI

- Animated particles background на `tsParticles`.
- Neon cursor glow и cursor trail на desktop.
- Premium loading screen при старте приложения.
- Smooth route transitions через Framer Motion.
- Collapsible sidebar вместо обычного navbar.
- Mobile bottom navigation для ощущения настоящего приложения.
- Command palette как в VS Code по `Ctrl + K`.
- Live stats counters на главной странице.
- Animated developer terminal в hero section.
- Achievement popup с XP-анимацией.
- AI assistant panel с быстрыми действиями.
- Monaco Editor с minimap, autocomplete и realtime AI analysis panel.

## Что нужно скачать и установить

### 1. Python

Нужен Python `3.11` или новее.

Скачать можно с официального сайта:

- https://www.python.org/downloads/

Во время установки на Windows обязательно поставьте галочку:

```text
Add python.exe to PATH
```

После установки откройте PowerShell и проверьте:

```powershell
python --version
```

Если команда показывает версию Python, все хорошо. Например:

```text
Python 3.12.5
```

Если PowerShell пишет, что `python` не найден, значит Python не добавлен в `PATH`. В этом случае проще переустановить Python и поставить галочку `Add python.exe to PATH`.

### 2. Node.js

Нужен Node.js `20.19+` или `22.12+`, потому что Vite 7 требует именно такие версии.

Скачать можно с официального сайта:

- https://nodejs.org/

Лучше ставить LTS-версию.

После установки проверьте в PowerShell:

```powershell
node --version
npm --version
```

Если обе команды показывают версии, Node.js установлен правильно.

### 3. Редактор кода

Можно использовать любой редактор, но проще всего VS Code:

- https://code.visualstudio.com/

VS Code не обязателен, но с ним удобнее открывать папку проекта и запускать терминал.

### 4. Git

Git нужен только если вы будете скачивать проект через `git clone`.

Скачать можно здесь:

- https://git-scm.com/downloads

Если проект уже скачан ZIP-архивом, Git не обязателен.

## Как понять, что вы в правильной папке

Откройте папку проекта. Внутри должны быть такие файлы и папки:

```text
NovaCourses-main/
  backend/
  frontend_react/
  .env.example
  requirements.txt
  README.md
```

Главная папка проекта - это папка, где лежат `backend`, `frontend_react`, `requirements.txt` и `README.md`.

В этой инструкции она называется корнем проекта.

Пример пути на Windows:

```text
C:\Users\HP\Desktop\САЙТ\2026\NovaCourses-main
```

У вас путь может быть другим. Это нормально.

## Куда вводить команды

Команды нужно вводить в терминал.

На Windows удобнее всего использовать PowerShell.

Есть два простых способа открыть PowerShell в папке проекта:

### Способ 1: через Проводник Windows

1. Откройте папку проекта.
2. Нажмите на адресную строку сверху.
3. Напишите:

```text
powershell
```

4. Нажмите `Enter`.

PowerShell откроется сразу в нужной папке.

### Способ 2: через VS Code

1. Откройте VS Code.
2. Нажмите `File` -> `Open Folder`.
3. Выберите папку проекта `NovaCourses-main`.
4. Откройте терминал: `Terminal` -> `New Terminal`.

В терминале должна быть открыта папка проекта.

Проверить текущую папку можно командой:

```powershell
pwd
```

Посмотреть файлы в текущей папке:

```powershell
dir
```

Если вы видите `backend`, `frontend_react`, `requirements.txt`, значит вы в правильном месте.

## Первичная настройка `.env`

В корне проекта есть файл `.env.example`. Это пример настроек.

Нужно создать настоящий файл `.env`.

В PowerShell из корня проекта выполните:

```powershell
Copy-Item .env.example .env
```

Если файл `.env` уже есть, повторно создавать его не нужно.

Внутри `.env` должны быть примерно такие настройки:

```env
PROJECT_NAME=NovaCode
SECRET_KEY=change-me
DATABASE_URL=sqlite:///./novacode.db

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=auto

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!

DEFAULT_LANGUAGE=ru
SUPPORTED_LANGUAGES=en,ru
```

Для обычного локального запуска Google OAuth можно не настраивать. Вход по email и паролю будет работать.

## Запуск проекта для разработки

Нужно открыть два окна PowerShell:

- первое окно - для backend;
- второе окно - для frontend.

Оба окна сначала должны быть открыты в корне проекта.

## Шаг 1. Запуск backend

Откройте первое окно PowerShell в корне проекта.

### 1. Создайте виртуальное окружение Python

Введите:

```powershell
python -m venv .venv
```

После этого появится папка `.venv`.

Это локальное Python-окружение проекта. Оно нужно, чтобы зависимости проекта не смешивались с другими Python-проектами на компьютере.

### 2. Активируйте виртуальное окружение

Введите:

```powershell
.\.venv\Scripts\Activate.ps1
```

Если все хорошо, слева в терминале появится `(.venv)`.

Пример:

```text
(.venv) PS C:\Users\HP\Desktop\NovaCourses-main>
```

Если PowerShell пишет, что выполнение скриптов запрещено, выполните один раз:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Потом снова активируйте окружение:

```powershell
.\.venv\Scripts\Activate.ps1
```

Если не хотите менять Execution Policy, можно запускать команды через Python из `.venv` напрямую. Пример будет ниже в разделе с ошибками.

### 3. Обновите pip

Введите:

```powershell
python -m pip install --upgrade pip
```

### 4. Установите backend-зависимости

Введите:

```powershell
pip install -r requirements.txt
```

Эта команда скачает и установит FastAPI, SQLAlchemy, Uvicorn и другие Python-библиотеки.

Подождите, пока команда полностью завершится.

### 5. Запустите backend server

Важно: запускайте эту команду из корня проекта, не из папки `backend`.

Введите:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Если backend запустился, в терминале будет что-то похожее:

```text
Uvicorn running on http://127.0.0.1:8000
```

Это окно PowerShell закрывать нельзя. Пока оно открыто, backend работает.

Backend будет доступен здесь:

- API: `http://127.0.0.1:8000/api`
- Swagger docs: `http://127.0.0.1:8000/docs`
- Admin panel: `http://127.0.0.1:8000/admin/`

При первом запуске backend сам создаст SQLite-базу и демо-данные.

## Шаг 2. Запуск frontend

Откройте второе окно PowerShell в корне проекта.

Backend из первого окна должен продолжать работать.

### 1. Перейдите в папку frontend

Введите:

```powershell
cd frontend_react
```

Проверить, что вы в правильной папке, можно так:

```powershell
dir
```

Вы должны увидеть `package.json`.

### 2. Установите frontend-зависимости

Введите:

```powershell
npm.cmd install
```

Эта команда скачает React, Vite и остальные frontend-библиотеки в папку `node_modules`.

Установка может занять несколько минут.

### 3. Запустите frontend server

Введите:

```powershell
npm.cmd run dev
```

Если frontend запустился, вы увидите примерно:

```text
Local: http://127.0.0.1:5173/
```

Откройте этот адрес в браузере:

```text
http://127.0.0.1:5173/
```

Это окно PowerShell тоже закрывать нельзя. Пока оно открыто, frontend работает.

## Что должно быть запущено одновременно

Для разработки должны работать два терминала:

```text
Терминал 1: backend
http://127.0.0.1:8000

Терминал 2: frontend
http://127.0.0.1:5173
```

Открывать сайт нужно по адресу frontend:

```text
http://127.0.0.1:5173/
```

Frontend сам отправляет API-запросы на backend через proxy из `vite.config.js`.

Если открыть сайт, но данные не загружаются, чаще всего backend не запущен.

## Демо-аккаунты

Backend создает демо-пользователей при запуске.

Админ:

```text
Email: admin@example.com
Password: Admin123!
```

Пользователь:

```text
Email: student@example.com
Password: Student123!
```

Админ-панель:

```text
http://127.0.0.1:8000/admin/
```

## Основные страницы

Когда frontend запущен, откройте:

```text
http://127.0.0.1:5173/
```

Доступные страницы:

- `/` - главная страница.
- `/dashboard` - прогресс пользователя.
- `/code-editor` - редактор кода.
- `/lessons` - уроки.
- `/tasks` - задачи.
- `/games` - мини-игры.

Пример полного адреса:

```text
http://127.0.0.1:5173/dashboard
```

## Production build

Этот вариант нужен, если вы хотите собрать frontend и отдавать его через backend.

### 1. Соберите frontend

Откройте PowerShell в корне проекта:

```powershell
cd frontend_react
npm.cmd run build
```

После сборки появится папка:

```text
frontend_react/dist
```

### 2. Вернитесь в корень проекта

```powershell
cd ..
```

### 3. Запустите backend без dev frontend

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend
```

Теперь сайт можно открывать через backend:

```text
http://127.0.0.1:8000/
```

Для обычной разработки удобнее использовать dev-запуск с двумя терминалами.

## Google OAuth

Google OAuth не обязателен для локального запуска.

Если хотите включить вход через Google, заполните в `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=auto
```

В Google Cloud Console нужно добавить redirect URI:

```text
http://127.0.0.1:8000/auth/google/callback
http://localhost:8000/auth/google/callback
```

Если Google OAuth не настроен, используйте обычный вход по email и паролю.

## Частые ошибки и решения

### `python` не найден

Проверьте:

```powershell
python --version
```

Если команды нет, установите Python заново и включите галочку `Add python.exe to PATH`.

### `node` или `npm` не найден

Проверьте:

```powershell
node --version
npm --version
```

Если команд нет, установите Node.js заново и перезапустите PowerShell.

### PowerShell блокирует `Activate.ps1`

Выполните один раз:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Потом снова:

```powershell
.\.venv\Scripts\Activate.ps1
```

Альтернатива без активации:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

### PowerShell блокирует `npm.ps1`

Вместо `npm` используйте `npm.cmd`.

Примеры:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

### Порт 8000 уже занят

Backend использует порт `8000`.

Если порт занят, можно запустить backend на другом порту:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload --port 8001
```

Но тогда нужно изменить proxy во frontend-файле `frontend_react/vite.config.js` с `8000` на `8001`.

### Порт 5173 уже занят

Vite обычно сам предложит другой порт, например `5174`.

Откройте именно тот адрес, который Vite покажет в терминале.

### Frontend открылся, но данные не загружаются

Проверьте:

1. Backend запущен.
2. В браузере открывается `http://127.0.0.1:8000/docs`.
3. Frontend запущен.
4. В браузере открыт адрес Vite, обычно `http://127.0.0.1:5173/`.

### `npm install` долго идет

Это нормально. Команда скачивает много frontend-библиотек.

Если установка зависла, проверьте интернет и повторите:

```powershell
npm.cmd install
```

### После изменений ничего не поменялось на сайте

Попробуйте:

1. Обновить страницу в браузере через `Ctrl + F5`.
2. Остановить frontend терминал через `Ctrl + C`.
3. Снова запустить:

```powershell
npm.cmd run dev
```

## Полезные команды

Проверить текущую папку:

```powershell
pwd
```

Показать файлы текущей папки:

```powershell
dir
```

Активировать Python-окружение:

```powershell
.\.venv\Scripts\Activate.ps1
```

Запустить backend:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Перейти во frontend:

```powershell
cd frontend_react
```

Запустить frontend:

```powershell
npm.cmd run dev
```

Собрать frontend:

```powershell
npm.cmd run build
```

Проверить frontend lint:

```powershell
npm.cmd run lint
```

## Короткая шпаргалка запуска

Если все уже установлено и зависимости уже скачаны, каждый раз запуск выглядит так.

Терминал 1, backend:

```powershell
cd C:\Users\HP\Desktop\САЙТ\2026\NovaCourses-main
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend --reload
```

Терминал 2, frontend:

```powershell
cd C:\Users\HP\Desktop\САЙТ\2026\NovaCourses-main\frontend_react
npm.cmd run dev
```

Открыть в браузере:

```text
http://127.0.0.1:5173/
```

Если ваш проект лежит в другой папке, замените путь `C:\Users\HP\Desktop\NovaCourses-main` на свой.
