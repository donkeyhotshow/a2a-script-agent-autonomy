@echo off
cd /d "%~dp0.."
set PORT=3000
if not "%1"=="" set PORT=%1

call scripts\kill-port.bat %PORT%

:: Verify port is free before proceeding
node scripts\wait-for-ports-free.js %PORT%

echo Starting A2A server on port %PORT%...
set PORT=%PORT%
npm run dev
