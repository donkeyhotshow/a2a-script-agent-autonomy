@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3000
set MAX_RETRIES=3
set RETRY_DELAY=2

set /a CURRENT_RETRY=0

:retry_loop
set /a CURRENT_RETRY+=1

for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr ":%PORT% "') do (
  echo [Attempt %CURRENT_RETRY%/%MAX_RETRIES%] Killing PID %%a on port %PORT%
  taskkill /PID %%a /F 2>nul
)

:: Wait for port to be released
timeout /t %RETRY_DELAY% /nobreak >nul

:: Check if port is still in use
set PORT_STILL_IN_USE=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr ":%PORT% "') do (
  set PORT_STILL_IN_USE=1
)

if "%PORT_STILL_IN_USE%"=="1" (
  if %CURRENT_RETRY% LSS %MAX_RETRIES% (
    echo Port %PORT% still in use, retrying...
    goto retry_loop
  ) else (
    echo Warning: Port %PORT% may still be in use after %MAX_RETRIES% attempts
  )
) else (
  echo Port %PORT% is now free
)

endlocal
