@echo off
cd /d "%~dp0"

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo Restarting admin-app... >> logs\admin-app-restart.log

REM Stop the application
call stop.bat >> logs\admin-app-restart.log 2>&1

REM Wait a moment to ensure clean shutdown
timeout /t 2 /nobreak > nul

REM Start the application
call start.bat >> logs\admin-app-restart.log 2>&1

echo Admin app restarted. Check logs\admin-app-restart.log for details. 