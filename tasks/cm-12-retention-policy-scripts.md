# CM-12: Retention Policy Scripts for Sessions and Requests

## Problem
Need unified retention policy scripts for both sessions and requests.

## Solution
Create scripts directory with retention policies:
1. Session cleanup: `a2a-client/scripts/cleanup-sessions.js` (already exists)
2. Request cleanup: `a2a-server/scripts/cleanup-requests.js` (from task s-10)
3. Add unified cleanup script that runs both

## Where
- Existing: `a2a-client/scripts/cleanup-sessions.js`
- Create: `tasks/s-10-request-cleanup-script.md`
- Create: `scripts/unified-cleanup.sh`

## Implementation
```bash
#!/bin/bash
# Unified cleanup for A2A system
# Run via cron: 0 2 * * * /path/to/scripts/unified-cleanup.sh

# Cleanup client sessions (14 days)
cd a2a-client && npm run cleanup:sessions

# Cleanup server requests (14 days)  
cd a2a-server && node scripts/cleanup-requests.js 14

echo "Unified cleanup completed at $(date)"
```

## Verification
```bash
# Test individual cleanups
cd a2a-client && npm run cleanup:sessions:dry-run
cd a2a-server && node scripts/cleanup-requests.js 14 --dry-run
```
