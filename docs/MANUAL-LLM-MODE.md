# Manual LLM Mode

Operator-controlled LLM response mode for A2A Server.

## Overview

When enabled, the server pauses before calling the LLM and waits for an operator to submit the LLM response manually via API. This is useful for:

- Testing and debugging prompt flows
- Using external LLM providers not in the standard pipeline
- Manually crafting responses for specific scenarios
- Inspecting the exact prompts sent to LLM

## Enable

Set environment variable:

```bash
A2A_MANUAL_LLM_MODE=1
```

Or in `.env`:

```
A2A_MANUAL_LLM_MODE=1
```

## How It Works

1. **Normal request submission**: Client sends `POST /api/v1/invoke` with task
2. **Request transforms**: Server prepares `request.md` and `system.md`
3. **Pause for manual input**: Instead of calling LLM, server:
   - Stores prepared messages
   - Sets request status to `waiting_manual_llm`
   - Returns `execute.form` with instructions and message preview
4. **Operator submits response**: Via `POST /api/v1/requests/{promiseId}/llm-response`
5. **Continue processing**: Server runs gray room transforms and completes request

## API Endpoints

### List Pending Manual LLM Requests

```bash
GET /api/v1/requests/manual-llm/pending
```

Response:
```json
{
  "success": true,
  "data": {
    "count": 2,
    "items": [
      {
        "promiseId": "prom_123...",
        "schemaName": "dialog/3",
        "createdAt": "2026-04-03T10:00:00Z",
        "waitingMinutes": 5
      }
    ]
  }
}
```

### Check Request Status

```bash
GET /api/v1/requests/{promiseId}/result
```

When waiting for manual input:
```json
{
  "success": true,
  "data": {
    "status": "waiting_manual_llm",
    "manualLlmMode": true,
    "message": "🛑 MANUAL LLM MODE — Submit response via POST /requests/{promiseId}/llm-response",
    "execute": {
      "form": {
        "title": "🛑 MANUAL LLM MODE — Operator Input Required",
        "description": "Server is waiting for manual LLM response...",
        "meta": {
          "mode": "manual_llm",
          "status": "waiting_operator",
          "promiseId": "prom_123..."
        },
        "messages_preview": [
          {"role": "system", "preview": "You are a helpful assistant..."},
          {"role": "user", "preview": "Task: Verify ADR-0028..."}
        ],
        "submit_endpoint": "/api/v1/requests/prom_123.../llm-response",
        "submit_method": "POST"
      }
    }
  }
}
```

### Submit Manual LLM Response

```bash
POST /api/v1/requests/{promiseId}/llm-response
Content-Type: application/json

{
  "response": "Paste your LLM response markdown here..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "promiseId": "prom_123...",
    "status": "completed",
    "note": "Manual LLM response processed"
  }
}
```

## Example Workflow

```bash
# 1. Start server with manual mode
export A2A_MANUAL_LLM_MODE=1
npm run start-all

# 2. Submit a request
PROMISE_ID=$(curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{"task": "Analyze this code", "context": {"execution": {"action": "agent"}}}' |
  jq -r '.data.promiseId')

echo "Promise ID: $PROMISE_ID"

# 3. Poll until status is waiting_manual_llm
while true; do
  STATUS=$(curl -s http://localhost:3000/api/v1/requests/$PROMISE_ID/result | jq -r '.data.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "waiting_manual_llm" ]; then
    break
  fi
  sleep 2
done

# 4. View the prepared messages
curl -s http://localhost:3000/api/v1/requests/$PROMISE_ID/result | jq '.data.execute.form.messages_preview'

# 5. Submit your manual LLM response
curl -X POST http://localhost:3000/api/v1/requests/$PROMISE_ID/llm-response \
  -H "Content-Type: application/json" \
  -d '{
    "response": "```json\n{\n  \"execute\": {\n    \"form\": {\n      \"title\": \"Analysis Complete\",\n      \"description\": \"The code looks good.\"\n    }\n  },\n  \"step\": \"complete\"\n}\n```"
  }'

# 6. Check final result
curl -s http://localhost:3000/api/v1/requests/$PROMISE_ID/result | jq '.data'
```

## Implementation Files

- `a2a-server/src/services/core/request/manual-llm.service.ts` — Core service for storing/retrieving pending manual LLM requests
- `a2a-server/src/services/core/request-processor/llm-orchestration.ts` — Hook that checks `A2A_MANUAL_LLM_MODE` and pauses
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts` — Handles manual wait response
- `a2a-server/src/routes/requests.routes.ts` — API endpoints for listing pending and submitting responses

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `A2A_MANUAL_LLM_MODE` | `0` (off) | Enable manual LLM mode. Set to `1`, `true`, or `yes` to enable. |
