@echo off
if not defined CMDEXTVERSION (
  echo ERROR: Run from cmd.exe. Example: cmd /c "%~f0"
  exit /b 1
)

chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0..\.."
pushd "%ROOT%" >nul

set "FAIL=0"
set "TMP_DIR=%TEMP%\a2a-smoke-%RANDOM%%RANDOM%"
mkdir "%TMP_DIR%" >nul 2>&1
set "ROOT_ABS=%CD%"
set "HUB_LOG=%ROOT_ABS%\a2a-ai-hub\logs\ai-integration.log"
set "HUB_APP_LOG=%ROOT_ABS%\a2a-ai-hub\logs\a2a-ai-hub.log"

echo === A2A web-dialog smoke (simulation) ===
echo Repo root: %CD%
echo Temp dir:  %TMP_DIR%
echo.

echo --- Stop stack (port-based kill) ---
call "%ROOT%\kill-all.bat"
if errorlevel 1 goto :fail

echo --- Start stack (SIMULATION_ENABLED=true) ---
REM Must block on start-all: child services start in separate windows, but start-all must finish verification first.
set "SIMULATION_ENABLED=true"
set "A2A_START_NONINTERACTIVE=1"
call "%ROOT%\start-all.bat"
if errorlevel 1 goto :fail

echo --- Health hub 11434 (/health) ---
set "HUB_WAIT_MAX=180"
set "HUB_WAIT_I=0"
:hub_wait_listen_loop
set /a HUB_WAIT_I+=1
netstat -ano 2>nul | findstr ":11434 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto :hub_wait_listen_ok
set /a HUB_WAIT_MOD=HUB_WAIT_I-HUB_WAIT_I/10*10
if !HUB_WAIT_MOD! equ 0 echo [..] waiting port 11434 LISTENING - attempt !HUB_WAIT_I! of !HUB_WAIT_MAX!
if !HUB_WAIT_I! geq !HUB_WAIT_MAX! (
  echo [FAIL] Port not listening: 11434
  goto :hub_diag_fail
)
ping -n 2 127.0.0.1 >nul
goto :hub_wait_listen_loop
:hub_wait_listen_ok
call :wait_http "%TMP_DIR%\hub-health.json" "http://127.0.0.1:11434/health" 90 2000
if errorlevel 1 goto :hub_diag_fail
echo --- Validate hub simulation_enabled=true ---
call :ps_assert_hub_sim "%TMP_DIR%\hub-health.json"
if errorlevel 1 goto :fail

echo --- Health server 3000 (/health) ---
call :curl_to "%TMP_DIR%\server-health.json" "http://127.0.0.1:3000/health"
if errorlevel 1 goto :fail

echo --- Health web-ui 5173 (/) ---
call :wait_http "%TMP_DIR%\web-root.html" "http://127.0.0.1:5173/" 30 2000
if errorlevel 1 goto :fail

echo --- Create session (POST /api/a2a/sessions) ---
call :curl_post_to "%TMP_DIR%\create.json" "http://127.0.0.1:5173/api/a2a/sessions" "{}"
if errorlevel 1 goto :fail
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$r=Get-Content -Raw '%TMP_DIR%\create.json' | ConvertFrom-Json; $sid=$null; if($r.session -and $r.session.id){$sid=$r.session.id}; if(-not $sid -and $r.id){$sid=$r.id}; if(-not $sid -and $r.sessionId){$sid=$r.sessionId}; if(-not $sid){ exit 2 }; Write-Output $sid"`) do set "SID=%%i"
if not defined SID (
  echo [FAIL] Could not parse session id from %TMP_DIR%\create.json
  type "%TMP_DIR%\create.json"
  goto :fail
)
echo [OK] SID=%SID%

echo --- First beat (POST /next with top-level task) ---
call :curl_post_to "%TMP_DIR%\next-ack.json" "http://127.0.0.1:5173/api/a2a/sessions/%SID%/next" "{\"task\":\"SIMULATE: hello\"}"
if errorlevel 1 goto :fail

echo --- Poll /async until idle (timeout ~120s) ---
call :poll_async "%SID%" 90 1500
if errorlevel 1 goto :fail

echo --- Hydrate session snapshot (GET /sessions/:id) ---
call :curl_to "%TMP_DIR%\session.json" "http://127.0.0.1:5173/api/a2a/sessions/%SID%"
if errorlevel 1 goto :fail

echo.
echo === PASS ===
goto :cleanup

:fail
set "FAIL=1"
echo.
echo === FAIL ===

:cleanup
echo.
echo [Cleanup] Stopping stack...
call "%ROOT%\kill-all.bat" >nul 2>&1

popd >nul
if "%FAIL%"=="1" exit /b 1
exit /b 0

REM ---------------- helpers ----------------

:curl_to
set "OUT=%~1"
set "URL=%~2"
curl.exe -sS --max-time 30 "%URL%" > "%OUT%"
exit /b %ERRORLEVEL%

:wait_http
setlocal EnableDelayedExpansion
set "OUT=%~1"
set "URL=%~2"
set "MAX=%~3"
if "!MAX!"=="" set "MAX=60"
set "SLEEP_MS=%~4"
if "!SLEEP_MS!"=="" set "SLEEP_MS=2000"
set "I=0"

:wait_http_loop
set /a I+=1
curl.exe -sS --max-time 2 "%URL%" > "%OUT%" 2>nul
if not errorlevel 1 (
  endlocal
  exit /b 0
)
if !I! geq !MAX! (
  echo [FAIL] URL not reachable: !URL!
  endlocal
  exit /b 1
)
call :sleep_ms "!SLEEP_MS!"
goto :wait_http_loop

:curl_post_to
set "OUT=%~1"
set "URL=%~2"
set "BODY=%~3"
curl.exe -sS --max-time 30 -X POST "%URL%" -H "Content-Type: application/json" -d "%BODY%" > "%OUT%"
exit /b %ERRORLEVEL%

:ps_assert_hub_sim
set "FILE=%~1"
powershell -NoProfile -Command ^
  "$j=Get-Content -Raw '%FILE%' | ConvertFrom-Json; if($j.status -ne 'running'){ Write-Host ('[FAIL] hub status=' + $j.status); exit 2 }; if(-not $j.simulation_enabled){ Write-Host '[FAIL] simulation_enabled is not true'; exit 3 }; Write-Host '[OK] hub: running, simulation_enabled=true'; exit 0"
exit /b %ERRORLEVEL%

:poll_async
setlocal EnableDelayedExpansion
set "SID=%~1"
set "MAX=%~2"
set "SLEEP_MS=%~3"
if "!SLEEP_MS!"=="" set "SLEEP_MS=1500"
set "I=0"

:poll_loop
set /a I+=1
curl.exe -sS --max-time 30 "http://127.0.0.1:5173/api/a2a/sessions/%SID%/async" > "%TMP_DIR%\async.json"
if errorlevel 1 (
  echo [WARN] /async request failed (attempt !I!/!MAX!)
  goto :poll_sleep
)

for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$r=Get-Content -Raw '%TMP_DIR%\async.json' | ConvertFrom-Json; if($null -eq $r.asyncPending){ exit 2 }; if($r.asyncPending){ 'pending' } else { 'done' }"`) do set "ASY=%%p"
if "!ASY!"=="done" (
  echo [OK] asyncPending=false
  endlocal
  exit /b 0
)
echo [..] asyncPending=true (attempt !I!/!MAX!)

:poll_sleep
if !I! geq !MAX! (
  echo [FAIL] /async did not settle within timeout.
  type "%TMP_DIR%\async.json"
  endlocal
  exit /b 1
)
call :sleep_ms "!SLEEP_MS!"
goto :poll_loop

:hub_diag_fail
echo --- Diagnostics: port 11434 LISTENING? ---
netstat -ano 2>nul | findstr ":11434 " | findstr "LISTENING"
echo --- Diagnostics: hub log tail (if present) ---
if exist "%HUB_LOG%" (
  powershell -NoProfile -Command "Get-Content -Path '%HUB_LOG%' -Tail 120"
) else (
  echo [WARN] hub log not found at %HUB_LOG%
)
echo --- Diagnostics: hub app log tail (if present) ---
if exist "%HUB_APP_LOG%" (
  powershell -NoProfile -Command "Get-Content -Path '%HUB_APP_LOG%' -Tail 120"
) else (
  echo [WARN] hub app log not found at %HUB_APP_LOG%
)
echo --- Diagnostics: hub /health probes (localhost + 127.0.0.1) ---
curl.exe -sS -D "%TMP_DIR%\hub-headers-localhost.txt" --max-time 5 "http://localhost:11434/health" > "%TMP_DIR%\hub-health-localhost.json" 2>nul
curl.exe -sS -D "%TMP_DIR%\hub-headers-127.txt" --max-time 5 "http://127.0.0.1:11434/health" > "%TMP_DIR%\hub-health-127.json" 2>nul
goto :fail

:sleep_ms
setlocal EnableDelayedExpansion
set "MS=%~1"
if "!MS!"=="" set "MS=1000"
set /a SEC=!MS!/1000
if !SEC! lss 1 set "SEC=1"
set /a PINGN=!SEC!+1
ping -n !PINGN! 127.0.0.1 >nul
endlocal
exit /b 0
