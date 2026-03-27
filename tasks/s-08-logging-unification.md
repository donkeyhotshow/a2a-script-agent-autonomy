# S-08: Server Logging Unification

## Problem
Need unified LOG_LEVEL/LOG_FORMAT and Winston rotation/boot-clean strategy.

## Solution
1. Use Winston for all logging
2. Configure LOG_LEVEL from environment (default: info)
3. Add file rotation with daily rotation
4. Clean old logs on startup

## Where
- File: `a2a-server/src/utils/logger.ts`
- Config: LOG_LEVEL, LOG_FORMAT env vars

## Implementation
```typescript
// In logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winstonDaily({
      filename: 'logs/a2a-server-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.Console({
      format: process.env.LOG_FORMAT === 'json' 
        ? logFormat 
        : winston.format.simple()
    })
  ]
});

// Boot cleanup: remove logs older than 30 days on startup
export function cleanOldLogs() {
  // Implementation to clean old log files
}
```

## Verification
```bash
# Test log level
LOG_LEVEL=debug node a2a-server/src/index.ts

# Check rotation
ls -la a2a-server/logs/
```
