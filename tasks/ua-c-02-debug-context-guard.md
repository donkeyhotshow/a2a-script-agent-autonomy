# UA-C-02: Debug Context Guard Rule

## Problem
Need strict rule for `?includeContext=1` usage (debug-only), add tests that UI runtime does not depend on raw `context.workbench` fields.

## Solution
1. Document that `?includeContext=1` is debug-only
2. Add tests that UI components work without debug context
3. Ensure UI doesn't break when context is not included

## Where
- File: `a2a-client/vite-plugin-a2a/routes/sessionRoutes.js`
- Tests: `a2a-client/tests/unit/session-routes.test.js`

## Implementation
```javascript
// In sessionRoutes.js - add guard
app.get('/api/a2a/sessions/:id', (req, res) => {
  const debugMode = req.query.includeContext === '1';
  
  // Only allow in development
  if (debugMode && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug context not allowed in production' });
  }
  
  // ... rest of implementation
});
```

## Verification
```bash
# Should work in development
curl "http://localhost:5173/api/a2a/sessions/test?includeContext=1"

# Should fail in production
NODE_ENV=production curl "http://localhost:5173/api/a2a/sessions/test?includeContext=1"
```
