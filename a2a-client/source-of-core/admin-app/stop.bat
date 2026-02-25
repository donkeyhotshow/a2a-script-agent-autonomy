@echo off
cd /d "%~dp0"

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Find and stop the Node.js process for admin-app
echo Stopping admin-app... >> logs\admin-app-stop.log
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo list ^| find "PID:"') do (
    taskkill /F /PID %%a >> logs\admin-app-stop.log 2>&1
)

echo Admin app stopped. Check logs\admin-app-stop.log for details. 