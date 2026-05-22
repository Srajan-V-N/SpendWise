@echo off
echo Starting SpendWise...
echo.

start "SpendWise Backend" cmd /k "cd /d "%~dp0backend" && (if not exist ".venv" python -m venv .venv) && call .venv\Scripts\activate.bat && pip install -r requirements.txt --quiet && set FLASK_APP=app.py && set FLASK_DEBUG=1 && python app.py"

timeout /t 3 /nobreak >nul

start "SpendWise Frontend" cmd /k "cd /d "%~dp0frontend" && (if not exist "node_modules" npm install) && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
