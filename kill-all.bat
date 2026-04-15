@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo [A2A] Stopping listeners on A2A ports 3000 3001 5173 11434 ^(PID per port only^)...
for %%p in (3000 3001 5173 11434) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            echo   Killing PID %%a on port %%p
            taskkill /f /pid %%a 2>nul
        )
    )
)
echo [A2A] Done. Port-based only; other node processes ^(e.g. external UI, MCP^) were not targeted.
if defined A2A_KILL_PAUSE pause
endlocal
exit /b 0
