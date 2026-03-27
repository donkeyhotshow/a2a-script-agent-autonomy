# AI-01: Daemon Resilience on Provider Disconnect

## Problem
Daemon crashes or becomes unresponsive when provider (Ollama) connection is unavailable.

## Solution
Add exponential backoff reconnect logic:
1. Detect connection failure in provider adapter
2. Retry with increasing delay (1s, 2s, 4s, 8s, max 30s)
3. Log each retry attempt
4. Only mark promise as failed after max retries exhausted

## Where
- File: `ai-integration/proxy/providers/ollama_provider.py`
- Method: `_make_request` or adapter layer

## Verification
```bash
# 1. Stop Ollama
docker-compose -f ai-integration/docker-compose.yml stop ollama

# 2. Make async request
curl -X POST http://localhost:11434/promise/execute -d '{"model":"qwen3:8b","prompt":"test"}'

# 3. Start Ollama
docker-compose -f ai-integration/docker-compose.yml start ollama

# 4. Verify proxy recovers
curl http://localhost:11434/daemon/status  # Should show "recovered" within 30s
```

## Test
Add test: `ai-integration/tests/providers/test_ollama_provider.py::test_reconnect_on_disconnect`
