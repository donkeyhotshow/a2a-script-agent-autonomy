@echo off
chcp 65001 >nul
REM Start a2a-server service only

set SERVER_PORT=3000
set PID_FILE=.pids.txt

echo [A2A-Server] Starting on port %SERVER_PORT%...

REM Check if already running
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%SERVER_PORT%" ^| findstr "LISTENING"') do (
    echo [A2A-Server] Already running on PID %%p
    echo A2A_SERVER_PID=%%p >> %PID_FILE%
    exit /b 0
)

REM Start a2a-server
cd a2a-server
start /b "" cmd /c "npm run dev:local ^> logs\server.log 2^>^&1"
cd ..

powershell -Command "Start-Sleep -Seconds 5"

REM Capture PID
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%SERVER_PORT%" ^| findstr "LISTENING"') do (
    echo A2A_SERVER_PID=%%p >> %PID_FILE%
    echo [A2A-Server] Started on PID %%p
    exit /b 0
)

echo [A2A-Server] Failed to start
echo A2A_SERVER_PID= >> %PID_FILE%
exit /b 1
