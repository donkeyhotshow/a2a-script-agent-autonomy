@echo off
chcp 65001 >nul
REM Start web-ui service only

set WEB_UI_PORT=5173
set PID_FILE=.pids.txt

echo [Web-UI] Starting on port %WEB_UI_PORT%...

REM Check if already running
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%WEB_UI_PORT%" ^| findstr "LISTENING"') do (
    echo [Web-UI] Already running on PID %%p
    echo WEB_UI_PID=%%p >> %PID_FILE%
    exit /b 0
)

REM Start web-ui
cd a2a-client
start /b "" cmd /c "npx vite ^> logs\web-ui.log 2^>^&1"
cd ..

powershell -Command "Start-Sleep -Seconds 5"

REM Capture PID
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%WEB_UI_PORT%" ^| findstr "LISTENING"') do (
    echo WEB_UI_PID=%%p >> %PID_FILE%
    echo [Web-UI] Started on PID %%p
    exit /b 0
)

echo [Web-UI] Failed to start
echo WEB_UI_PID= >> %PID_FILE%
exit /b 1
