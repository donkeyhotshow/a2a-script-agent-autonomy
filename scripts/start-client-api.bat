@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe: cmd /c "%~f0"
    exit /b 1
)
REM Start client-api service only
cd /d "%~dp0.."

set CLIENT_API_PORT=3001
set PID_FILE=.pids.txt

echo [Client-API] Starting on port %CLIENT_API_PORT%...

REM Kill any existing process on this port
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%CLIENT_API_PORT%" ^| findstr "LISTENING"') do (
    echo [Client-API] Killing existing process on PID %%A
    taskkill /PID %%A /F >nul 2>&1
    powershell -Command "Start-Sleep -Seconds 2"
)

REM Create logs directory if it doesn't exist (required for redirect)
if not exist "a2a-client\packages\sdk\logs" mkdir "a2a-client\packages\sdk\logs"

REM Start client-api - use /d to set working directory explicitly
start "client-api" /d "a2a-client\packages\sdk" cmd /c "npx cross-env PORT=3001 WS_PORT=3002 DEFAULT_SYNC_MODE=1 SKIP_AUTH=1 tsx watch src/server/index.ts ^> ..\..\logs\client-api.log 2^>^&1"

powershell -Command "Start-Sleep -Seconds 15"

REM Capture PID
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%CLIENT_API_PORT%" ^| findstr "LISTENING"') do (
    (echo CLIENT_API_PID=%%A)>>"%PID_FILE%"
    echo [Client-API] Started on PID %%A
    exit /b 0
)

echo [Client-API] Failed to start
(echo CLIENT_API_PID=)>>"%PID_FILE%"
exit /b 1
