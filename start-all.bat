@echo off
chcp 65001 >nul
REM start-all.bat - Standardized service startup
REM Following docs/troubleshooting/standardize-stop-scripts.md
REM
REM Pattern: 1) Call kill-all.bat to clean environment -> 2) Verify ports free -> 3) Clear .pids.txt -> 4) Start services

echo === start-all.bat : Standardized service startup ===
setlocal EnableDelayedExpansion

set PID_FILE=.pids.txt
set OLLAMA_PORT=11435
set PROXY_PORT=11434
set SERVER_PORT=3000
set CLIENT_API_PORT=3001
set WEB_UI_PORT=5173
set OLLAMA_MODELS=C:\Users\dev\Desktop\.ollama
set EXIT_CODE=0

REM Logs are overwritten on each start (fixed names in project logs folders)

REM ==========================================
REM Step 1: Kill existing processes first
REM ==========================================
echo.
echo [Step 1/8] Cleaning environment with kill-all.bat...
call kill-all.bat
if errorlevel 1 (
    echo [WARN] kill-all.bat reported issues, continuing with caution...
)
powershell -Command "Start-Sleep -Seconds 2"

REM ==========================================
REM Step 2: Verify all ports are free
REM ==========================================
echo.
echo [Step 2/8] Verifying all ports are free...
set PORTS_OK=1
for %%p in (%OLLAMA_PORT% %PROXY_PORT% %SERVER_PORT% %CLIENT_API_PORT% %WEB_UI_PORT%) do (
    call :verify_port_free %%p 10
    if errorlevel 1 (
        echo   [ERROR] Port %%p still occupied
        set PORTS_OK=0
    ) else (
        echo   [OK] Port %%p verified free
    )
)
if %PORTS_OK% equ 0 (
    echo [FATAL] Not all ports could be freed. Aborting startup.
    exit /b 1
)

REM ==========================================
REM Step 3: Clear PID file
REM ==========================================
echo.
echo [Step 3/8] Clearing PID file...
if exist %PID_FILE% del %PID_FILE%
echo. > %PID_FILE%
echo [OK] %PID_FILE% reset

REM ==========================================
REM Step 4: Start Ollama
REM ==========================================
echo.
echo [Step 4/8] Starting Ollama on port %OLLAMA_PORT%...
call scripts\start-ollama.bat 2>&1
:ollama_done

REM ==========================================
REM Step 5: Start ai-integration
REM ==========================================
echo.
echo [Step 5/8] Starting ai-integration on port %PROXY_PORT%...
call scripts\start-ai-integration.bat 2>&1
:ai_done

REM ==========================================
REM Step 6: Start a2a-server
REM ==========================================
echo.
echo [Step 6/8] Starting a2a-server on port %SERVER_PORT%...
call scripts\start-a2a-server.bat 2>&1
:server_done

REM ==========================================
REM Step 7: Start client-api
REM ==========================================
echo.
echo [Step 7/8] Starting client-api on port %CLIENT_API_PORT%...
call scripts\start-client-api.bat 2>&1
:client_api_done

REM ==========================================
REM Step 8: Start web-ui
REM ==========================================
echo.
echo [Step 8/8] Starting web-ui on port %WEB_UI_PORT%...
call scripts\start-web-ui.bat 2>&1
:web_ui_done

REM ==========================================
REM Final verification - Check all PIDs are captured
REM ==========================================
echo.
echo [Final Check] Verifying all PIDs captured...
call :verify_and_capture_pid %OLLAMA_PORT% OLLAMA_PID "Ollama"
call :verify_and_capture_pid %PROXY_PORT% AI_INTEGRATION_PID "ai-integration"
call :verify_and_capture_pid %SERVER_PORT% A2A_SERVER_PID "a2a-server"
call :verify_and_capture_pid %CLIENT_API_PORT% CLIENT_API_PID "client-api"
call :verify_and_capture_pid %WEB_UI_PORT% WEB_UI_PID "web-ui"

REM ==========================================
REM Summary
REM ==========================================
echo.
echo === All services started successfully ===
echo.
echo Services:
echo   - Ollama:       http://localhost:%OLLAMA_PORT%
echo   - ai-integration: http://localhost:%PROXY_PORT% (API proxy)
echo   - a2a-server:   http://localhost:%SERVER_PORT%
echo   - client-api:   http://localhost:%CLIENT_API_PORT%
echo   - web-ui:       http://localhost:%WEB_UI_PORT%
echo.
echo Saved PIDs in %PID_FILE%:
type %PID_FILE%
echo.
echo To stop all services, run: kill-all.bat
goto :eof

REM ==========================================
REM Function: wait_for_pid - Polls for process to appear on port
REM %1 = port number
REM %2 = PID variable name (for .pids.txt)
REM %3 = service name (for display)
REM %4 = log path (for display)
REM %5 = max attempts (default 10)
REM %6 = sleep ms between attempts (default 500)
REM ==========================================
:wait_for_pid
setlocal EnableDelayedExpansion
set PORT=%~1
set VAR_NAME=%~2
set SVC_NAME=%~3
set LOG_PATH=%~4
set MAX_ATTEMPTS=%~5
if "%MAX_ATTEMPTS%"=="" set MAX_ATTEMPTS=10
set SLEEP_MS=%~6
if "%SLEEP_MS%"=="" set SLEEP_MS=500
set ATTEMPTS=0

:pid_poll_loop
setlocal EnableDelayedExpansion
set FOUND_PID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    if not defined FOUND_PID (
        set FOUND_PID=%%p
        echo %VAR_NAME%=%%p >> %PID_FILE%
        echo [OK] %SVC_NAME% started (PID: %%p, log: %LOG_PATH%)
    )
)
if defined FOUND_PID (
    endlocal
    exit /b 0
)
endlocal
set /a ATTEMPTS+=1
if !ATTEMPTS! geq %MAX_ATTEMPTS% (
    echo [WARN] Could not determine %SVC_NAME% PID after %MAX_ATTEMPTS% attempts
    endlocal
    exit /b 1
)
powershell -Command "Start-Sleep -Milliseconds %SLEEP_MS%"
goto pid_poll_loop

REM ==========================================
REM Function: verify_and_capture_pid - Final check for missing PIDs
REM %1 = port number
REM %2 = PID variable name
REM %3 = service name
REM ==========================================
:verify_and_capture_pid
setlocal
set PORT=%~1
set VAR_NAME=%~2
set SVC_NAME=%~3

REM Check if already in PID file
findstr /B "%VAR_NAME%=" %PID_FILE% >nul 2>&1
if %errorlevel% equ 0 (
    endlocal
    exit /b 0
)

REM Not found - try to capture now
set FOUND_PID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    if not defined FOUND_PID (
        set FOUND_PID=%%p
        echo %VAR_NAME%=%%p >> %PID_FILE%
        echo [CAPTURED] %SVC_NAME% PID: %%p (late capture)
    )
)
if defined FOUND_PID (
    endlocal
    exit /b 0
)
echo [MISSING] %SVC_NAME% - not running on port %PORT%
endlocal
exit /b 1

:startup_failed
echo.
echo [FATAL] Could not free required port(s). Startup aborted.
exit /b 1

:verify_port_free
setlocal
set PORT=%~1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    endlocal
    exit /b 1
)
endlocal
exit /b 0

:wait_port_free
setlocal EnableDelayedExpansion
set PORT=%~1
set MAX_ATTEMPTS=%~2
set ATTEMPTS=0
:wait_port_loop
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
    set /a ATTEMPTS+=1
    if !ATTEMPTS! geq %MAX_ATTEMPTS% (
        endlocal
        exit /b 1
    )
    ping -n 1 -w 500 localhost >nul
    goto wait_port_loop
)
endlocal
exit /b 0
