@echo off
echo Останавливаю все процессы Node.js...

taskkill /F /IM node.exe /T 2>nul

if %errorlevel% equ 0 (
    echo ✓ Все процессы Node.js успешно остановлены
) else (
    echo ℹ Запущенных процессов Node.js не найдено
)

echo.
pause
