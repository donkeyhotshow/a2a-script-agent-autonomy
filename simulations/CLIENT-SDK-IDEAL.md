# Simulations ↔ `@a2a/sdk` — ideal Web / Client API contract

Golden simulations under `simulations/` define what **Web** and **`@a2a/sdk`** should assume. Use them to upgrade the
client (auto-replies, session merge, action routing) without guessing server behavior.

## Source of truth in each step

| File            | Consumer                                                                                                      |
|-----------------|---------------------------------------------------------------------------------------------------------------|
| `received.json` | **Web UI** — public shape after Client API sanitization (`buildWebExecute`); see **Web execute DTO** below.   |
| `response.json` | **SDK session merge** — raw server → Client API payload (single action key under `execute` where applicable). |
| `client.json`   | Web → Client API (body the SDK route receives).                                                               |

**Not a contract file:** optional **`interrupt.md`** in a step folder only documents
the [server interrupt loop](../a2a-server/docs/SERVER-INTERRUPT-LOOP.md). It does not define Web or SDK payloads;
goldens remain `response.json` / `received.json`. See [
`SCHEMA.md`](./SCHEMA.md#supplementary-server-interrupt-loop-optional).

`a2a-client/packages/sdk/src/server/services/transforms/session-transform.ts` merges `context`, `execute`, `messages`,
`history`, `workbench` (and completion via `result.completed` / `execute.completed`, not a separate `finalResult` field). **`response.json`** keeps the protocol execute the server emitted. *
*`received.json`** matches what the browser gets: internal client actions are stripped and replaced with a user-facing
DTO.

## Web execute DTO (`received.json` / GET session `execute`)

Implemented in `a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js` (and SDK `web-execute-dto.ts`). The Client
API removes these keys from `execute` before responding to the Web UI: `rag-search`, `read-file`, `write-file`,
`script`, `execute-command`, `list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`, `debug`.

| Field                 | Meaning                                                                                                                                                                                                                                                               |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `execute.message`     | Status line for the UI (string or `{ content }`). If the server sent only a client action, a default is used (`Searching the codebase…`, `Reading files…`, `Updating files…`, `Running script…`, `Running command…`, or combined with ` · `).                         |
| `execute.llmMessage`  | Optional; pass-through when the server adds a separate model line.                                                                                                                                                                                                    |
| `execute.form`        | Unchanged when present (router / input / choices).                                                                                                                                                                                                                    |
| `execute.attachments` | Structured hints: `readFiles[]`, `writtenFiles[]`, `ragQuery`, `shellCommand`, `listDirectoryPath`, `grepPattern` / `grepPath` / `grepGlob`, `fileExistsPath`, `editPatchPath`, `runScriptId`, `pendingClientAction` (`script` \| `execute-command` \| `run-script`). |

Golden **`received.json`** must use this DTO. **`response.json`** in the same step still carries the real *
*`execute.{action}`** single-key payload for the Client API → server loop.

## Execute: action-key shape (mandatory) — `response.json` / server contract

- Exactly **one** top-level key under `execute` for the active command (`form`, `read-file`, `rag-search`, …) in *
  *`response.json`** (and in persisted step records used for invoke chaining).
- **SDK note:** `extractExecuteAction()` in `action-handler.ts` uses **`Object.keys(execute)[0]`** on the **raw**
  execute. Do not put a second protocol action key in **`response.json`** golden fixtures.

## `execute.form` (ideal for `handleFormAction` / Web)

Aligned with `simulation-helpers.ts` (`FormChoice`, `FormInput`) and `ui-handlers.ts`.

- **`choices[]`:** each item has `id`, `label`; **recommended** `description` (subtitle / help in UI).
- **`input[]`:** each has `name`, `type` ∈ `text` | `textarea` | `select` | `checkbox` | `number`; optional `label`,
  `required`, `placeholder`, `default`, `options` for `select`.
- **`title`:** short; optional `description` at form level (SDK passes through).

## `execute` actions the SDK executes today

Handled in `handleExecuteAction`: `script`, `read-file`, `write-file`, `rag-search`, `execute-command`,
`list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`, `form`, `message`.

Workspace tools (`list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`) need matching callbacks on
`HandleActionOptions` (`listDirectory`, `grepWorkspace`, `fileExists`, `editPatch`, `runRegisteredScript`); without them
the handler returns `handled: false` like `read-file` without `readFile`.

## `execute.message` (assistant / system text)

SDK merges string or `{ content }` into session messages (`session-transform.ts`). Ideal:

- Prefer **string** for simple status lines.
- Or `{ "content": "...", "role": "assistant" }` when the UI must distinguish role.

## `context` fields the client should preserve

| Field                                 | Use                                                                                                                                                      |
|---------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `task`                                | Required by invoke response schema; shown in UI headers.                                                                                                 |
| `execution.action` / `execution.step` | Routing, flow hints, step labels.                                                                                                                        |
| `history`                             | Chat / tool summary lines (`user` / `assistant` / `system`).                                                                                             |
| `workbench`                           | Structured flow state: `sections`, optional `batch`, optional `slots`. Use `truncate-section` on `context.workbench.sections` when trimming for the LLM. |
| `files`                               | Working set (ISSUE 6) — SDK should persist when present.                                                                                                 |
| `scratchpad`                          | Checklist flags — persist when present.                                                                                                                  |

## Out of scope in step fixtures (runtime only)

Per `SCHEMA.md`: `promiseId`, polling, `execute.wait` / loader timing. Document separately in `LOADER-BEHAVIOR.md` when
testing E2E.

## How to “raise the bar” on a simulation

1. **`received.json`:** Web execute DTO (`message` / `form` / `attachments` / optional `llmMessage`) — not a copy-paste
   of **`response.json`** `execute` when the step asks for `rag-search`, `read-file`, etc.
2. **Action-key** payloads include **pagination** for `rag-search` where applicable.
3. **Form fields** use SDK-allowed `type` values only.
4. **Router steps** list the same `id`s the server exposes (`action-request-processor` `ROUTER_CHOICES`).
5. Add **`description`** on at least primary `choices` so the UI golden is non-ambiguous.

## Sequential steps and accumulated context (any mode)

“Batching” is **not** only `script` over many files. Any flow that runs **multiple rounds** (RAG, read-file, forms, LLM
turns, checklist items) should document **where each `result` is merged** (`history`, `files`, `scratchpad`,
`workbench`, or flow-specific fields) so the next request has deterministic state. See **`simulations/SCHEMA.md` →
Sequential multi-step flows and accumulated context**.

Reference upgraded step: **`simulations/dialog/1`**.
