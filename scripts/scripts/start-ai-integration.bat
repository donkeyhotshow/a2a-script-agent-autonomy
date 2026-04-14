@echo off
setlocal EnableExtensions
REM UTF-8 console is set by start-all.bat; avoid chcp here (LF-only or Git Bash can misparse "chcp" as "cp").
cd /d "%~dp0..\.."

set PROXY_PORT=11434
set PID_FILE=.pids.txt
set HUB_LOG=%CD%\a2a-ai-hub\logs\ai-integration.log

echo [AI-Integration] Starting on port %PROXY_PORT%...

REM Simulation runs require hub env reload; recycle listener if SIMULATION_ENABLED is on.
if /I "%SIMULATION_ENABLED%"=="true" (
    call :sim_recycle_port %PROXY_PORT%
    if errorlevel 1 exit /b 1
)
goto :after_sim_recycle
:sim_recycle_port
set "SR_PORT=%~1"
set /a SIM_KILLALL_DONE=0
echo [AI-Integration] SIMULATION_ENABLED=true: ensuring clean hub port %SR_PORT%...
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%SR_PORT%" ^| findstr "LISTENING"') do (
    echo [AI-Integration] Stopping PID %%A on port %SR_PORT% ^(incl. child tree^)
    taskkill /F /T /PID %%A >nul 2>&1
)
set /a FWAIT=0
:hub_port_wait_free
netstat -ano 2>nul | findstr ":%SR_PORT% " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 goto hub_port_free
set /a FWAIT+=1
if %FWAIT% LSS 30 goto hub_port_wait_sleep
if %SIM_KILLALL_DONE% equ 1 goto hub_port_recycle_failed
set SIM_KILLALL_DONE=1
echo [AI-Integration] Port %SR_PORT% still busy: invoking repo kill-all.bat once...
if exist "%~dp0..\..\kill-all.bat" (
  call "%~dp0..\..\kill-all.bat"
) else (
  echo [AI-Integration] WARN: kill-all.bat not found at "%~dp0..\..\kill-all.bat"
)
set /a FWAIT=0
ping -n 3 127.0.0.1 >nul
goto hub_port_wait_free

:hub_port_recycle_failed
echo [AI-Integration] ERROR: port %SR_PORT% still LISTENING after recycle and kill-all.
exit /b 1

:hub_port_wait_sleep
ping -n 2 127.0.0.1 >nul
goto hub_port_wait_free
:hub_port_free
ping -n 2 127.0.0.1 >nul
exit /b 0
:after_sim_recycle

REM Check if already running (non-simulation: reuse existing hub)
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo [AI-Integration] Already running on PID %%A
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

REM Start ai-integration
cd a2a-ai-hub
python scripts\ensure-providers-config.py
if errorlevel 1 (
    echo [AI-Integration] Missing config/providers.example.json - cannot bootstrap providers.json
    cd ..
    exit /b 1
)
if not defined AI_INTEGRATION_RELOAD set AI_INTEGRATION_RELOAD=1
set UVICORN_RELOAD_FLAG=
if "%AI_INTEGRATION_RELOAD%"=="1" set UVICORN_RELOAD_FLAG=--reload --reload-dir .
if not exist "logs" mkdir "logs" >nul 2>&1
REM Ensure log file exists even if startup fails immediately.
type nul > "%HUB_LOG%" 2>nul
REM Capture stdout/stderr so callers can diagnose failed startup without relying on a separate console window.
REM Use a dedicated wrapper to avoid cmd.exe redirection quoting edge cases.
REM Separate window (no /B): avoids "Input redirection is not supported" when stdout is redirected under some hosts.
start "ai-integration" cmd /c "call scripts\run-uvicorn-logged.cmd %PROXY_PORT% \"%HUB_LOG%\" \"%UVICORN_RELOAD_FLAG%\""
cd ..

REM Uvicorn can take longer than 5s on cold start; poll up to about 40 seconds
ping -n 3 127.0.0.1 >nul
set /a AI_WAIT=0
:ai_wait_listen
set /a AI_WAIT+=1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    (echo AI_INTEGRATION_PID=%%A)>>"%PID_FILE%"
    echo [AI-Integration] Started on PID %%A
    echo [AI-Integration] Log: %HUB_LOG%
    exit /b 0
)
if %AI_WAIT% GEQ 19 goto ai_listen_timeout
ping -n 3 127.0.0.1 >nul
goto ai_wait_listen

:ai_listen_timeout
echo [AI-Integration] Failed to start
echo [AI-Integration] No LISTENING socket on port %PROXY_PORT% after about 40 seconds. Check the ai-integration console window for Python/uvicorn errors.
echo [AI-Integration] Log (last ~50 lines): %HUB_LOG%
if exist "%HUB_LOG%" (
    powershell -NoProfile -Command "Get-Content -Path '%HUB_LOG%' -Tail 50"
) else (
    echo [AI-Integration] Log file not found (was the process started?)
)
(echo AI_INTEGRATION_PID=)>>"%PID_FILE%"
exit /b 1
