# Quick Start Guide - Task Monitor

## What Was Done

✅ **6 Critical Bugs Fixed**
- Router choice parameter handling
- Double task submission prevention
- Improved task extraction logic
- Poll loop promise checking
- Hardbit state logging accuracy
- Session verification enhancements

✅ **Daemon System Complete**
- Graceful shutdown with signal handling
- Status reporting every 30 seconds
- Hook document creation for failed tasks
- Non-blocking async task monitoring
- Health check system

✅ **17 Tests Created & Passing**
- 100% validation coverage
- All fixes verified
- All features tested

---

## Running the Script

### Daemon Mode (Recommended)
```bash
# Start continuous monitoring daemon
node monitor-and-process-tasks.js

# Stop daemon gracefully
# Press Ctrl+C - it will wait up to 30 seconds for tasks to complete
```

### Sequential Mode (One Task at a Time)
```bash
# Process all tasks one by one and exit
node monitor-and-process-tasks.js --sequential
# or
node monitor-and-process-tasks.js --once
```

---

## What It Does

1. **Monitors Tasks** - Continuously checks `prompts-to-agent-mode/` directory
2. **Creates Sessions** - Starts A2A sessions for each task
3. **Tracks Progress** - Logs status every 30 seconds
4. **Handles Failures** - Creates hook documents for IDE integration
5. **Graceful Shutdown** - Waits for tasks to complete on exit

---

## Monitoring Status

Check `task-monitor-state.json` for:
- Current task being processed
- Session ID
- All processed tasks with status
- Active tasks being monitored

---

## Hook Documents

When tasks fail, documents appear in `hooks/` directory with:
- Task name and status
- Error details
- Session context
- Suggested remediation actions
- Timestamp

---

## Health Checks

System verifies on startup:
- ✓ Client API (http://localhost:5173/api/a2a)
- ✓ A2A Server (http://localhost:3000)
- ✓ Ollama (http://localhost:11435)
- ✓ AI Hub (http://localhost:11434)

---

## Test Suite

Run tests to validate everything works:
```bash
npx vitest run monitor-and-process-tasks.test.js
```

Expected output: **17 passed (17)**

---

## Key Features

| Feature | Benefit |
|---------|---------|
| Graceful Shutdown | Tasks complete before exit |
| Status Reporting | See progress every 30 seconds |
| Hook Documents | IDE can read and respond to failures |
| Health Check | Know if services are available |
| Promise Tracking | See LLM processing status |
| Error Handling | Detailed error context for debugging |

---

## Troubleshooting

**Q: Script hangs?**  
A: Press Ctrl+C for graceful shutdown (waits 30 seconds)

**Q: Tasks not processing?**  
A: Check health: Are Client API, A2A Server, Ollama running?

**Q: No hook documents?**  
A: Only created for failed or timeout tasks

**Q: Session not found?**  
A: Check session created successfully; logs show session ID

---

## For More Details

See: [COMPLETION-REPORT.md](./COMPLETION-REPORT.md)

Contains:
- Detailed bug fix descriptions
- Architecture overview
- Test results
- Implementation checklist
