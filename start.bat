@echo off
setlocal

set "ROOT=%~dp0"

cd /d "%ROOT%"

if exist "backend\venv\Scripts\activate.bat" (
  call "backend\venv\Scripts\activate.bat"
) else if exist ".venv\Scripts\activate.bat" (
  call ".venv\Scripts\activate.bat"
) else (
  echo Python venv was not found. Continuing with system Python.
)

cd /d "%ROOT%backend" || exit /b 1
echo.
echo NovaCode is starting on http://127.0.0.1:8000/
echo Backend will auto-build frontend_react/dist when needed.
echo.
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
