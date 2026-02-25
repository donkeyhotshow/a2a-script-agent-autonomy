@echo off
cd /d "%~dp0"

REM Clear the log file
echo > logs\admin-app-start.log

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Load environment variables
if exist ".env" (
    for /f "tokens=*" %%a in (.env) do set %%a
)

REM Start the application and log output
echo Starting admin-app... >> logs\admin-app-start.log
start /B "" npm run dev >> logs\admin-app-start.log 2>&1

echo Admin app started. Check logs\admin-app-start.log for details. 