@echo off
if not defined CMDEXTVERSION (
    echo ERROR: Run from cmd.exe: cmd /c "%~f0"
    exit /b 1
)
REM Start a2a-server service only
cd /d "%~dp0.."

set SERVER_PORT=3000
set PID_FILE=.pids.txt

echo [A2A-Server] Starting on port %SERVER_PORT%...

REM Check if already running
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%SERVER_PORT%" ^| findstr "LISTENING"') do (
    echo [A2A-Server] Already running on PID %%A
    (echo A2A_SERVER_PID=%%A)>>"%PID_FILE%"
    exit /b 0
)

REM Create logs directory if it doesn't exist (required for redirect)
if not exist "a2a-server\logs" mkdir "a2a-server\logs"

REM Start a2a-server - use /d to set working directory explicitly
start "a2a-server" /d "a2a-server" cmd /c "npm run dev:no-auth ^> logs\server.log 2^>^&1"

setlocal enabledelayedexpansion
REM Cold tsx watch + compile often exceeds 10s; poll until LISTENING (~60s max)
set /a _tries=0
:wait_listen
if !_tries! geq 30 goto wait_fail
REM timeout.exe can fail in redirected/non-interactive shells; use PowerShell sleep for reliability
powershell -Command "Start-Sleep -Seconds 2"
set /a _tries+=1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%SERVER_PORT%" ^| findstr "LISTENING"') do (
    (echo A2A_SERVER_PID=%%A)>>"%PID_FILE%"
    echo [A2A-Server] Started on PID %%A
    endlocal
    exit /b 0
)
goto wait_listen

:wait_fail
endlocal
echo [A2A-Server] Failed to start (port %SERVER_PORT% not LISTENING after ~60s; see a2a-server\logs\server.log^)
(echo A2A_SERVER_PID=)>>"%PID_FILE%"
exit /b 1
