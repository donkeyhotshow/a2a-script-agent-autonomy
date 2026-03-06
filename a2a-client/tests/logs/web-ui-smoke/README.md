# Web UI Smoke Test Logs

This directory contains artifacts and logs from automated Web UI smoke tests.

## Directory Structure

```
web-ui-smoke/
├── README.md                    # This file
├── archive/                     # Archived logs (rotated weekly)
├── web-ui-smoke-enhanced-{timestamp}.json  # Test results
├── sse-heartbeat-{timestamp}.log          # SSE-specific logs
└── infrastructure-{timestamp}.log         # Infrastructure validation logs
```

## Log Files

### Test Results (`web-ui-smoke-enhanced-{timestamp}.json`)
Contains structured test results including:
- Test status (passed/failed)
- Duration and timestamps
- Service health status
- SSE connectivity metrics
- Browser compatibility results

### SSE Heartbeat Logs (`sse-heartbeat-{timestamp}.log`)
Detailed SSE connection logs including:
- Connection establishment
- Heartbeat events received
- Message counts and timing
- Connection drops and reconnections

### Infrastructure Logs (`infrastructure-{timestamp}.log`)
Infrastructure validation logs including:
- Docker service status
- Service health check results
- Port availability
- Startup timing

## Log Rotation

Logs are automatically rotated:
- Test results: Keep last 50 runs
- SSE logs: Keep last 30 days
- Infrastructure logs: Keep last 30 days
- Archive older logs to `archive/` directory

## Analysis Scripts

Use the analysis script to review logs:
```bash
# Analyze recent test results (Node.js)
node scripts/analyze-web-ui-smoke-logs.js

# Generate summary report (PowerShell)
.\scripts\web-ui-smoke-report.ps1

# Generate detailed report for last 30 days
.\scripts\web-ui-smoke-report.ps1 -DaysBack 30 -Detailed
```

## Cleanup

Run cleanup manually:
```bash
# Clean old logs (Node.js)
node scripts/cleanup-web-ui-smoke-logs.js

# Scheduled cleanup (PowerShell) - dry run first
.\scripts\schedule-log-cleanup.ps1 -DryRun

# Actual cleanup
.\scripts\schedule-log-cleanup.ps1
```

## Automation

### CI Integration
Add to your CI pipeline:
```yaml
# In GitHub Actions, Azure DevOps, etc.
- name: Cleanup old logs
  run: node scripts/cleanup-web-ui-smoke-logs.js
  if: github.event_name == 'schedule'  # Run weekly
```

### Scheduled Tasks (Windows)
```powershell
# Create scheduled task to run weekly
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\path\to\schedule-log-cleanup.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "WebUISmokeLogCleanup" -Action $action -Trigger $trigger -User "SYSTEM"
```