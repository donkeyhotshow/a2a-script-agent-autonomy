# a2a-ai-hub — documentation

Use this folder for proxy / AI Hub–specific docs (endpoints, env, promise flow).

Repo-wide context: [`../../AGENTS.md`](../../AGENTS.md), [`../../docs/new-request-flow/`](../../docs/new-request-flow/).

Operational notes today: [`../DEV_STATE.md`](../DEV_STATE.md).

## Index

| Doc | Topic |
|-----|--------|
| [`configuration/PROVIDERS_AND_API_KEYS.md`](configuration/PROVIDERS_AND_API_KEYS.md) | `api_keys` pool, Local LLM upstream `__LOCAL_LLM_KEY_PLACEHOLDER__`, rate-limit failover, `routing.json`, secrets in JSON not `.env` |
| [`../config/README.md`](../config/README.md) | `providers.json` vs `providers.example.json`, gitignore, loader fallback |
| [`api-reference/PROXY_API.md`](api-reference/PROXY_API.md) | HTTP surface: health, `/api/tags`, **promise queue** (`/promises/*`, retry/delete), **`/v1/*` OpenAI-compatible**, errors |
| [`TESTING.md`](TESTING.md) | `pytest`, `/v1` route prefix in tests |
| [`troubleshooting/TROUBLESHOOTING.md`](troubleshooting/TROUBLESHOOTING.md) | §9 upstream limits (1302), auth |

Upstream key limits, 1302/1001, retries: [`troubleshooting/TROUBLESHOOTING.md`](troubleshooting/TROUBLESHOOTING.md) §9 · API table: [`api-reference/PROXY_API.md`](api-reference/PROXY_API.md) (*Upstream provider JSON errors*).
