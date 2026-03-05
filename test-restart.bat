@echo off
REM Test script to verify process start/restart/stop
REM Tests that processes don't remain after stop

echo === Testing start/restart/stop cycle ===

set PASSED=0
set FAILED=0

REM ==========================================
REM Test 1: Initial kill
REM ==========================================
echo.
echo [Test 1] Initial kill...
call kill-all.bat
powershell -Command "Start-Sleep -Seconds 3"
echo PASSED: Initial kill
set /a PASSED+=1

REM ==========================================
REM Test 2: Start all services
REM ==========================================
echo.
echo [Test 2] Starting all services...
call start-all.bat
powershell -Command "Start-Sleep -Seconds 8"

REM Check if ports are listening
netstat -ano | findstr ":11434" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo PASSED: Port 11434 (Ollama/ai-integration) is listening
    set /a PASSED+=1
) else (
    echo FAILED: Port 11434 is not listening
    set /a FAILED+=1
)

netstat -ano | findstr ":11435" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo PASSED: Port 11435 (Ollama) is listening
    set /a PASSED+=1
) else (
    echo FAILED: Port 11435 is not listening
    set /a FAILED+=1
)

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo PASSED: Port 3000 (a2a-server) is listening
    set /a PASSED+=1
) else (
    echo FAILED: Port 3000 is not listening
    set /a FAILED+=1
)

REM ==========================================
REM Test 3: Check PIDs saved
REM ==========================================
echo.
echo [Test 3] Checking PID file...
if exist .pids.txt (
    echo PASSED: PID file created
    set /a PASSED+=1
    echo Contents:
    type .pids.txt
) else (
    echo FAILED: PID file not created
    set /a FAILED+=1
)

REM ==========================================
REM Test 4: Kill all and verify no processes
REM ==========================================
echo.
echo [Test 4] Killing all and verifying...
call kill-all.bat
powershell -Command "Start-Sleep -Seconds 3"

REM Check that ports are no longer listening
netstat -ano | findstr ":11434" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo FAILED: Port 11434 still listening after kill
    set /a FAILED+=1
) else (
    echo PASSED: Port 11434 freed after kill
    set /a PASSED+=1
)

netstat -ano | findstr ":11435" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo FAILED: Port 11435 still listening after kill
    set /a FAILED+=1
) else (
    echo PASSED: Port 11435 freed after kill
    set /a PASSED+=1
)

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo FAILED: Port 3000 still listening after kill
    set /a FAILED+=1
) else (
    echo PASSED: Port 3000 freed after kill
    set /a PASSED+=1
)

REM ==========================================
REM Summary
REM ==========================================
echo.
echo =========================================
echo Test Summary
echo =========================================
echo PASSED: %PASSED%
echo FAILED: %FAILED%
echo.

if %FAILED%==0 (
    echo All tests PASSED!
    exit /b 0
) else (
    echo Some tests FAILED!
    exit /b 1
)
