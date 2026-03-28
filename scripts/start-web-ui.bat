@echo off
chcp 65001 >nul
REM Start web-ui service only

set WEB_PORT=5173
set PID_FILE=.pids.txt

echo [Web-UI] Starting on port %WEB_PORT%...

REM Check if already running
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%WEB_PORT%" ^| findstr "LISTENING"') do (
    echo [Web-UI] Already running on PID %%p
    echo WEB_UI_PID=%%p >> %PID_FILE%
    exit /b 0
)

REM Create logs directory if it doesn't exist (required for redirect)
if not exist "a2a-client\logs" mkdir "a2a-client\logs"

REM Start web-ui - use /d to set working directory explicitly
start "web-ui" /d "a2a-client" cmd /c "npx vite --port %WEB_PORT% ^> logs\web-ui.log 2^>^&1"

powershell -Command "Start-Sleep -Seconds 15"

REM Capture PID
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%WEB_PORT%" ^| findstr "LISTENING"') do (
    echo WEB_UI_PID=%%p >> %PID_FILE%
    echo [Web-UI] Started on PID %%p
    exit /b 0
)

echo [Web-UI] Failed to start
echo WEB_UI_PID= >> %PID_FILE%
exit /b 1
