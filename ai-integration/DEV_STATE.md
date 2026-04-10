# DEV_STATE — ai-integration (2026-04-07)

**Rules Q&A:** [`../docs/PROJECT-RULES-QA.md`](../docs/PROJECT-RULES-QA.md) · [`../AGENTS.md`](../AGENTS.md)

---

## Role for the north star

**Hub on 11434** sits between a2a-server and providers (e.g. Local LLM upstream **11435**). LLM traffic uses the **promise pipeline** (async); clients must poll — if the hub or **promise-queue daemon** is misconfigured, Task Monitor will see **`pending` / `processing`** until timeout. Repo root **`start-all.bat`** starts **`scripts/start-promise-queue-daemon.bat`** (`python scripts/promise_queue_daemon.py` → **`http://localhost:11434`**). **`GET /promises/pending`** lists **pending** only; **error** tickets are **not** auto-retried — use **`GET /promises/errors`**, then **`POST /promise/<id>/retry`** + **`POST /promise/<id>/execute`**, or **`DELETE /promise/<id>`** to remove. See [`docs/api-reference/PROXY_API.md`](docs/api-reference/PROXY_API.md) § *Promise queue*. Upstream **401** still needs correct **`providers.json` / `.env`** keys.

**Triangle vertex C** — [`docs/TRIANGLE-WORKFLOW.md`](../docs/TRIANGLE-WORKFLOW.md). **Black alert (proxy)** ([`GLOSSARY.md`](../GLOSSARY.md) *Alerts*).

---

## Fast checks

```bash
curl http://localhost:11434/health
curl http://localhost:11434/daemon/status
curl http://localhost:11435/api/tags
```

---

## Config notes (minimal)

- Providers: `config/providers.json` (from example) — see [`docs/configuration/PROVIDERS_AND_API_KEYS.md`](docs/configuration/PROVIDERS_AND_API_KEYS.md). `providers.example.json` includes Z.AI, Groq, OpenRouter, Qwen (DashScope intl), Codestral, Together, Cerebras, Cohere (`${VAR:-}` / `api_keys` pool). Wire `.env` from [`FREE_LLM_KEYS.md`](FREE_LLM_KEYS.md) § *.env format*; private notes: `FREE_LLM_KEYS.local.md` (gitignored).
- Traces: `proxy_logs/promises/<id>/` for LLM promise traffic.
- **Perf:** TTL prune (`_promise_prune_expired`) is throttled via **`PROMISE_PRUNE_INTERVAL_SECONDS`** (default **60**); collection endpoints use **`_load_promise_from_disk`** so `/promises/pending` stays **O(n)** with large `proxy_logs/promises/` trees. Set interval **`0`** only for debugging (prune every `get_promise`).

---

## Cross-links

- Proxy API: [`docs/api-reference/PROXY_API.md`](docs/api-reference/PROXY_API.md)
- Troubleshooting: [`docs/troubleshooting/TROUBLESHOOTING.md`](docs/troubleshooting/TROUBLESHOOTING.md)
- Root north star: [`../DEV_STATE.md`](../DEV_STATE.md)

---

## Verify

```bash
cd ai-integration && pytest
```

**Promise queue:** `tests/conftest.py` stops the in-process hub daemon between tests; `pytest tests/test_promise_queue_semantics.py` covers pending vs error + `/promises/errors`.
