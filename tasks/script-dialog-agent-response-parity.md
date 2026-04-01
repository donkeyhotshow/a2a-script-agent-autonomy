# S14 — Script mode response parity with dialog / agent

**Status:** partial  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (focus §2, row S14)

## Goal

The script-driven path (`execute.script` and related flows) should expose **the same response contract** as dialog and agent modes where it matters for operators and UI: forms, messages, workbench visibility, and golden-simulation shape — not only the LLM input pipeline (covered by S2/S5).

## Contract matrix (script vs dialog vs agent)

| Concern | **Script** (orchestrated action, e.g. `fix-vue-imports`) | **Dialog** | **Agent** |
|--------|------------------------------------------------------------|------------|-----------|
| **`execute`** | Same action-key rule: one key (`form`, `script`, `run-script`, `execute-command`, `message`, …). Router uses `execute.form.choices` like other modes. | `form`, `message`, … | Tools: `read-file`, `grep-search`, `write-file`, … + `form` / `message` |
| **`result`** | Client returns `result.script`, `result.run-script`, `result.execute-command`, `result.choice`, `result.message` — single key per turn. | `result.message`, `result.choice` | Same action keys as server tools + `message` / `choice` |
| **`context.history`** | May accumulate scripted + system rows the same shape as agent (`role`, `message`, optional `step` / `action`). Central golden: steps 4–10 in [`simulations/sync/script/`](../simulations/sync/script/). | Grows per user/assistant turns | Grows per tool loop |
| **`context.workbench`** | `sections` / optional `slots` use the same object model; script goldens now carry **non-empty** `sections` mid-chain (e.g. `vueImportFix`) for parity with rich agent payloads. | Same | Same (+ gray-room `slots` in some flows) |
| **Web DTO / `received.json`** | `buildWebExecute` strips client-only keys; pending `script` surfaces as `attachments.pendingClientAction` (see per-step `received.json`). | Same sanitizer | Same |
| **Session persistence** | Client API stores steps under `a2a-client/storage/sessions/` regardless of mode; reconstruct from highest step with `server-response.json`. No script-specific omission of fields the UI reads. | Same | Same |

## Why this task exists

- Focus §2 in `work/STATE.md` states a **single data language** for script vs agent so data can be rendered one way.
- S2/S5 addressed **what reaches the LLM** and **workbench bloat**, not full **end-to-end parity** of user-visible / client-sanitized responses.

## Scope (non-exhaustive)

1. **Server:** responses for script actions align with action-key shape; intermediate steps behave consistently with dialog/agent where applicable.
2. **Client / Web DTO:** sanitization rules (`received.json` contract in sims) apply consistently — no special-case holes for script-only responses.
3. **Session steps:** storage under `a2a-client/storage/sessions/` remains reconstructible; script turns do not skip fields the UI expects.
4. **Sims:** add or extend golden coverage so script paths are as linted/validated as dialog/agent (see `simulations/SCHEMA.md`, AGENTS.md).

## References

- [`AGENTS.md`](../AGENTS.md) — action-key shape, Web DTO, Client API flow.
- [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) — simulation contract.
- [`work/STATE.md`](../work/STATE.md) — § «Script vs dialog/agent», S2/S5 notes.

## Golden simulations

- **`simulations/sync/script/`** — **central** 10-step sync golden: router → scope `form` → three `execute.script` rounds with `result.script` → `run-script` → human `form` → `execute-command` → auto `message` → follow-up `form`. Steps **4–10** include sample **`context.history`** and **`workbench.sections`**. Smaller domain sims (`fix-vue-imports/*`, …) stay scenario-sized.

## Live E2E (stack)

- [`scripts/e2e-client-api-replay-sync-script.mjs`](../scripts/e2e-client-api-replay-sync-script.mjs) — POST `/api/a2a/sessions`, then `/next` + poll `/async` using golden `client.json` bodies (smoke; server path may differ from files).

## Acceptance (draft)

- [x] Documented matrix: script vs dialog vs agent for `execute`, `result`, `context.workbench` / `history`, client payload, persistence.
- [x] Golden `simulations/sync/script` passes `sim:lint` / `sim:validate` (ongoing).
- [ ] Optional: short ADR if this matrix moves to `docs/adr/` later.
