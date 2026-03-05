@echo off
REM Killer script for a2a-script-agent
REM Kills all Node.js and Ollama processes

echo === Killing all a2a-script-agent processes ===

echo Killing Ollama...
taskkill /F /IM ollama.exe 2>nul || echo No Ollama process found

echo Killing Node.js processes (npm, node)...
taskkill /F /IM node.exe 2>nul || echo No node.exe process found
taskkill /F /IM npm.exe 2>nul || echo No npm.exe process found

echo Killing Python processes (uvicorn)...
taskkill /F /IM python.exe 2>nul || echo No python.exe process found
taskkill /F /IM python3.exe 2>nul || echo No python3.exe process found

echo Killing helper cmd wrappers...
wmic process where "Name='cmd.exe' and CommandLine like '%%npm run dev%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%ollama serve%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%python -m uvicorn%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%cross-env NODE_ENV=development tsx watch src/index.ts%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%tsx watch src/index.ts%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%tsx%%watch%%src/index.ts%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%tsx%%watch%%'" call terminate >nul 2>&1
wmic process where "Name='cmd.exe' and CommandLine like '%%tsx watch src/server/index.ts%%'" call terminate >nul 2>&1

echo.
echo === All processes killed ===
if exist .pids.txt del .pids.txt
