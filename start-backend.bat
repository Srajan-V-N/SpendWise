@echo off
cd /d "%~dp0backend"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting SpendWise backend on http://localhost:5000
echo Press Ctrl+C to stop.
echo.

set FLASK_APP=app.py
set FLASK_ENV=development
set FLASK_DEBUG=1

python app.py
