@echo off
chcp 65001 >nul
REM start-all.bat - Standardized service startup
REM Following docs/troubleshooting/standardize-stop-scripts.md
REM
REM Pattern: 1) Call kill-all.bat to clean environment -> 2) Verify ports free -> 3) Clear .pids.txt -> 4) Start services

echo === start-all.bat : Standardized service startup ===
setlocal EnableDelayedExpansion

set PID_FILE=.pids.txt
set OLLAMA_PORT=11434
set PROXY_PORT=11435
set SERVER_PORT=3000
set CLIENT_API_PORT=3001
set WEB_UI_PORT=5173
set OLLAMA_MODELS=C:\Users\dev\Desktop\.ollama
set EXIT_CODE=0

REM Generate log names with timestamps
set TIMESTAMP=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set SERVER_LOG=a2a-server-%TIMESTAMP%.log
set CLIENT_API_LOG=client-api-%TIMESTAMP%.log
set WEB_UI_LOG=web-ui-%TIMESTAMP%.log
set AI_LOG=ai-integration-%TIMESTAMP%.log

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
call :wait_port_free %OLLAMA_PORT% 5 || goto :startup_failed

set OLLAMA_PID=
start /b "" cmd /c "set OLLAMA_HOST=0.0.0.0:%OLLAMA_PORT% && set OLLAMA_MODELS=%OLLAMA_MODELS% && set OLLAMA_ORIGINS=* && ollama serve"
powershell -Command "Start-Sleep -Seconds 3"

REM Capture Ollama PID
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%OLLAMA_PORT%" ^| findstr "LISTENING"') do (
    set OLLAMA_PID=%%a
    echo OLLAMA_PID=%%a >> %PID_FILE%
    echo [OK] Ollama started (PID: %%a)
    goto :ollama_done
)
echo [ERROR] Could not determine Ollama PID
:ollama_done

REM ==========================================
REM Step 5: Start ai-integration
REM ==========================================
echo.
echo [Step 5/8] Starting ai-integration on port %PROXY_PORT%...
call :wait_port_free %PROXY_PORT% 5 || goto :startup_failed

start /b "" cmd /c "cd ai-integration && set OLLAMA_HOST=http://localhost:%OLLAMA_PORT% && set OLLAMA_MODELS=%OLLAMA_MODELS% && python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port %PROXY_PORT% ^> %AI_LOG% 2^>^&1"
powershell -Command "Start-Sleep -Seconds 3"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PROXY_PORT%" ^| findstr "LISTENING"') do (
    echo AI_INTEGRATION_PID=%%a >> %PID_FILE%
    echo [OK] ai-integration started (PID: %%a, log: %AI_LOG%)
    goto :ai_done
)
echo [WARN] Could not determine ai-integration PID
:ai_done

REM ==========================================
REM Step 6: Start a2a-server
REM ==========================================
echo.
echo [Step 6/8] Starting a2a-server on port %SERVER_PORT%...
call :wait_port_free %SERVER_PORT% 5 || goto :startup_failed

cd a2a-server
start /b "" cmd /c "npm run dev ^> ..\%SERVER_LOG% 2^>^&1"
cd ..
powershell -Command "Start-Sleep -Seconds 5"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%SERVER_PORT%" ^| findstr "LISTENING"') do (
    echo A2A_SERVER_PID=%%a >> %PID_FILE%
    echo [OK] a2a-server started (PID: %%a, log: %SERVER_LOG%)
    goto :server_done
)
echo [WARN] Could not determine a2a-server PID
:server_done

REM ==========================================
REM Step 7: Start client-api
REM ==========================================
echo.
echo [Step 7/8] Starting client-api on port %CLIENT_API_PORT%...
call :wait_port_free %CLIENT_API_PORT% 5 || goto :startup_failed

cd a2a-client\packages\sdk
start /b "" cmd /c "npm run dev ^> ..\..\..\%CLIENT_API_LOG% 2^>^&1"
cd ..\..\..
powershell -Command "Start-Sleep -Seconds 5"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%CLIENT_API_PORT%" ^| findstr "LISTENING"') do (
    echo CLIENT_API_PID=%%a >> %PID_FILE%
    echo [OK] client-api started (PID: %%a, log: %CLIENT_API_LOG%)
    goto :client_api_done
)
echo [WARN] Could not determine client-api PID
:client_api_done

REM ==========================================
REM Step 8: Start web-ui
REM ==========================================
echo.
echo [Step 8/8] Starting web-ui on port %WEB_UI_PORT%...
call :wait_port_free %WEB_UI_PORT% 5 || goto :startup_failed

cd a2a-client
start /b "" cmd /c "npm run dev ^> ..\%WEB_UI_LOG% 2^>^&1"
cd ..
powershell -Command "Start-Sleep -Seconds 5"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%WEB_UI_PORT%" ^| findstr "LISTENING"') do (
    echo WEB_UI_PID=%%a >> %PID_FILE%
    echo [OK] web-ui started (PID: %%a, log: %WEB_UI_LOG%)
    goto :web_ui_done
)
echo [WARN] Could not determine web-ui PID
:web_ui_done

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
