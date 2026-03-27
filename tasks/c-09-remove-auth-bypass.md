# C-09: Remove Auth Bypass in SDK Middleware

## Problem
Temporary bypass in `packages/sdk/src/server/server/middleware/auth.ts` allows all requests.

## Solution
Implement proper auth check:
1. Read `JWT_SECRET` from environment
2. Validate JWT token in Authorization header
3. Allow bypass only when `SKIP_AUTH=1` (development mode)
4. Refuse all requests in production mode

## Where
- File: `a2a-client/packages/sdk/src/server/server/middleware/auth.ts`

## Implementation
```typescript
import jwt from 'jsonwebtoken';

const SKIP_AUTH = process.env.SKIP_AUTH === '1';
const JWT_SECRET = process.env.JWT_SECRET;

export function authMiddleware(req, res, next) {
  if (SKIP_AUTH) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Verification
```bash
# Should fail without auth
curl http://localhost:3001/api/a2a/sessions

# Should work with SKIP_AUTH=1
SKIP_AUTH=1 curl http://localhost:3001/api/a2a/sessions
```
