@echo off
setlocal

set "ROOT=%~dp0"

echo Starting NovaCode backend and Vite dev server...

start "NovaCode Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "$root = '%ROOT%'; Set-Location -LiteralPath (Join-Path $root 'backend'); if (Test-Path 'venv\Scripts\Activate.ps1') { . 'venv\Scripts\Activate.ps1' } elseif (Test-Path (Join-Path $root '.venv\Scripts\Activate.ps1')) { . (Join-Path $root '.venv\Scripts\Activate.ps1') } else { Write-Host 'Python venv was not found. Continuing with system Python.' }; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

start "NovaCode Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "$root = '%ROOT%'; Set-Location -LiteralPath (Join-Path $root 'frontend_react'); npm run dev -- --host 127.0.0.1"

timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:5173/"

echo.
echo Development mode opened http://127.0.0.1:5173/ for Vite hot reload.
echo For the single backend URL, use start.bat and open http://127.0.0.1:8000/
