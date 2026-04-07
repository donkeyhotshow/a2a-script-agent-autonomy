# DEV_STATE — a2a-client (2026-04-07)

**Rules Q&A:** [`../docs/PROJECT-RULES-QA.md`](../docs/PROJECT-RULES-QA.md) · [`../AGENTS.md`](../AGENTS.md)

---

## Role for the north star

This module **owns session persistence and the Client API** (`/api/a2a/*`). Task Monitor and manual operators must go through **5173** (or standalone SDK with the same contract): create session → `/next` → poll **`GET …/async`** until settled; hydrate with **`GET …/sessions/{id}`** when debugging router/forms.

**Triangle vertex A** — [`docs/TRIANGLE-WORKFLOW.md`](../docs/TRIANGLE-WORKFLOW.md). Triage labels often starting here: **Blue** / **Orange** / **Teal** ([`GLOSSARY.md`](../GLOSSARY.md) *Alerts*).

---

## Session correctness (what must work)

- **Async-only:** no sync invoke flag; after `/next`, drive **`/async`** (and promise polling helpers) until terminal — see root [`AGENTS.md`](../AGENTS.md).
- **Router:** if latest `execute.form` has **`choices`**, next body uses **`result.choice`** / shorthand `task` as choice id; otherwise **`result.message`** / `task` as text — [`AGENTS.md`](../AGENTS.md) *Router dialog*.
- **Storage:** `a2a-client/storage/sessions/{id}/{step}/` — rebuild from highest step with `server-response.json` when investigating monitor sessions.
- **Agent tool chain (`chain-guards` + `agent-rag-chain`):** `execute['run-script']` must chain when the model sends **`command`** (shell one-liner) as well as **`scriptId`** (registry). Previously only `scriptId` validated — sessions stuck on `tool_run_script` with no `context.result`. Evidence: `tests/direct-tests/chain-guards-message-plus-tool.test.mjs`.

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

After edits to **`packages/embedding/src`**, run **`cd packages/embedding && npx tsc`** so Vitest (which loads **`dist/`**) matches source. **`shared/api-helpers.js`** re-exports the repo-root [`shared/api-helpers.js`](../shared/api-helpers.js) for `packages/sdk` relative imports.

Deep API checklist: [`docs/api-testing-plan.md`](docs/api-testing-plan.md) · [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md).
