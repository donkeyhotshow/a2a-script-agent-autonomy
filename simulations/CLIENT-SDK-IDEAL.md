# Simulations ↔ `@a2a/sdk` — ideal Web / Client API contract

Golden simulations under `simulations/` define what **Web** and **`@a2a/sdk`** should assume. Use them to upgrade the client (auto-replies, session merge, action routing) without guessing server behavior.

## Source of truth in each step

| File | Consumer |
|------|-----------|
| `received.json` | **Web UI** — what the Client API returns after a step (shape the renderer and loaders expect). |
| `response.json` | **SDK session merge** — same payload the server hands the Client API before envelope wrapping. |
| `client.json` | Web → Client API (body the SDK route receives). |

`a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts` merges `context`, `execute`, `messages`, `history`, `workbench`, `finalResult`. Ideal `response.json` / `received.json` should carry every field the UI or persistence layer needs.

## Execute: action-key shape (mandatory)

- Exactly **one** top-level key under `execute` for the active command (`form`, `read-file`, `rag-search`, …).  
- **SDK note:** `extractExecuteAction()` in `action-handler.ts` uses **`Object.keys(execute)[0]`**. Do not put a second key in golden fixtures; extra keys are non-deterministic across engines if someone parses naively.

## `execute.form` (ideal for `handleFormAction` / Web)

Aligned with `simulation-helpers.ts` (`FormChoice`, `FormInput`) and `ui-handlers.ts`.

- **`choices[]`:** each item has `id`, `label`; **recommended** `description` (subtitle / help in UI).
- **`input[]`:** each has `name`, `type` ∈ `text` | `textarea` | `select` | `checkbox` | `number`; optional `label`, `required`, `placeholder`, `default`, `options` for `select`.
- **`title`:** short; optional `description` at form level (SDK passes through).

## `execute` actions the SDK executes today

Handled in `handleExecuteAction`: `script`, `read-file`, `write-file`, `rag-search`, `execute-command`, `form`, `message`.

**Gap (upgrade target):** `list-directory`, `grep-search`, and other auto-ai tools are **not** in that switch — `detectResponseType()` returns `unknown`. Golden sims that use those steps should still use canonical payloads; client work = add handlers + extend `clientActionTypes` / `detectResponseType`.

## `execute.message` (assistant / system text)

SDK merges string or `{ content }` into session messages (`session-transform.ts`). Ideal:

- Prefer **string** for simple status lines.
- Or `{ "content": "...", "role": "assistant" }` when the UI must distinguish role.

## `context` fields the client should preserve

| Field | Use |
|-------|-----|
| `task` | Required by invoke response schema; shown in UI headers. |
| `execution.action` / `execution.step` | Routing, flow hints, step labels. |
| `history` | Chat / tool summary lines (`user` / `assistant` / `system`). |
| `workbench` | Structured flow state: `sections`, optional `batch`, optional `slots`. Use `truncate-section` on `context.workbench.sections` when trimming for the LLM. |
| `files` | Working set (ISSUE 6) — SDK should persist when present. |
| `scratchpad` | Checklist flags — persist when present. |

## Out of scope in step fixtures (runtime only)

Per `SCHEMA.md`: `promiseId`, polling, `execute.wait` / loader timing. Document separately in `LOADER-BEHAVIOR.md` when testing E2E.

## How to “raise the bar” on a simulation

1. **`received.json` = `response.json`** execute + context slice the Web needs (ids, labels, descriptions).  
2. **Action-key** payloads include **pagination** for `rag-search` where applicable.  
3. **Form fields** use SDK-allowed `type` values only.  
4. **Router steps** list the same `id`s the server exposes (`action-request-processor` `ROUTER_CHOICES`).  
5. Add **`description`** on at least primary `choices` so the UI golden is non-ambiguous.

## Sequential steps and accumulated context (any mode)

“Batching” is **not** only `script` over many files. Any flow that runs **multiple rounds** (RAG, read-file, forms, LLM turns, checklist items) should document **where each `result` is merged** (`history`, `files`, `scratchpad`, `workbench`, or flow-specific fields) so the next request has deterministic state. See **`simulations/SCHEMA.md` → Sequential multi-step flows and accumulated context**.

Reference upgraded step: **`simulations/dialog/1`**.
