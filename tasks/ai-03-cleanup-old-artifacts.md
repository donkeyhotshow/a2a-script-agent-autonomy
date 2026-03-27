# AI-03: Cleanup Routine for Old Pending/Log Artifacts

## Problem
Pending-ticket and log accumulation needs periodic cleanup to prevent disk space issues.

## Solution
Create a cleanup script for old artifacts:
1. Clean `proxy_logs/` directory (keep last 7 days)
2. Clean pending tickets older than 14 days
3. Clean completed promises older than 30 days

## Where
- Create: `ai-integration/scripts/cleanup-old-artifacts.py`

## Implementation
```python
#!/usr/bin/env python3
"""Cleanup old artifacts from proxy storage."""
import os
import time
from datetime import datetime, timedelta

STORAGE_DIR = os.environ.get('A2A_STORAGE_DIR', '/tmp/ai-integration')
PENDING_DIR = os.path.join(STORAGE_DIR, 'pending')
LOGS_DIR = os.path.join(STORAGE_DIR, 'proxy_logs')

def cleanup_directory(directory: str, days: int):
    """Remove files older than specified days."""
    if not os.path.exists(directory):
        return
    
    cutoff = time.time() - (days * 86400)
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.getmtime(filepath) < cutoff:
            os.remove(filepath)

def cleanup_pending(days: int = 14):
    cleanup_directory(PENDING_DIR, days)

def cleanup_logs(days: int = 7):
    cleanup_directory(LOGS_DIR, days)

if __name__ == '__main__':
    cleanup_pending(days=14)
    cleanup_logs(days=7)
    print("Cleanup completed")
```

## Verification
```bash
# Run cleanup
python ai-integration/scripts/cleanup-old-artifacts.py

# Verify old files removed
ls -la ai-integration/proxy_logs/  # Should only have recent files
```

## Cron Job
Add to crontab:
```bash
0 2 * * * /path/to/ai-integration/scripts/cleanup-old-artifacts.py
```
