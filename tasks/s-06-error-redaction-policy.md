# S-06: Production Error Redaction Policy

## Problem
Need final production error redaction policy - stack traces should only appear in dev mode.

## Solution
Implement NODE_ENV-based error handling:
1. In production: return generic error messages, hide stack traces
2. In development: return full error details including stack traces
3. Use `NODE_ENV=production` to detect production mode

## Where
- Files: `a2a-server/src/utils/logger.ts`, `a2a-server/src/middleware/error.middleware.ts`

## Implementation
```typescript
// In error.middleware.ts
const isProduction = process.env.NODE_ENV === 'production';

app.use((err, req, res, next) => {
  if (isProduction) {
    logger.error(err.message); // Log full error internally
    res.status(500).json({ 
      error: 'Internal Server Error',
      requestId: req.headers['x-request-id']
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      requestId: req.headers['x-request-id']
    });
  }
});
```

## Verification
```bash
# Dev mode - should show stack trace
NODE_ENV=development curl http://localhost:3000/api/v1/invoke -X POST -d '{}'

# Production mode - should hide stack trace
NODE_ENV=production curl http://localhost:3000/api/v1/invoke -X POST -d '{}'
```
