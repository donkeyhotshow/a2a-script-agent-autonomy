@echo off
setlocal EnableExtensions

REM Args:
REM   %1 = port
REM   %2 = log file (absolute)
REM   %3... = extra uvicorn flags (optional)
set "PORT=%~1"
set "LOG_FILE=%~2"

if "%PORT%"=="" exit /b 2
if "%LOG_FILE%"=="" exit /b 2

REM Ensure parent dir exists.
for %%D in ("%LOG_FILE%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>&1

REM Make sure the file exists so callers can read it even on immediate failure.
type nul >> "%LOG_FILE%" 2>nul

REM Run uvicorn and append logs. Optional extra flags as one quoted arg (%~3), e.g. "--reload --reload-dir ."
set FORWARD_TIMEOUT_SECONDS=180
python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port %PORT% %~3 >> "%LOG_FILE%" 2>&1
exit /b %ERRORLEVEL%

