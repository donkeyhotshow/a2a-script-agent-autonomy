@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe: cmd /c "%~f0"
    exit /b 1
)
REM Starts local HTTP LLM on LOCAL_LLM_PORT using LOCAL_LLM_SERVE_CMD (full cmd.exe line).

set LOCAL_LLM_PORT=11435
set PID_FILE=.pids.txt

if not defined LOCAL_LLM_SERVE_CMD (
    echo [local-llm] LOCAL_LLM_SERVE_CMD is not set. Example: set LOCAL_LLM_SERVE_CMD=your.exe serve
    exit /b 1
)

echo [local-llm] Starting on port %LOCAL_LLM_PORT%...

for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%LOCAL_LLM_PORT%" ^| findstr "LISTENING"') do (
    echo [local-llm] Already running on PID %%A
    (echo LOCAL_LLM_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

start "" cmd /c "set LOCAL_LLM_UPSTREAM_URL=0.0.0.0:%LOCAL_LLM_PORT% && set LOCAL_LLM_MODELS_DIR=%LOCAL_LLM_MODELS_DIR% && set LOCAL_LLM_WEB_ORIGINS=* && %LOCAL_LLM_SERVE_CMD%"
powershell -Command "Start-Sleep -Seconds 3"

for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%LOCAL_LLM_PORT%" ^| findstr "LISTENING"') do (
    (echo LOCAL_LLM_PID=%%A)>>"%PID_FILE%"
    echo [local-llm] Started on PID %%A
    exit /b 0
)

echo [local-llm] Failed to start
(echo LOCAL_LLM_PID=)>>"%PID_FILE%"
exit /b 1
