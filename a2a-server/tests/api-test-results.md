# API Test Results - 2026-03-04

## Server: a2a-server (localhost:3000)

### Endpoints Tested:

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/v1/health` | GET | ✅ | `{"status":"healthy","database":{"status":"healthy","latency":106}}` |
| `/api/v1/versions` | GET | ✅ | `{"version":"2.0","supported":["1.0","1.1","2.0"]}` |
| `/api/v1/metrics` | GET | ✅ | Prometheus format |
| `/api/v1/requests` | POST | ✅ | Created request with promiseId |
| `/api/v1/requests/:id/status` | GET | ✅ | Returns status |
| `/api/v1/requests/:id/result` | GET | ✅ | Returns result with graph |
| `/api/v1/requests/queue/stats` | GET | ✅ | Returns queue stats |

### Test Request:
```bash
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_dev_password" \
  -d '{"context": {"version": "1.0"}, "message": {"role": "user", "parts": [{"type": "text", "text": "Hello"}]}}'
```

### Bug Found & Fixed:
- File: `a2a-server/src/services/core/request/request.service.ts:49`
- Issue: message not serialized to JSON string for Prisma
- Fix: Added JSON.stringify for message field

### Notes:
- Some requests complete immediately (first test)
- Some requests stay in pending state (needs investigation of request processor)
- Database connection is healthy

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
