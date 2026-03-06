@echo off
chcp 65001 >nul
REM kill-all.bat - Standardized dual-verification process termination
REM Following docs/troubleshooting/standardize-stop-scripts.md
REM
REM Pattern: 1) Kill by port -> 2) Verify port free -> 3) Kill by PID/name -> 4) Verify processes gone -> 5) Clear .pids.txt

echo === kill-all.bat : Dual-verification process termination ===
setlocal EnableDelayedExpansion

set PID_FILE=.pids.txt
set EXIT_CODE=0
set FAILED_SVC=

REM Service definitions: name=port:pidkey:processes
set SVCS[0]=Ollama,11434,OLLAMA_PID,ollama.exe
set SVCS[1]=ai-integration,11435,AI_INTEGRATION_PID,python.exe,uvicorn.exe
set SVCS[2]=a2a-server,3000,A2A_SERVER_PID,node.exe
set SVCS[3]=client-api,3001,CLIENT_API_PID,node.exe
set SVCS[4]=web-ui,5173,WEB_UI_PID,node.exe

REM Load PIDs from file
if exist %PID_FILE% (
    echo.
    echo [INIT] Loading PIDs from %PID_FILE%...
    for /f "tokens=1,2 delims==" %%a in (%PID_FILE%) do (
        set "PID_%%a=%%b"
        echo   Loaded: %%a = %%b
    )
) else (
    echo [INIT] %PID_FILE% not found, proceeding without PID file
)

echo.
echo === Phase 1: Kill by port (find and terminate port listeners) ===

for %%i in (0 1 2 3 4) do (
    for /f "tokens=1-5 delims=," %%a in ("!SVCS[%%i]!") do (
        set SVC_NAME=%%a
        set SVC_PORT=%%b
        set SVC_PIDKEY=%%c
        
        echo.
        echo [1.%%i] Processing !SVC_NAME! (port %%b)...
        
        REM Kill by port - find process listening on port
        set PORT_FOUND=
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%b" ^| findstr "LISTENING"') do (
            set PORT_FOUND=1
            echo   Port %%b occupied by PID %%p - terminating...
            taskkill /F /PID %%p >nul 2>&1
            if errorlevel 1 (
                echo   [ERROR] Failed to kill PID %%p
            ) else (
                echo   [OK] Killed PID %%p
            )
        )
        if not defined PORT_FOUND (
            echo   [OK] Port %%b already free
        )
    )
)

echo.
echo === Phase 2: Verify ports are free ===

for %%i in (0 1 2 3 4) do (
    for /f "tokens=1-2 delims=," %%a in ("!SVCS[%%i]!") do (
        set SVC_NAME=%%a
        set SVC_PORT=%%b
        
        REM Check port is free (multiple attempts)
        set ATTEMPTS=0
        :verify_port_loop_%%i
        set PORT_BUSY=
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%b" ^| findstr "LISTENING"') do (
            set PORT_BUSY=1
            set PORT_PID=%%p
        )
        if defined PORT_BUSY (
            set /a ATTEMPTS+=1
            if !ATTEMPTS! geq 10 (
                echo   [ERROR] !SVC_NAME! port %%b still occupied by PID !PORT_PID! after 10 attempts
                set EXIT_CODE=1
                set FAILED_SVC=!FAILED_SVC!,!SVC_NAME!
                goto continue_port_%%i
            )
            taskkill /F /PID !PORT_PID! >nul 2>&1
            ping -n 1 -w 500 localhost >nul
            goto verify_port_loop_%%i
        ) else (
            echo   [OK] !SVC_NAME! port %%b verified free
        )
        :continue_port_%%i
    )
)

echo.
echo === Phase 3: Kill by PID from file and by process name ===

for %%i in (0 1 2 3 4) do (
    for /f "tokens=1-5 delims=," %%a in ("!SVCS[%%i]!") do (
        set SVC_NAME=%%a
        set SVC_PORT=%%b
        set SVC_PIDKEY=%%c
        set PROC1=%%d
        set PROC2=%%e
        
        REM Kill by PID from file
        if defined PID_%%c (
            echo [3.%%i] Killing !SVC_NAME! by PID !PID_%%c! from file...
            tasklist /FI "PID eq !PID_%%c!" 2>nul | findstr "!PID_%%c!" >nul
            if not errorlevel 1 (
                taskkill /F /PID !PID_%%c! >nul 2>&1
                if errorlevel 1 (
                    echo   [WARN] PID !PID_%%c! could not be killed
                ) else (
                    echo   [OK] Killed PID !PID_%%c!
                )
            ) else (
                echo   [OK] PID !PID_%%c! not running
            )
        ) else (
            echo [3.%%i] No PID file entry for !SVC_NAME!
        )
        
        REM Kill by process name
        if not "%%d"=="" (
            tasklist /FI "IMAGENAME eq %%d" 2>nul | findstr /I "%%d" >nul
            if not errorlevel 1 (
                taskkill /F /IM %%d >nul 2>&1
                echo   [OK] Killed %%d
            )
        )
        if not "%%e"=="" (
            tasklist /FI "IMAGENAME eq %%e" 2>nul | findstr /I "%%e" >nul
            if not errorlevel 1 (
                taskkill /F /IM %%e >nul 2>&1
                echo   [OK] Killed %%e
            )
        )
    )
)

echo.
echo === Phase 4: Kill common wrapper processes ===

for %%e in (node.exe npm.exe npx.exe tsx.exe) do (
    tasklist /FI "IMAGENAME eq %%e" 2>nul | findstr /I "%%e" >nul
    if not errorlevel 1 (
        taskkill /F /IM %%e >nul 2>&1
        echo   [OK] Killed %%e
    )
)

REM Kill cmd wrappers
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" 2>$null | Where-Object { $_.CommandLine -match 'tsx|npm|uvicorn|ollama' } | ForEach-Object { Write-Host ('   [OK] Killed cmd.exe wrapper PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" 2>nul

echo.
echo === Phase 5: Verify processes gone and cleanup ===

ping -n 2 -w 500 localhost >nul

for %%i in (0 1 2 3 4) do (
    for /f "tokens=1-3 delims=," %%a in ("!SVCS[%%i]!") do (
        set SVC_NAME=%%a
        set SVC_PORT=%%b
        
        set STILL_THERE=
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%b" ^| findstr "LISTENING"') do (
            set STILL_THERE=1
        )
        if defined STILL_THERE (
            echo   [ERROR] !SVC_NAME! still has process on port %%b
            set EXIT_CODE=1
            set FAILED_SVC=!FAILED_SVC!,!SVC_NAME!-port
        )
    )
)

REM Only delete .pids.txt if all services terminated cleanly
if %EXIT_CODE% equ 0 (
    if exist %PID_FILE% (
        del %PID_FILE%
        echo [OK] All services terminated - %PID_FILE% deleted
    ) else (
        echo [INFO] %PID_FILE% not present
    )
) else (
    echo [WARN] Some services could not be terminated - %PID_FILE% preserved
    echo Failed: %FAILED_SVC%
)

echo.
echo === Termination complete (exit code: %EXIT_CODE%) ===
exit /b %EXIT_CODE%
