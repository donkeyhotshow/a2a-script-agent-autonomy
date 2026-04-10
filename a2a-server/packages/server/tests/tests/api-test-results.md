# API Test Results - 2026-03-07 (Stateless)

## Server: a2a-server (localhost:3000)

### Endpoints Tested:

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/health` | GET | ✅ | `{"status":"ok","mode":"stateless"}` |
| `/api/v1/invoke` | POST | ✅ | Returns execute object |

### Test Request:
```bash
curl -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{"task": "Test invoke"}'
```

### Notes:
- Server is stateless - no database required
- Health check returns `"mode": "stateless"`
- All storage is in-memory only (lost on restart)
- Client API (port 3001) handles session persistence via JSON files

## Invoke Endpoint Test:

```bash
# First request - only task field
curl -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{"task": "Test invoke"}'

# Response:
{"success":true,"data":{"promiseId":"cmmchdnu200025fcfm2rber91","status":"pending","message":"Request queued for processing. Poll /api/v1/requests/:promiseId/status for status."}}
```

### Schema (server-invoke-request.schema.json):
- First request: only `task` is required
- Subsequent requests: `context` with `task` and `execution` required
