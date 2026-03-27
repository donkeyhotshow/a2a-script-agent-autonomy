# AI-05: PROVIDER_TIMEOUT Decision for Slow External Providers

## Problem
External provider timeout (`PROVIDER_TIMEOUT=30`) may be too strict for slow non-Ollama backends.

## Solution
Make PROVIDER_TIMEOUT configurable and document recommended values:
1. Default remains 30s (fast providers)
2. Document slow provider configuration in config.py
3. Add environment variable override

## Where
- File: `ai-integration/proxy/config.py`
- Review: `ai-integration/proxy/providers/`

## Implementation
In `config.py`, change:
```python
PROVIDER_TIMEOUT = int(os.environ.get('PROVIDER_TIMEOUT', '30'))
```

Document in `docs/troubleshooting/TROUBLESHOOTING.md`:
```markdown
## PROVIDER_TIMEOUT

For slow external providers (e.g., remote OpenAI-compatible APIs with high latency):
- Set `PROVIDER_TIMEOUT=120` in environment
- For Ollama local: default 30s is sufficient
```

## Verification
```bash
# Test with custom timeout
PROVIDER_TIMEOUT=120 python -m pytest tests/providers/test_ollama_provider.py -v
```
