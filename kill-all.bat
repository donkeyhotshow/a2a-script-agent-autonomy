@echo off
chcp 65001 >nul
REM Killer script for a2a-script-agent
REM Kills processes via PID manager, then ports as control

echo === Killing all a2a-script-agent processes ===

echo.
echo [1/4] Killing from .pids.txt...
if exist .pids.txt (
    for /f %%p in (.pids.txt) do (
        tasklist /FI "PID eq %%p" 2>nul | findstr "%%p" >nul && (
            echo   Killing PID %%p
            taskkill /F /PID %%p >nul 2>&1 && echo   OK || echo   Already dead
        )
    )
) else (
    echo   .pids.txt not found, skipping
)

echo.
echo [2/4] Control kill by app ports (3000, 3001, 3002, 5173)...
for %%p in (3000 3001 3002 5173) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
        echo   Killing PID %%a on port %%p
        taskkill /F /PID %%a >nul 2>&1 && echo   OK || echo   Already dead
    )
)

echo.
echo [3/4] Killing app executables...
for %%e in (node.exe npm.exe npx.exe tsx.exe) do (
    tasklist /FI "IMAGENAME eq %%e" 2>nul | findstr /I "%%e" >nul && (
        taskkill /F /IM %%e >nul 2>&1
        echo   %%e killed
    ) || echo   %%e: not running
)

echo.
echo [4/4] Killing cmd wrappers...
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" 2>$null | Where-Object { $_.CommandLine -match 'tsx|npm' } | ForEach-Object { Write-Host ('  cmd.exe PID ' + $_.ProcessId + ' killed'); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" 2>nul || echo   No cmd wrappers found

echo.
echo === All processes killed ===
if exist .pids.txt del .pids.txt
echo Cleanup: .pids.txt deleted
