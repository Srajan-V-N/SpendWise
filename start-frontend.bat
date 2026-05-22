@echo off
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
)

echo.
echo Starting SpendWise frontend on http://localhost:5173
echo Press Ctrl+C to stop.
echo.

npm run dev
