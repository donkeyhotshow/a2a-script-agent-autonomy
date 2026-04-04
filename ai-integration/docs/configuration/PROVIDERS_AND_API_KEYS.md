# Providers and API keys (`config/providers.json`)

The proxy loads **`config/providers.json`** first (or `PROVIDERS_CONFIG` if set). If that file is absent, it tries **`config/providers.example.json`**, then other paths. See [`config/README.md`](../../config/README.md). `providers.json` is **gitignored** in this module; use the example file as a template.

Upstream credentials for cloud providers are **not** taken from client requests; the proxy injects `Authorization` itself.

## Bootstrap (repo / CI)

- **Tracked template:** `config/providers.example.json` (placeholders, no real secrets).
- **Local file:** `config/providers.json` is **gitignored** — create it once:
  - `python scripts/ensure-providers-config.py`, or
  - `cp config/providers.example.json config/providers.json`
- Paste Z.AI keys into `api_keys` and `providers.z_ai.api_key` (same primary as first `api_keys` row).
- If you previously committed `providers.json`, stop tracking it: `git rm --cached config/providers.json` (keeps your local file).

## Two layers

1. **`providers`** — logical backends (`z_ai`, `ollama`, `groq`, …): URL, type, model lists, priority, optional legacy `api_key`.
2. **`api_keys`** — **pool of credentials**: each row has a global **`id`**, a **`provider`** name (must match a key under `providers`), and a **`secret`**.

Routing still picks a **provider** by model; **which secret** is used comes from the `api_keys` rows for that provider (see below).

## `api_keys` entry shape

| Field | Meaning |
|--------|---------|
| `id` | Stable identifier (e.g. `z-ai-primary`). Surfaced on `GET /api/tags` as `api_key_id` for the first key of that provider. |
| `provider` | Same string as in `providers` (e.g. `z_ai`, `ollama`). |
| `secret` | Bearer token for cloud APIs, or the Ollama placeholder (below). Values may use `${ENV_VAR}` syntax; the loader resolves env **after** reading the file. |
| `enabled` | If `false`, the row is skipped. |
| `priority` | **Lower number = tried first.** On rate-limit failover, the proxy tries the **next** enabled row for the **same** `provider`. |

### Ollama (`__OLLAMA_LOCAL__`)

Local Ollama does not use a real API key. Use a single row with:

```json
"secret": "__OLLAMA_LOCAL__"
```

The proxy **does not** send `Authorization` for that credential.

## Legacy `providers.*.api_key`

If a provider has **no** rows in `api_keys` for its `provider` name, the loader **backfills** one logical key from `providers.<name>.api_key` (resolved env references included). If `api_keys` already lists keys for that provider, legacy `api_key` is not duplicated.

## Rate-limit failover (same provider)

For a routed cloud request, the proxy may try several secrets **for the same provider** before giving up:

- HTTP **429**
- JSON body `error.code` **1302** (Z.AI), or messages indicating rate limit / too many requests

Implementation: [`proxy/api_key_routing.py`](../../proxy/api_key_routing.py) (`forward_with_api_key_failover`).

## Async / daemon / promises

When request logging is enabled, the proxy may write **`routing.json`** next to the request log with:

- `provider`, `provider_type`, `upstream_key_failover`

The built-in promise daemon uses that file to repeat the same **key-pool** behavior when executing the promise, instead of relying on a single frozen `Authorization` header from the client snapshot.

## Policy: where secrets live

**Recommended for this repo:** store API keys **in `config/providers.json`** under `api_keys` / `providers.*.api_key`, and **do not** put them in **`.env`**.

- `.env` remains for non-secret settings (ports, paths, optional `Z_AI_BASE_URL` / `Z_AI_MODEL`, etc.) if you use them.
- If the repository is **public** or shared, avoid committing real keys: use a private overlay file, gitignored copy, or secrets manager — same rules as any committed JSON.

## Quick example

```json
{
  "api_keys": [
    {
      "id": "ollama-local",
      "provider": "ollama",
      "secret": "__OLLAMA_LOCAL__",
      "enabled": true,
      "priority": 1
    },
    {
      "id": "z-ai-primary",
      "provider": "z_ai",
      "secret": "<paste-or-${ENV}>",
      "enabled": true,
      "priority": 1
    },
    {
      "id": "z-ai-backup",
      "provider": "z_ai",
      "secret": "<second-key>",
      "enabled": true,
      "priority": 2
    }
  ],
  "providers": { }
}
```

## Code references

| Area | File |
|------|------|
| Load / merge / backfill | [`proxy/providers/config_loader.py`](../../proxy/providers/config_loader.py) |
| Failover + rate-limit detection | [`proxy/api_key_routing.py`](../../proxy/api_key_routing.py) |
| HTTP forward + `routing.json` | [`proxy/proxy_handler.py`](../../proxy/proxy_handler.py) |
| Daemon execute | [`proxy/daemon.py`](../../proxy/daemon.py) |
| Tags `api_key_id` | [`proxy/providers/router.py`](../../proxy/providers/router.py) |
| Bootstrap copy `providers.example.json` → `providers.json` | [`scripts/ensure-providers-config.py`](../../scripts/ensure-providers-config.py) |

## Related docs

- HTTP API (including `/v1/*`): [`../api-reference/PROXY_API.md`](../api-reference/PROXY_API.md)
- Running tests: [`../TESTING.md`](../TESTING.md)
