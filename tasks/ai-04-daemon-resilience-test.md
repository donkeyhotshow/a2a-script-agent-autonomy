# AI-04: Automated Daemon Resilience Test

## Problem
Need automated test coverage for daemon behavior when provider disconnects/reconnects.

## Solution
Create an automated test that:
1. Starts a mock provider or uses real Ollama
2. Simulates disconnect (stops provider)
3. Verifies daemon handles reconnection gracefully
4. Verifies health endpoint recovers

## Where
- Test file: `ai-integration/tests/providers/test_daemon_resilience.py`

## Implementation
```python
import pytest
import requests
import subprocess
import time

class TestDaemonResilience:
    def test_reconnect_after_ollama_restart(self):
        """Verify daemon recovers after Ollama restart."""
        # 1. Make initial request
        r = requests.post("http://localhost:11434/promise/execute", 
                          json={"prompt": "test", "model": "qwen3:8b"})
        promise_id = r.json().get("promiseId")
        
        # 2. Restart Ollama
        subprocess.run(["docker-compose", "-f", "ai-integration/docker-compose.yml", 
                       "restart", "ollama"], check=True)
        
        # 3. Wait for recovery
        time.sleep(5)
        
        # 4. Verify health
        r = requests.get("http://localhost:11434/health")
        assert r.status_code == 200
        
        # 5. Verify promise eventually completes or fails gracefully
        for _ in range(30):
            r = requests.get(f"http://localhost:11434/promise/{promise_id}/status")
            if r.json().get("status") in ["completed", "failed"]:
                break
            time.sleep(1)
```

## Verification
```bash
cd ai-integration && python -m pytest tests/providers/test_daemon_resilience.py -v
```
