@echo off
REM Unified starter for a2a-script-agent
REM Kills processes before starting, saves PIDs to manager file

echo === Unified Starter for a2a-script-agent ===
echo.

set PID_FILE=.pids.txt
set OLLAMA_PORT=11435
set PROXY_PORT=11434
set SERVER_LOG=a2a-server-%RANDOM%.log
set AI_LOG=ai-integration-%RANDOM%.log

REM ==========================================
REM Step 1: Kill existing processes first
REM ==========================================
echo [1/5] Killing existing processes...
call kill-all.bat
powershell -Command "Start-Sleep -Seconds 2"

REM ==========================================
REM Step 2: Clear PID file
REM ==========================================
echo [2/5] Clearing PID file...
if exist %PID_FILE% del %PID_FILE%
echo. > %PID_FILE%

REM ==========================================
REM Step 3: Start Ollama in background
REM ==========================================
echo [3/5] Starting Ollama...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%OLLAMA_PORT%" ^| findstr "LISTENING"') do (
    echo [Port cleanup] Killing PID %%p listening on %OLLAMA_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
powershell -Command "Start-Sleep -Seconds 1"
call :wait_port_free %OLLAMA_PORT% || goto :startup_failed
start /b "" cmd /c "set OLLAMA_HOST=0.0.0.0:%OLLAMA_PORT% && ollama serve"
powershell -Command "Start-Sleep -Seconds 3"
echo Ollama started

REM Get Ollama PID
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%OLLAMA_PORT%" ^| findstr "LISTENING"') do (
    echo OLLAMA_PID=%%a >> %PID_FILE%
    goto :ollama_done
)
:ollama_done

REM ==========================================
REM Step 4: Start ai-integration in background
REM ==========================================
echo [4/5] Starting ai-integration...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo [Port cleanup] Killing PID %%p listening on %PROXY_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
powershell -Command "Start-Sleep -Seconds 1"
call :wait_port_free %PROXY_PORT% || goto :startup_failed
start /b "" cmd /c "cd ai-integration && set OLLAMA_HOST=http://localhost:%OLLAMA_PORT% && python -m uvicorn proxy.routes:app --host 0.0.0.0 --port %PROXY_PORT% > %AI_LOG% 2>&1"
powershell -Command "Start-Sleep -Seconds 3"
echo ai-integration log: %AI_LOG%

REM Get uvicorn PID
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo AI_INTEGRATION_PID=%%a >> %PID_FILE%
    goto :ai_done
)
:ai_done

REM ==========================================
REM Step 5: Start a2a-server in background
REM ==========================================
echo [5/5] Starting a2a-server...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [Port cleanup] Killing PID %%p listening on 3000...
    taskkill /F /PID %%p >nul 2>&1
)
powershell -Command "Start-Sleep -Seconds 1"
taskkill /F /IM node.exe >nul 2>&1
call :wait_port_free 3000 || goto :startup_failed
start /b "" cmd /c "cd a2a-server && npm run dev > %SERVER_LOG% 2>&1"
powershell -Command "Start-Sleep -Seconds 5"
echo a2a-server log: %SERVER_LOG%

REM Get a2a-server PID (node.exe on port 3000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo A2A_SERVER_PID=%%a >> %PID_FILE%
    goto :a2a_done
)
:a2a_done

echo.
echo === All services started successfully! ===
echo.
echo PID file: %PID_FILE%
echo.

REM Show what's running
echo Running processes:
echo   - Ollama (port %OLLAMA_PORT%)
echo   - ai-integration (port %PROXY_PORT%)
echo   - a2a-server (port 3000)
echo.

REM Read and display PIDs
echo Saved PIDs:
type %PID_FILE%
echo.

echo To stop all services, run: kill-all.bat
goto :eof

:startup_failed
echo.
echo ERROR: Could not free required port(s); aborting startup.
exit /b 1

:wait_port_free
setlocal EnableDelayedExpansion
set "PORT=%~1"
set /a ATTEMPTS=0
:wait_port_loop
set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    taskkill /F /PID %%p >nul 2>&1
)
if defined FOUND (
    set /a ATTEMPTS+=1
    if !ATTEMPTS! geq 20 (
        echo ERROR: Port %PORT% still busy after !ATTEMPTS! attempts.
        endlocal
        exit /b 1
    )
    powershell -Command "Start-Sleep -Seconds 1"
    goto wait_port_loop
)
endlocal
exit /b 0
