@echo off
setlocal EnableExtensions
REM UTF-8 console is set by start-all.bat; avoid chcp here (LF-only or Git Bash can misparse "chcp" as "cp").
cd /d "%~dp0.."

set PROXY_PORT=11434
set PID_FILE=.pids.txt

echo [AI-Integration] Starting on port %PROXY_PORT%...

REM Check if already running
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo [AI-Integration] Already running on PID %%A
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

REM Start ai-integration
cd ai-integration
python scripts\ensure-providers-config.py
if errorlevel 1 (
    echo [AI-Integration] Missing config/providers.example.json - cannot bootstrap providers.json
    cd ..
    exit /b 1
)
if not defined AI_INTEGRATION_RELOAD set AI_INTEGRATION_RELOAD=1
set UVICORN_RELOAD_FLAG=
if "%AI_INTEGRATION_RELOAD%"=="1" set UVICORN_RELOAD_FLAG=--reload --reload-dir .
start "ai-integration" cmd /c "set FORWARD_TIMEOUT_SECONDS=180 && python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port %PROXY_PORT% %UVICORN_RELOAD_FLAG%"
cd ..

REM Uvicorn can take longer than 5s on cold start; poll up to about 40 seconds
powershell -Command "Start-Sleep -Seconds 2"
set /a AI_WAIT=0
:ai_wait_listen
set /a AI_WAIT+=1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    echo [AI-Integration] Started on PID %%A
    exit /b 0
)
if %AI_WAIT% GEQ 19 goto ai_listen_timeout
powershell -Command "Start-Sleep -Seconds 2"
goto ai_wait_listen

:ai_listen_timeout
echo [AI-Integration] Failed to start
echo [AI-Integration] No LISTENING socket on port %PROXY_PORT% after about 40 seconds. Check the ai-integration console window for Python/uvicorn errors.
(echo AI_INTEGRATION_PID=)>>"%PID_FILE%"
exit /b 1
