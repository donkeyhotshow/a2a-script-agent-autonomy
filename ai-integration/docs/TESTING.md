# Testing (ai-integration)

From the **`ai-integration`** directory (repo: `a2a-script-agent/ai-integration`):

```bash
pip install -r requirements.txt
python -m pytest tests/ -q
```

### Layout

| Path | Focus |
|------|--------|
| `tests/providers/test_config_loader.py` | `config/providers.json` parsing, `api_keys`, defaults |
| `tests/providers/test_router.py` | `ProviderRouter`, provider chain |
| `tests/providers/test_openai_wrapper.py` | OpenAI-compatible HTTP handlers (`proxy/openai_wrapper.py`) |

### OpenAI-compatible routes (`/v1/...`)

The wrapper is a Flask blueprint with **`url_prefix='/v1'`**. Valid paths include:

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/embeddings`
- `GET /v1/models`
- `GET /v1/providers`

Requests without the `/v1` prefix return **404**. See [`api-reference/PROXY_API.md`](api-reference/PROXY_API.md) (*OpenAI-Compatible API*).

### Providers config in tests

Tests that load `providers.json` use whatever exists locally or fall back to defaults / `providers.example.json` per [`proxy/providers/config_loader.py`](../proxy/providers/config_loader.py). CI does not require real API keys for unit tests.
