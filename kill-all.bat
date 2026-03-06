@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

set PID_FILE=.pids.txt
set EXIT_CODE=0
set FAILED_SVC=

echo === kill-all.bat : Dual-verification process termination ===

REM Load PIDs
echo.
echo [INIT] Loading PIDs from %PID_FILE%...
if exist %PID_FILE% (
    for /f "tokens=1,2 delims==" %%a in (%PID_FILE%) do (
        set "PID_%%a=%%b"
        echo   Loaded: %%a = %%b
    )
) else (
    echo [INIT] %PID_FILE% not found
)

REM Phase 1: Kill by port
echo.
echo === Phase 1: Kill by port ===
call :p1 "Ollama" "11434"
call :p1 "ai-integration" "11435"
call :p1 "a2a-server" "3000"
call :p1 "client-api" "3001"
call :p1 "web-ui" "5173"

REM Phase 2: Verify ports
echo.
echo === Phase 2: Verify ports are free ===
call :p2 "Ollama" "11434"
call :p2 "ai-integration" "11435"
call :p2 "a2a-server" "3000"
call :p2 "client-api" "3001"
call :p2 "web-ui" "5173"

REM Phase 3: Kill by PID/name
echo.
echo === Phase 3: Kill by PID and process name ===
call :p3 "Ollama" "OLLAMA_PID" "ollama.exe" ""
call :p3 "ai-integration" "AI_INTEGRATION_PID" "python.exe" "uvicorn.exe"
call :p3 "a2a-server" "A2A_SERVER_PID" "node.exe" ""
call :p3 "client-api" "CLIENT_API_PID" "node.exe" ""
call :p3 "web-ui" "WEB_UI_PID" "node.exe" ""

REM Phase 4: Kill wrappers
echo.
echo === Phase 4: Kill common wrapper processes ===
for %%e in (node.exe npm.exe npx.exe tsx.exe) do (
    tasklist /FI "IMAGENAME eq %%e" 2>nul | findstr /I "%%e" >nul
    if not errorlevel 1 (
        taskkill /F /IM %%e >nul 2>&1
        echo   [OK] Killed %%e
    )
)
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" 2>$null | Where-Object { $_.CommandLine -match 'tsx|npm|uvicorn|ollama' } | ForEach-Object { Write-Host ('   [OK] Killed cmd.exe wrapper PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force 2>$null }" 2>nul

REM Phase 5: Final check
echo.
echo === Phase 5: Verify processes gone and cleanup ===
ping -n 2 -w 500 localhost >nul
call :p5 "Ollama" "11434"
call :p5 "ai-integration" "11435"
call :p5 "a2a-server" "3000"
call :p5 "client-api" "3001"
call :p5 "web-ui" "5173"

REM Cleanup
echo.
if %EXIT_CODE% equ 0 (
    if exist %PID_FILE% (del %PID_FILE% && echo [OK] Deleted %PID_FILE%) else (echo [INFO] %PID_FILE% not present)
) else (
    echo [WARN] Some services failed - %PID_FILE% preserved
    echo Failed: %FAILED_SVC%
)

echo.
echo === Termination complete (exit code: %EXIT_CODE%) ===
exit /b %EXIT_CODE%

REM Subroutines
:p1
set "PORT_FOUND="
echo.
echo [1] %~1 (port %~2)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~2" ^| findstr "LISTENING"') do (
    set PORT_FOUND=1
    echo   Port %~2 occupied by PID %%p - killing...
    taskkill /F /PID %%p >nul 2>&1 && echo   [OK] Killed PID %%p || echo   [ERROR] Failed to kill PID %%p
)
if not defined PORT_FOUND echo   [OK] Port %~2 free
goto :eof

:p2
set ATTEMPTS=0
:p2_loop
set "PORT_BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~2" ^| findstr "LISTENING"') do set PORT_BUSY=1 && set PORT_PID=%%p
if defined PORT_BUSY (
    set /a ATTEMPTS+=1
    if !ATTEMPTS! geq 10 (
        echo   [ERROR] %~1 port %~2 still occupied after 10 attempts
        set EXIT_CODE=1
        set "FAILED_SVC=!FAILED_SVC!,%~1"
        goto :eof
    )
    taskkill /F /PID !PORT_PID! >nul 2>&1
    ping -n 1 -w 500 localhost >nul
    goto :p2_loop
)
echo   [OK] %~1 port %~2 verified free
goto :eof

:p3
echo.
echo [3] %~1
if defined PID_%~2 (
    echo   Killing by PID !PID_%~2!...
    tasklist /FI "PID eq !PID_%~2!" 2>nul | findstr "!PID_%~2!" >nul && (
        taskkill /F /PID !PID_%~2! >nul 2>&1 && echo   [OK] Killed PID !PID_%~2! || echo   [WARN] Could not kill PID !PID_%~2!
    ) || echo   [OK] PID !PID_%~2! not running
) else echo   No PID file entry
if not "%~3"=="" (
    tasklist /FI "IMAGENAME eq %~3" 2>nul | findstr /I "%~3" >nul && taskkill /F /IM %~3 >nul 2>&1 && echo   [OK] Killed %~3
)
if not "%~4"=="" (
    tasklist /FI "IMAGENAME eq %~4" 2>nul | findstr /I "%~4" >nul && taskkill /F /IM %~4 >nul 2>&1 && echo   [OK] Killed %~4
)
goto :eof

:p5
set "STILL="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~2" ^| findstr "LISTENING"') do set STILL=1
if defined STILL (
    echo   [ERROR] %~1 still on port %~2
    set EXIT_CODE=1
    set "FAILED_SVC=!FAILED_SVC!,%~1-port"
)
goto :eof
