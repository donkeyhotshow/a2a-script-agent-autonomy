# Simulations: system behavior and server contract

Golden fixtures under this directory are **living documentation** of how the product stack is supposed to behave for the **synchronous** protocol path. They complement runtime tests: they pin the **shape** and **story** of each step (router, forms, tools, transforms, context).

Authoritative layout and rules: [`SCHEMA.md`](./SCHEMA.md). Quick index: [`README.md`](./README.md).

---

## What simulations demonstrate

Together, the goldens show **end-to-end contract behavior** for:

| Layer | What is fixed by fixtures |
|-------|---------------------------|
| **Server** | `request.json` / `response.json`: single action key under `execute`, action-key `result`, `context` (`execution`, `history`, `workbench`, …), transforms (`server-transforms-*.json`). |
| **Client API → Web** | `received.json`: Web execute DTO after sanitization (no client-only tool keys under top-level `execute`; see `buildWebExecute` in client code). |
| **Flows** | Router choices, dialog + LLM tool turns, agent coder/smart paths, analyze/RAG-style steps, deterministic “fix” actions, task decomposition, orchestration, invoke edge cases, gray-room **internal** traces. |

So: **simulations show how the system is designed to work** for the sync contract; they are the **reference** when changing processors, transforms, or the Client API merge.

`sim-lint --all` currently validates **89** registered step/scenario roots (each named like `scenario/step` or a root scenario with `request.json`).

---

## Scenario families (top-level folders)

| Folder | What it exercises |
|--------|-------------------|
| `agent` | Entry / router → `execute.form.choices` |
| `agent-analyze` | Analysis flows, RAG-style steps |
| `agent-auto-ai` | Auto-AI pipeline; optional `N-sub-M/` for **server-only** interrupt loops |
| `agent-coder` | Agent coding path after routing |
| `agent-coder-smart` | Smart coder variant |
| `agent-workspace-tools` | Protocol tools (`list-directory`, `grep-search`, `read-file`, …) |
| `dialog` | Dialog-only flows |
| `fix-laravel-namespaces-and-uses` | Deterministic Laravel-oriented action |
| `fix-vue-imports*` | Deterministic Vue import flows (single, batched, decline) |
| `interrupt-thinking` | Interrupt / transform examples |
| `invoke-form-confirmation` | Form confirmation edge |
| `invoke-simulation-record` | Simulation recording helper |
| `orchestrator-dialog` | Orchestration |
| `phpunit-deprecations` | Domain regression |
| `task-decomposition` | Decomposition / planning |

`_audit` is for audit tooling, not a user-facing scenario.

---

## What simulations are **not** (scope limits)

From [`SCHEMA.md`](./SCHEMA.md) (“Scope: simulations vs runtime”):

- **Async infrastructure** — `promiseId`, polling, retries, loader / `execute.wait` timing are **not** modeled as golden steps.
- **Automatic live E2E** — Fixtures are file-based; proving the **running** server matches them requires separate checks (integration tests, manual invoke).
- **`N-sub-M/` substeps** — Document **gray room** / server-internal extra turns; the web client still sees **one** outbound `response.json` / `received.json` per user invoke.

---

## Server-side gaps and manual follow-ups

These are **known blind spots**, not necessarily bugs:

| Gap | Why it matters |
|-----|----------------|
| **Markdown vs JSON** | `request.md` / `response.md` can drift from sibling `.json`; there is no strict CI equality check. Use [`SIM-AUDIT-WORKBOOK.md`](./SIM-AUDIT-WORKBOOK.md). |
| **Execute allowlist** | `VALID_EXECUTE_TYPES` in `a2a-server/scripts/sim-lint.ts` must stay aligned with real handlers and transforms when adding tools. |
| **Two HTTP surfaces** | Full web app uses Client API + session store; `POST /api/v1/invoke` is the server core. Goldens align with the **protocol contract**; see repo `AGENTS.md` for endpoint confusion. |
| **Substep validation** | `sim-validate` does not treat each `N-sub-M/` as a standalone end-user simulation (by design). |

When server behavior changes, update **code and goldens together** so `sim:lint` / `sim:validate` stay green.

---

## Commands

```bash
cd a2a-server && npm run sim:lint -- --all --json
cd a2a-server && npm run sim:validate -- --all --json
```

Related: [`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](../a2a-server/docs/EXTENDING-LLM-ACTIONS.md), [`a2a-server/DEV_STATE.md`](../a2a-server/DEV_STATE.md) (operational notes).
