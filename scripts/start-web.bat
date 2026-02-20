@echo off
cd /d "%~dp0.."
set WEB_PORT=5173
set API_PORT=3000
if not "%1"=="" set WEB_PORT=%1

call scripts\kill-port.bat %API_PORT%
call scripts\kill-port.bat %WEB_PORT%
node scripts\wait-for-ports-free.js %API_PORT% %WEB_PORT%

echo Starting API server on port %API_PORT%...
start /b cmd /c "cd /d "%~dp0..\a2a-server" && set SKIP_AUTH=1 && set PORT=%API_PORT% && npm run dev"
timeout /t 3 /nobreak >nul

echo Starting web server on port %WEB_PORT%...
cd a2a-client
npx vite --port %WEB_PORT%
