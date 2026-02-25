@echo off
chcp 65001 > nul
cd /d "%~dp0"

set PORT=5173
set URL=http://localhost:%PORT%/
set LOG=logs\test.log

if not exist logs mkdir logs

curl -s -o nul -w "HTTP_CODE: %%{http_code}\n" "%URL%" > "%LOG%"
findstr "HTTP_CODE: 200" "%LOG%" > nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] %URL% доступен >> "%LOG%"
    exit /b 0
) else (
    echo [ERROR] %URL% не отвечает >> "%LOG%"
    exit /b 1
) 