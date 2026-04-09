@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe: cmd /c "%~f0"
    exit /b 1
)
REM Start web-ui service only
REM Anchor to repo root so a2a-client\logs is never doubled when cwd is wrong.
cd /d "%~dp0.."

set WEB_PORT=5173
set PID_FILE=.pids.txt

echo [Web-UI] Starting on port %WEB_PORT%...

REM Check if already running
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%WEB_PORT%" ^| findstr "LISTENING"') do (
    echo [Web-UI] Already running on PID %%A
    (echo WEB_UI_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

REM Create logs directory if it doesn't exist (required for redirect)
if not exist "a2a-client\logs" mkdir "a2a-client\logs"

REM Start web-ui - use /d to set working directory explicitly
start "web-ui" /d "a2a-client" cmd /c "npx vite --port %WEB_PORT% ^> logs\web-ui.log 2^>^&1"

powershell -Command "Start-Sleep -Seconds 15"

REM Capture PID
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%WEB_PORT%" ^| findstr "LISTENING"') do (
    (echo WEB_UI_PID=%%A)>>"%PID_FILE%"
    echo [Web-UI] Started on PID %%A
    exit /b 0
)

echo [Web-UI] Failed to start
(echo WEB_UI_PID=)>>"%PID_FILE%"
exit /b 1
