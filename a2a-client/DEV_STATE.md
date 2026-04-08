# DEV_STATE — a2a-client (2026-04-08)

**Rules Q&A:** [`../docs/PROJECT-RULES-QA.md`](../docs/PROJECT-RULES-QA.md) · [`../AGENTS.md`](../AGENTS.md)

---

## Role for the north star

This module **owns session persistence and the Client API** (`/api/a2a/*`). Task Monitor and manual operators must go through **5173** (or standalone SDK with the same contract): create session → `/next` → poll **`GET …/async`** until settled; hydrate with **`GET …/sessions/{id}`** when debugging router/forms. **Hub promise queue** (vertex **C**): **`/api/a2a/hub/*`** proxies to **`AI_HUB_URL`** (`promises/pending`, `promises/errors`, `promise/{id}/retry|execute`, `DELETE …`) — Web UI **Hub queue** button; see [`ai-integration/docs/api-reference/PROXY_API.md`](../ai-integration/docs/api-reference/PROXY_API.md).

**Triangle vertex A** — [`docs/TRIANGLE-WORKFLOW.md`](../docs/TRIANGLE-WORKFLOW.md). Triage labels often starting here: **Blue** / **Orange** / **Teal** ([`GLOSSARY.md`](../GLOSSARY.md) *Alerts*).

---

## Session correctness (what must work)

- **Async-only:** no sync invoke flag; after `/next`, drive **`/async`** (and promise polling helpers) until terminal — see root [`AGENTS.md`](../AGENTS.md). **`POST …/next` while a step still has in-flight `server-promise.json` → `409` `async_pending`** (no overlapping turns; router beats stay valid). Evidence: `npx vitest run tests/unit/step-routes-next-async-pending.test.js` (2026-04-07).
- **Router:** if latest `execute.form` has **`choices`**, next body uses **`result.choice`** / shorthand `task` as choice id; otherwise **`result.message`** / `task` as text — [`AGENTS.md`](../AGENTS.md) *Router dialog*.
- **Storage:** `a2a-client/storage/sessions/{id}/{step}/` — rebuild from highest step with `server-response.json` when investigating monitor sessions.
- **Session cleanup:** No age-based pruning — `npm run cleanup:sessions` (or root `cleanup:sessions-only` / `cleanup:state`) wipes **all** session trees; monitor then keeps **one** session id per task file until completion ([`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)).
- **Agent tool chain (`chain-guards` + `agent-rag-chain`):** `execute['run-script']` must chain when the model sends **`command`** (shell one-liner) as well as **`scriptId`** (registry). Previously only `scriptId` validated — sessions stuck on `tool_run_script` with no `context.result`. Evidence: `tests/direct-tests/chain-guards-message-plus-tool.test.mjs`.
- **GET `/sessions/:id/async?includeContext=1`:** Task Monitor’s `pollAsync` now requests **`includeContext=1`**; Vite adds **`context.execution`** to the JSON when present so **`step`/`action`** are visible (web `execute` projection omits them). Without this, `agentToolPhaseStart` / stall keys never saw `tool_*` and runs could spin until poll timeout.

---

## Stack / integration lock

- **AI-Integration work lock:** UNBLOCKED (hub required for LLM path).

---

## Ports

| Port | Use |
|------|-----|
| 5173 | Vite + Client API (default Task Monitor target) |
| 3001 | Standalone Client API (optional) |

---

## Verify after changes

```bash
cd a2a-client && npm test
```

**Hub proxy:** Vite `tests/unit/hub-promise-routes.test.js` (middleware); SDK router `tests/integration/hub-proxy-client-api.test.js` (Express `createHubProxyRouter`). Smoke: `node scripts/smoke-client-api.mjs` hits `/api/a2a/hub/promises/pending`.

After edits to **`packages/embedding/src`**, run **`cd packages/embedding && npx tsc`** so Vitest (which loads **`dist/`**) matches source. **`shared/api-helpers.js`** re-exports the repo-root [`shared/api-helpers.js`](../shared/api-helpers.js) for `packages/sdk` relative imports.

Deep API checklist: [`docs/api-testing-plan.md`](docs/api-testing-plan.md) · [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md).
