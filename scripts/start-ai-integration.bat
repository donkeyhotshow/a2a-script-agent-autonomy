@echo off
chcp 65001 >nul
REM Start ai-integration service only

set PROXY_PORT=11435
set OLLAMA_PORT=11434
set OLLAMA_MODELS=C:\Users\dev\Desktop\.ollama
set PID_FILE=.pids.txt

echo [AI-Integration] Starting on port %PROXY_PORT%...

REM Check if already running
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo [AI-Integration] Already running on PID %%p
    echo AI_INTEGRATION_PID=%%p >> %PID_FILE%
    exit /b 0
)

REM Start ai-integration
cd ai-integration
start "ai-integration" cmd /c "set OLLAMA_HOST=http://localhost:%OLLAMA_PORT% && set OLLAMA_MODELS=%OLLAMA_MODELS% && set FORWARD_TIMEOUT_SECONDS=0 && python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port %PROXY_PORT%"
cd ..

powershell -Command "Start-Sleep -Seconds 5"

REM Capture PID
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo AI_INTEGRATION_PID=%%p >> %PID_FILE%
    echo [AI-Integration] Started on PID %%p
    exit /b 0
)

echo [AI-Integration] Failed to start
echo AI_INTEGRATION_PID= >> %PID_FILE%
exit /b 1
