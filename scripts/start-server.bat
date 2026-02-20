@echo off
cd /d "%~dp0.."
set PORT=3000
if not "%1"=="" set PORT=%1

call scripts\kill-port.bat %PORT%
node scripts\wait-for-ports-free.js %PORT%

echo Starting A2A server on port %PORT%...
cd a2a-server
set SKIP_AUTH=1
set PORT=%PORT%
npm run dev
