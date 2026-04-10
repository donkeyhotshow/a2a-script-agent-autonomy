@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe: cmd /c "%~f0"
    exit /b 1
)
cd /d "%~dp0.."

set PROXY_PORT=11434
set PID_FILE=.pids.txt

echo [AI-Integration-TS] Starting on port %PROXY_PORT%...

for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo [AI-Integration-TS] Already running on PID %%A
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

if not exist "ai-integration-ts\node_modules" (
    echo [AI-Integration-TS] Installing dependencies...
    call npm --prefix ai-integration-ts install
    if errorlevel 1 exit /b 1
)

start "ai-integration-ts" /d "ai-integration-ts" cmd /c "set PROXY_PORT=%PROXY_PORT% && npm run dev"

powershell -Command "Start-Sleep -Seconds 4"
set /a AI_WAIT=0
:ai_wait_listen
set /a AI_WAIT+=1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    echo [AI-Integration-TS] Started on PID %%A
    exit /b 0
)
if %AI_WAIT% GEQ 20 goto ai_listen_timeout
powershell -Command "Start-Sleep -Seconds 2"
goto ai_wait_listen

:ai_listen_timeout
echo [AI-Integration-TS] Failed to start
(echo AI_INTEGRATION_PID=)>>"%PID_FILE%"
exit /b 1
