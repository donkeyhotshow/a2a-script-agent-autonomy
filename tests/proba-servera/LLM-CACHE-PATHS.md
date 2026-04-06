# Proba → LLM disk cache (L3) path inventory

Proba drives **a2a-server** in-process (default) or HTTP invoke; the server calls **ai-integration** (AI hub, default `AI_HUB_URL` → `11434`), which forwards to **Ollama** (`11435`).

## Hub entry: promise vs sync

| Hub route | Proba / gray-room usage | L3 cache mechanism |
|-----------|-------------------------|---------------------|
| `POST /api/chat?promise=1` | **All** `initAiHubChatPromise` callers: dialog `executeLlmCall`, gray-room loop, thinking interrupt, black-room, agent-swing, `llm-orchestration` | **Promise** path: `try_resolve_promise_from_cache` (inline **200** + `responseBody`) or `forward_promise_with_llm_disk_cache` (worker) or **daemon** retry worker — same `build_llm_cache_payload` / `normalize_body_for_cache` |
| `POST /api/chat` (no promise) | Rare for this stack; would be non-promise forward in `proxy_handler` | **Sync** path: `upstream_client.check_cache` / `save_to_cache` |
| `POST /api/v1/generate`, `/api/v1/embed` | Not the main dialog/gray-room contour | `build_v1_api_cache_key` (separate namespace) |

`fetchAiHubChatJson` (`ai-hub-chat-sync.ts`) uses **promise=1**; gray-room sub-calls use the same. **`X-Server-Promise-Id` is not part of the cache key** (only JSON body + path/method/url/forward_args).

## a2a-server call sites (non-exhaustive labels)

- `llm-orchestration.ts` — main dialog LLM
- `gray-room-orchestrator.ts` — follow-up turns (`-intr-{budget}` header only)
- `gray-room-interrupt-handlers/thinking.ts` — `-think` suffix
- `black-room-orchestrator.ts`, `agent-swing.ts`, `llm-judge.ts`, `fetchAiHubChatJson` / `LlmService`

## Measuring hits/misses

On **ai-integration**, set `LLM_DISK_CACHE_LOG=1`. Logs look like:

`llm_disk_cache outcome=hit|miss|store stage=promise_inline|promise_bg|daemon|sync path=... key_prefix=...`

After `npm run validate:proba-servera`, grep hub stdout/log for `llm_disk_cache`.

## Normalization (key stability)

`normalize_body_for_cache` strips volatile keys, drops `promise` from bodies, removes adapter noise on **`messages[]`** (`id`, `message_id`, …), **sorts `options`** and **`tools`** (by `function.name`), and adds tracing-style keys to the volatile set. It does **not** strip semantic text inside `content` (e.g. embedded UUIDs in prose).

Stateless invokes use stable **`srv_sess_stateless`** as `context.session_id` (see `invoke.service.ts`) so repeat proba runs share cache material; client/storage ids still become fresh `srv_sess_*`.
