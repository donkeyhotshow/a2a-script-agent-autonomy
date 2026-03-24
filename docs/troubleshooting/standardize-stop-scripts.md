# Standardized Stop/Start Scripts

## Status: ✅ IMPLEMENTED

All start/stop scripts now follow the dual-verification pattern.

## Context
Previously, start-all.* and kill-all.* used inconsistent termination methods: some processes were killed by port, some by executable name, and .pids.txt handling was unreliable. This often left zombie processes (e.g., port occupied but PID appeared hung, or port closed but process still running). The new implementation guarantees clean termination.

## Service-to-Port Mapping

| Service | Port | Processes | PID Key |
|---------|------|-----------|---------|
| Ollama | 11435 | `ollama.exe` / `ollama` | `OLLAMA_PID` |
| ai-integration | 11434 | `python.exe`, `uvicorn.exe` / `python`, `uvicorn` | `AI_INTEGRATION_PID` |
| a2a-server | 3000 | `node.exe` / `node` | `A2A_SERVER_PID` |
| client-api | 3001 | `node.exe` / `node` | `CLIENT_API_PID` |
| web-ui | 5173 | `node.exe` / `node` | `WEB_UI_PID` |

## Implemented Scripts

| Platform | Start Script | Kill Script |
|----------|--------------|-------------|
| Windows PowerShell | `start-all.ps1` | `kill-all.ps1` |
| Windows Batch | `start-all.bat` | `kill-all.bat` |
| Linux/macOS | `start-all.sh` | `kill-all.sh` |

## Goal
Standardized stop/start scripts with dual verification:
1. **Kill by port**: Find process listening on service port and terminate it (`taskkill /F /PID` or `kill -9`)
2. **Verify port free**: Confirm port is no longer listening (via `netstat`/`Get-NetTCPConnection`/`lsof`)
3. **Kill by PID/name**: Terminate from `.pids.txt` entries and by executable patterns (`node.exe`, `python.exe`, etc.)
4. **Verify processes gone**: Check no matching processes remain (by name and command pattern)
5. **Clean `.pids.txt`**: Only delete after all verifications pass; preserve on failure for debugging

## Verification Pattern

### Dual Verification Template

All scripts implement this sequence:

```
1. KILL BY PORT
   - Find: netstat -ano | findstr :PORT (Windows)
           lsof -ti :PORT (Linux/macOS)
   - Kill: taskkill /F /PID <pid> (Windows)
           kill -9 <pid> (Linux/macOS)

2. VERIFY PORT FREE
   - Check: Get-NetTCPConnection -LocalPort PORT (PowerShell)
            lsof -i :PORT (Linux/macOS)
   - Retry: Up to 10 attempts with 500ms delay

3. KILL BY PID/NAME
   - From .pids.txt: Extract saved PID, kill if still running
   - By process name: taskkill /F /IM <name> (Windows)
                     pkill -f <pattern> (Linux/macOS)

4. VERIFY TASKS GONE
   - Check: tasklist /FI "PID eq <pid>" (Windows)
            ps -p <pid> (Linux/macOS)
   - Pattern match: Get-CimInstance Win32_Process (PowerShell)
                    ps aux | grep <pattern> (Linux/macOS)

5. CLEAN .pids.txt
   - Only delete after all verifications pass
   - Preserve file with warning if any step failed
```

### Commands Reference

| Platform | Find Port | Kill PID | Kill by Name | Verify Port | Verify Process |
|----------|-----------|----------|--------------|-------------|----------------|
| Windows Batch | `netstat -ano \| findstr :PORT` | `taskkill /F /PID` | `taskkill /F /IM` | `netstat -ano` | `tasklist /FI` |
| PowerShell | `Get-NetTCPConnection` | `Stop-Process -Force` | `Stop-Process` | `Get-NetTCPConnection` | `Get-Process` |
| Linux | `lsof -ti :PORT`, `netstat -tlnp` | `kill -9` | `pkill -f` | `lsof -i :PORT` | `ps`, `pgrep` |

## Acceptance Criteria ✅

1. ✅ **Specification**: This document describes the dual-verification pattern and service mapping
2. ✅ **Extension guide**: Template for adding new services is documented below
3. ✅ **README updated**: Added section referencing the standardized scripts
4. ✅ **Implementation complete**: All scripts updated with dual verification

### Extending for New Services

To add a new service, update the `$Services` hash (PowerShell) or `SERVICES` array (shell):

```powershell
# PowerShell template
$Services['new-service'] = @{
    Port = 8080
    PidKey = 'NEW_SVC_PID'
    Processes = @('new-svc.exe')     # Executable names
    Patterns = @('new-svc', 'pattern')  # Command line patterns
}
```

```bash
# Shell template
SERVICES+=(
    "new-service|8080|NEW_SVC_PID|new-svc,otherproc"
)
```

## Implementation Details

### Script Behavior on Failure

If a process cannot be terminated:

1. **Retry logic**: Up to 10 attempts with exponential backoff (500ms delays)
2. **Escalation**: Use `taskkill /F /T` (kill process tree) on Windows, `pkill -9 -f` on Linux
3. **Logging**: All failures are logged with `[ERROR]` prefix and exit code set to 1
4. **Preserve .pids.txt**: File is NOT deleted if any service failed to terminate (for debugging)

### Log Output Format

```
[STEP] Phase 1: Kill by port (find and terminate port listeners)
  [INFO] Processing Ollama (port 11435)...
  [WARN] Port 11435 occupied by PID 1234 - terminating...
  [OK] Killed PID 1234
  [OK] Port 11435 already free
[STEP] Phase 2: Verify ports are free
  [OK] Ollama port 11435 verified free
[STEP] Phase 3: Kill by PID from file and by process name
  [INFO] Killing Ollama by PID 1234 from file...
  [OK] Killed PID 1234
[STEP] Complete: Termination complete (exit code: 0)
```

## Verification Steps

To verify the implementation works correctly:

### Test 1: Clean Start/Stop Cycle
```powershell
# Windows PowerShell
.\kill-all.ps1          # Ensure clean state
.\start-all.ps1         # Start all services
# Wait for services to be ready
.\kill-all.ps1          # Stop all services
```

### Test 2: Double Start (Verify Auto-Cleanup)
```powershell
# Start services
.\start-all.ps1
# Without stopping, try to start again
.\start-all.ps1         # Should automatically clean and restart
```

### Test 3: Check Logs
```powershell
# Verify detailed output
.\kill-all.ps1 -Verbose
# Verify check-only mode
.\kill-all.ps1 -CheckOnly
```

### Expected Behavior
- All phases logged with `[STEP]` headers
- Each service shows port verification
- `.pids.txt` deleted only when all services clean
- Exit code 0 on success, 1 on any failure
- No zombie processes after `kill-all` completes
