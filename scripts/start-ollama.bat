@echo off
chcp 65001 >nul
REM Start Ollama service only

set OLLAMA_PORT=11434
set OLLAMA_MODELS=C:\Users\dev\Desktop\.ollama
set PID_FILE=.pids.txt

echo [Ollama] Starting on port %OLLAMA_PORT%...

REM Check if already running
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%OLLAMA_PORT%" ^| findstr "LISTENING"') do (
    echo [Ollama] Already running on PID %%p
    echo OLLAMA_PID=%%p >> %PID_FILE%
    exit /b 0
)

REM Start Ollama
start /b "" cmd /c "set OLLAMA_HOST=0.0.0.0:%OLLAMA_PORT% && set OLLAMA_MODELS=%OLLAMA_MODELS% && set OLLAMA_ORIGINS=* && ollama serve"
powershell -Command "Start-Sleep -Seconds 3"

REM Capture PID
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%OLLAMA_PORT%" ^| findstr "LISTENING"') do (
    echo OLLAMA_PID=%%p >> %PID_FILE%
    echo [Ollama] Started on PID %%p
    exit /b 0
)

echo [Ollama] Failed to start
echo OLLAMA_PID= >> %PID_FILE%
exit /b 1
