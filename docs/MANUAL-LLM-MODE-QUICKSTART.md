# Manual LLM Mode — Quick Start

**Status: ENABLED** (`A2A_MANUAL_LLM_MODE=1` in `.env.local`)

## What is this?

Server stops before calling LLM and waits for YOU to provide the response. You can:
- Use external LLM providers (OpenAI, Claude, etc.)
- Craft exact responses for testing
- Debug prompt flows by inspecting messages
- Override LLM behavior for specific requests

## Quick Start (3 steps)

### 1. Start the stack

```bash
# From repo root
start-all.bat
```

### 2. Submit a request (normal way)

```bash
# Terminal 1 — Submit request
curl -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze ADR-0028 compliance",
    "context": {
      "execution": {"action": "agent"},
      "files": {"adr.md": "# ADR-0028..."}
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "promiseId": "prom_1775171234567_abc123",
    "status": "pending",
    "pollUrl": "/requests/prom_1775171234567_abc123"
  }
}
```

Save the `promiseId`!

### 3. Check status and submit manual response

```bash
# Terminal 2 — Check if waiting for manual input
PROMISE_ID="prom_1775171234567_abc123"

curl -s http://localhost:3000/api/v1/requests/$PROMISE_ID/result | jq
```

When ready, you'll see:
```json
{
  "data": {
    "status": "waiting_manual_llm",
    "manualLlmMode": true,
    "execute": {
      "form": {
        "title": "🛑 MANUAL LLM MODE — Operator Input Required",
        "messages_preview": [
          {"role": "system", "preview": "You are a helpful assistant..."},
          {"role": "user", "preview": "Task: Analyze ADR-0028 compliance..."}
        ],
        "submit_endpoint": "/api/v1/requests/prom_1775171234567_abc123/llm-response"
      }
    }
  }
}
```

Now submit your LLM response:

```bash
# Terminal 3 — Submit manual LLM response
curl -X POST http://localhost:3000/api/v1/requests/$PROMISE_ID/llm-response \
  -H "Content-Type: application/json" \
  -d '{
    "response": "```json\n{\n  \"step\": \"analysis_complete\",\n  \"message\": \"ADR-0028 is fully compliant.\",\n  \"execute\": {\n    \"form\": {\n      \"title\": \"Analysis Complete\",\n      \"description\": \"All checks passed.\"\n    }\n  }\n}\n```"
  }'
```

Done! Server continues processing with your response.

---

## Helper Script

Save as `manual-llm-helper.sh`:

```bash
#!/bin/bash
# Helper for manual LLM mode

API_BASE="http://localhost:3000/api/v1"

submit_request() {
    local task="$1"
    local action="${2:-agent}"
    
    RESPONSE=$(curl -s -X POST "$API_BASE/invoke" \
        -H "Content-Type: application/json" \
        -d "{
            \"task\": \"$task\",
            \"context\": {\"execution\": {\"action\": \"$action\"}}
        }")
    
    echo "$RESPONSE" | jq -r '.data.promiseId'
}

wait_for_manual() {
    local promise_id="$1"
    
    echo "Waiting for manual LLM mode..."
    while true; do
        STATUS=$(curl -s "$API_BASE/requests/$promise_id/result" | jq -r '.data.status')
        if [ "$STATUS" = "waiting_manual_llm" ]; then
            echo "Ready for manual input!"
            curl -s "$API_BASE/requests/$promise_id/result" | jq '.data.execute.form'
            return
        fi
        echo "Status: $STATUS (waiting...)"
        sleep 2
    done
}

submit_llm_response() {
    local promise_id="$1"
    local response_file="$2"
    
    RESPONSE=$(cat "$response_file")
    
    curl -X POST "$API_BASE/requests/$promise_id/llm-response" \
        -H "Content-Type: application/json" \
        -d "{\"response\": $(echo "$RESPONSE" | jq -s -R .)}"
}

list_pending() {
    curl -s "$API_BASE/requests/manual-llm/pending" | jq
}

# Usage examples
case "$1" in
    submit)
        PROMISE_ID=$(submit_request "$2" "${3:-agent}")
        echo "Promise ID: $PROMISE_ID"
        ;;
    wait)
        wait_for_manual "$2"
        ;;
    respond)
        submit_llm_response "$2" "$3"
        ;;
    pending)
        list_pending
        ;;
    *)
        echo "Usage:"
        echo "  $0 submit 'Your task here' [action]  — Submit request"
        echo "  $0 wait <promiseId>                   — Wait for manual mode"
        echo "  $0 respond <promiseId> <file>         — Submit LLM response from file"
        echo "  $0 pending                            — List pending requests"
        ;;
esac
```

Make executable and use:

```bash
chmod +x manual-llm-helper.sh

# Submit request
./manual-llm-helper.sh submit "Analyze this code"

# Wait for manual mode (in another terminal)
./manual-llm-helper.sh wait prom_1775171234567_abc123

# Submit response from file
./manual-llm-helper.sh respond prom_1775171234567_abc123 my-response.md
```

---

## Windows PowerScript Helper

Save as `manual-llm-helper.ps1`:

```powershell
$API_BASE = "http://localhost:3000/api/v1"

function Submit-Request {
    param([string]$Task, [string]$Action = "agent")
    
    $Body = @{
        task = $Task
        context = @{ execution = @{ action = $Action } }
    } | ConvertTo-Json -Depth 3
    
    $Response = Invoke-RestMethod -Uri "$API_BASE/invoke" -Method POST -ContentType "application/json" -Body $Body
    return $Response.data.promiseId
}

function Wait-ForManual {
    param([string]$PromiseId)
    
    Write-Host "Waiting for manual LLM mode..."
    while ($true) {
        $Result = Invoke-RestMethod -Uri "$API_BASE/requests/$PromiseId/result" -Method GET
        if ($Result.data.status -eq "waiting_manual_llm") {
            Write-Host "Ready for manual input!" -ForegroundColor Green
            return $Result.data.execute.form
        }
        Write-Host "Status: $($Result.data.status) (waiting...)"
        Start-Sleep -Seconds 2
    }
}

function Submit-LlmResponse {
    param([string]$PromiseId, [string]$Response)
    
    $Body = @{ response = $Response } | ConvertTo-Json
    Invoke-RestMethod -Uri "$API_BASE/requests/$PromiseId/llm-response" -Method POST -ContentType "application/json" -Body $Body
}

function Get-Pending {
    Invoke-RestMethod -Uri "$API_BASE/requests/manual-llm/pending" -Method GET
}

# Examples:
# $id = Submit-Request "Analyze this code"
# Wait-ForManual $id
# Submit-LlmResponse $id "Your LLM response here"
# Get-Pending
```

---

## Response Format

Your manual LLM response should match what the LLM would return. Typical format:

```markdown
```json
{
  "step": "step_name",
  "message": "Human-readable message",
  "execute": {
    "form": {
      "title": "Form Title",
      "description": "Form description"
    }
  },
  "workbench": {
    "sections": {
      "analysis": {"content": "Analysis content"}
    }
  }
}
```
```

Or with interrupt for gray room:

```markdown
```json
{
  "step": "thinking",
  "message": "Need to analyze further",
  "interrupt": {
    "reason": "thinking",
    "data": {"topic": "analysis"}
  }
}
```
```

---

## Checklist

- [ ] `start-all.bat` running
- [ ] `A2A_MANUAL_LLM_MODE=1` in `.env.local`
- [ ] Submit request, get `promiseId`
- [ ] Poll `/requests/{id}/result` until `waiting_manual_llm`
- [ ] Review `messages_preview` to see what LLM would receive
- [ ] Craft and submit response via `POST /requests/{id}/llm-response`
- [ ] Poll again to see final result

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Status stays `pending` | Server processor not running. Check `start-all.bat` logs. |
| Status `processing` forever | Check if Ollama/generation stuck per `docs/OPERATOR-CURL.md`. |
| `404 Not Found` | Wrong `promiseId`. List pending: `GET /requests/manual-llm/pending`. |
| Submit fails | Ensure `Content-Type: application/json` header is set. |
| Gray room not triggering | Response needs proper JSON with `step`, `message`, `execute`. |

---

## Full Documentation

See [`MANUAL-LLM-MODE.md`](./MANUAL-LLM-MODE.md) for complete API reference and architecture details.
