# AI-02: Timeout Tuning for Slow Model Response

## Problem
Current timeout values in proxy/config.py may be too strict or too loose for production use with qwen3:8b model.

## Solution
Review and tune timeout values:
1. Read current timeouts from `proxy/config.py`
2. Test with slow model responses (simulate 60s response)
3. Adjust `REQUEST_TIMEOUT`, `LLM_TIMEOUT`, `CONNECT_TIMEOUT`:
   - CONNECT_TIMEOUT: 10s (connection should be fast)
   - REQUEST_TIMEOUT: 120s (for slow models like qwen3:8b)
   - LLM_TIMEOUT: 180s (allow full generation time)

## Where
- File: `ai-integration/proxy/config.py`

## Verification
```bash
# Test slow response
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b","prompt":"write a long story","options":{"timeout":120}}'

# Check logs for timeout errors
grep -i timeout ai-integration/proxy_logs/*.log
```

## Test
Add test: `ai-integration/tests/providers/test_config.py::test_timeout_values`
