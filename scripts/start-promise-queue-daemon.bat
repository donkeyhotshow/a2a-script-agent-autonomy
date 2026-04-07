@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

set HUB_URL=http://localhost:11434
if defined PROMISE_PROXY_URL set HUB_URL=%PROMISE_PROXY_URL%

echo [promise-queue-daemon] Starting (hub %HUB_URL%)...

REM Avoid duplicate titled windows from repeated start-all (best-effort).
taskkill /FI "WINDOWTITLE eq promise-queue-daemon*" /F >nul 2>&1

cd ai-integration
start "promise-queue-daemon" cmd /c "python scripts\promise_queue_daemon.py --proxy-url %HUB_URL%"
cd ..

echo [promise-queue-daemon] Started separate window titled promise-queue-daemon
exit /b 0
