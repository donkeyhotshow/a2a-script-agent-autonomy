@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe. Double-click this file or: cmd /c "%~f0"
    exit /b 1
)
chcp 65001 >nul
setlocal EnableDelayedExpansion
goto :__MAIN__

REM ---------- subroutines (must appear before main ends; CRLF line endings required) ----------

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

:verify_and_capture_pid
setlocal
set PORT=%~1
set VAR_NAME=%~2
set SVC_NAME=%~3

findstr /B "%VAR_NAME%=" %PID_FILE% >nul 2>&1
if %errorlevel% equ 0 (
    endlocal
    exit /b 0
)

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

REM ---------- main ----------

:__MAIN__
cd /d "%~dp0"
REM Defensive check - services use subproject node_modules only
if exist node_modules (
    echo [WARN] Root node_modules found ^- deleting it ^(not used by any service^)
    rmdir /s /q node_modules 2>nul
    echo [OK] Root node_modules removed
)
echo === start-all.bat : Standardized service startup ===

set PID_FILE=.pids.txt
set PROXY_PORT=11434
set SERVER_PORT=3000
set CLIENT_API_PORT=3001
set WEB_PORT=5173
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
call :verify_port_free %PROXY_PORT% 10
if errorlevel 1 (
    echo   [WARN] Port %PROXY_PORT% occupied; continuing ^(a2a-ai-hub start handles already-running instance^)
) else (
    echo   [OK] Port %PROXY_PORT% verified free
)
for %%p in (%SERVER_PORT% %CLIENT_API_PORT% %WEB_PORT%) do (
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
REM Step 4: Start ai-integration
REM ==========================================
echo.
echo [Step 4/8] Starting a2a-ai-hub on port %PROXY_PORT%...
call runbook\scripts\start-a2a-ai-hub.bat
if errorlevel 1 set EXIT_CODE=1
:a2a_ai_hub_done

REM ==========================================
REM Step 4b: Promise queue daemon (PROMISE_DAEMON_ONLY default on — drains ?promise=1 on hub)
REM ==========================================
echo.
echo [Step 4b/8] Starting promise-queue-daemon (a2a-ai-hub)...
call runbook\scripts\start-promise-queue-daemon.bat
if errorlevel 1 set EXIT_CODE=1

REM ==========================================
REM Step 5: Start a2a-server
REM ==========================================
echo.
echo [Step 5/8] Starting a2a-server on port %SERVER_PORT%...
call runbook\scripts\start-a2a-server.bat
if errorlevel 1 set EXIT_CODE=1
:server_done

REM ==========================================
REM Step 6: Start client-api
REM ==========================================
echo.
echo [Step 6/8] Starting client-api on port %CLIENT_API_PORT%...
call runbook\scripts\start-client-api.bat
if errorlevel 1 set EXIT_CODE=1
:client_api_done

REM ==========================================
REM Step 7: Start web-ui
REM ==========================================
echo.
echo [Step 7/8] Starting web-ui on port %WEB_PORT%...
call runbook\scripts\start-web-ui.bat
if errorlevel 1 set EXIT_CODE=1
:web_ui_done

REM ==========================================
REM Final verification - Check all PIDs are captured
REM ==========================================
echo.
echo [Final Check] Verifying all PIDs captured...
set VERIFY_FAIL=0
call :verify_and_capture_pid %PROXY_PORT% A2A_AI_HUB_PID "a2a-ai-hub"
if errorlevel 1 set VERIFY_FAIL=1
call :verify_and_capture_pid %SERVER_PORT% A2A_SERVER_PID "a2a-server"
if errorlevel 1 set VERIFY_FAIL=1
call :verify_and_capture_pid %CLIENT_API_PORT% CLIENT_API_PID "client-api"
if errorlevel 1 set VERIFY_FAIL=1
call :verify_and_capture_pid %WEB_PORT% WEB_UI_PID "web-ui"
if errorlevel 1 set VERIFY_FAIL=1
if %VERIFY_FAIL% neq 0 set EXIT_CODE=1

REM ==========================================
REM Summary
REM ==========================================
echo.
echo --- Log files (for services that redirect stdout^) ---
echo   a2a-server:     %CD%\a2a-server\logs\server.log
echo   web-ui:         %CD%\a2a-client\logs\web-ui.log
echo   client-api:     %CD%\a2a-client\logs\client-api.log
echo   a2a-ai-hub: console window titled "a2a-ai-hub" (no default file log^)
echo.

if %EXIT_CODE% neq 0 (
    echo === start-all.bat finished WITH ERRORS ===
    echo Fix the failing step, then check the log paths above or the service windows.
    echo.
    echo Saved PIDs in %PID_FILE% (may be incomplete^):
    if exist %PID_FILE% type %PID_FILE%
    echo.
    echo To stop all services: kill-all.bat
    exit /b 1
)

echo === All services started successfully ===
echo.
echo Services:
echo   - a2a-ai-hub: http://localhost:%PROXY_PORT% (API proxy)
echo   - promise-queue-daemon: separate window (drains hub promise queue when PROMISE_DAEMON_ONLY is on)
echo   - a2a-server:   http://localhost:%SERVER_PORT%
echo   - client-api:   http://localhost:%CLIENT_API_PORT%
echo   - web-ui:       http://localhost:%WEB_PORT%
echo.
echo Saved PIDs in %PID_FILE%:
type %PID_FILE%
echo.
echo To stop all services, run: kill-all.bat
echo.
echo Stack verification is manual: see PAPA-MAMA.md (Papa = direct, Mama = indirect^).
echo   Example: powershell -ExecutionPolicy Bypass -File ".\tests\direct-tests\run-post-start-all.ps1"
echo.
echo This script exits now; services keep running in their own windows.
exit /b 0
