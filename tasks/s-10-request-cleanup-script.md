# S-10: Request Cleanup Script

## Problem
Storage/requests accumulates old files over time, needs cleanup utility.

## Solution
Create a cleanup script similar to client cleanup:
1. Remove request files older than 14 days
2. Optionally remove all completed requests
3. Run as cron job or manual

## Where
- Create: `a2a-server/scripts/cleanup-requests.js`

## Implementation
```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = process.env.A2A_SERVER_STORAGE_DIR || path.join(__dirname, '../storage/requests');

const DAYS = parseInt(process.argv[2] || '14');
const DRY_RUN = process.argv.includes('--dry-run');

function cleanupRequests() {
  const requestsDir = path.join(STORAGE_DIR, 'requests');
  if (!fs.existsSync(requestsDir)) {
    console.log('Requests directory does not exist');
    return;
  }
  
  const cutoff = Date.now() - (DAYS * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(requestsDir);
  
  let removed = 0;
  for (const file of files) {
    const filepath = path.join(requestsDir, file);
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs < cutoff) {
      if (DRY_RUN) {
        console.log(`Would remove: ${file}`);
      } else {
        fs.unlinkSync(filepath);
        console.log(`Removed: ${file}`);
      }
      removed++;
    }
  }
  
  console.log(`Cleanup complete: ${removed} files ${DRY_RUN ? 'would be' : ''} removed`);
}

cleanupRequests();
```

## Verification
```bash
# Dry run
node a2a-server/scripts/cleanup-requests.js 14 --dry-run

# Actual cleanup
node a2a-server/scripts/cleanup-requests.js 14
```

## Cron
Add to crontab:
```bash
0 3 * * * /path/to/a2a-server/scripts/cleanup-requests.js 14 >> /var/log/a2a-cleanup.log 2>&1
```
