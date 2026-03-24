# Server-side interrupt loop

**Status:** Implemented in [`DialogRequestProcessor`](../src/services/core/request-processor/dialog-request-processor.ts) (`processDialogResponseWithInterruptLoop`, `applyInterrupt`, `extractInterrupt`).

**Related types:** [`InterruptDirective`](../src/transform/types.ts) in the transform types module.

## What it does

After the **response** transform pipeline runs, the server inspects transform output for a top-level **`interrupt`** object. If present, the server does **not** immediately return the dialog result to the client. It may run **additional** LLM calls (compress history, internal “thinking”, or a full **request transform → main LLM → response transform** cycle again). The Web / Client API only sees the **final** `ProcessResult` when the loop ends or the interrupt budget is exhausted.

```text
Client → Server
         request transform → LLM #1 → response transform
         interrupt? ─no→ return to client
              │
              yes
              ├── applyInterrupt (e.g. compress_history: extra LLM, then return with same execute)
              └── continueLoop → request transform → LLM #2 → response transform → …
```

## Why use it

- **History compression** — Summarize long `history` with an LLM instead of hard truncation.
- **Thinking step** — Store structured reasoning in `context.workbench.slots.thinking`, then run the main LLM again with that context.
- **RAG pagination (planned wiring)** — `auto_rag_page` re-enters the main loop; server-side RAG execution can be added later (today mainly merges `interrupt.data` into context and sets `_interrupt_reason`).
- **Future:** `auto_read_file`, `clarify`, and `interrupt.schema` are reserved in the type; implement in `applyInterrupt` and the loop when needed.

## Protocol: `interrupt` on transform output

The **response** transform must place `interrupt` on the same object that carries `context` and `execute` (i.e. `$out.interrupt` after transforms). The LLM may emit `interrupt` inside the JSON in `response.md`; transforms should copy `$.llm.interrupt` → `$.interrupt` when you enable this path.

```json
{
  "context": {},
  "execute": { "write-file": { "path": "...", "content": "..." } },
  "interrupt": {
    "reason": "compress_history",
    "maxTurns": 3,
    "schema": "optional-other-transform-schema",
    "context": {},
    "data": {}
  }
}
```

| Field | Type | Purpose |
|--------|------|---------|
| `reason` | string | **Required.** Selects handler in `applyInterrupt`. |
| `maxTurns` | number | Declared on the directive for future per-interrupt limits; **not yet enforced** (see limits below). |
| `schema` | string | Optional alternate transform schema for the next turn — **not yet read** by the loop. |
| `context` | object | Shallow-merged over the current invoke context before the interrupt handler runs. |
| `data` | object | Handler-specific payload (e.g. merged into context for `auto_rag_page`). |
| `when` | object | Optional gates: **`historyMinLength`** / **`historyMaxLength`** vs current dialog history. If not satisfied, the server skips the interrupt (same as no `interrupt`); trace gets `interrupt_skipped`. |

## Implemented `reason` values

| `reason` | Behavior | `continueLoop` |
|----------|----------|----------------|
| `compress_history` | Calls AI Hub with a compress prompt when history is non-empty (optional skip: env **`A2A_COMPRESS_HISTORY_MIN_ENTRIES`** — if `> 0`, skip when `history.length <=` that value). On success replaces **top-level** `history` and `context.history`. | `false` — server returns **one** `ProcessResult` built from **updated context** and the **same** primary LLM `execute` / message. |
| `thinking` | Calls AI Hub; parsed JSON stored under `context.workbench.slots.thinking`. | `true` — runs **request transform → main LLM → response transform** again with updated context. |
| `auto_rag_page` | Merges `data` into `context` and sets `_interrupt_reason`. | `true` — same as `thinking` (main loop). **Does not** run RAG on the server yet. |
| *(anything else)* | Logged; loop stops; client gets current result **without** `interrupt` consumption beyond that. | `false` |

## Loop limits and truncation

- **`A2A_MAX_INTERRUPT_TURNS`** — Global cap (default `10`). Each time an `interrupt` is present and handled, the budget decrements **once** before the next iteration.
- **`interrupt.maxTurns`** — Part of the type for documentation / future use; **not** currently applied in `processDialogResponseWithInterruptLoop`.
- When the budget hits **0** while an interrupt is still present, the server returns the current `ProcessResult` with **`context.interrupt_truncated: true`**.

## AI Hub / promises

- The **first** main LLM call for an invoke still registers `llmPromiseId` on the request via `requestService.updateLlmPromiseId`.
- **Interrupt** sub-calls use distinct `X-Server-Promise-Id` values (e.g. `${promiseId}-compress`, `${promiseId}-think`, `${promiseId}-intr-<n>`) and **do not** replace that mapping.
- Model: `OLLAMA_MODEL` (default `qwen3:8b`); base URL: `AI_HUB_URL` (default `http://localhost:11435`).

## Simulations

- Default goldens often show a **single** LLM turn (`response.md` without `interrupt`). That stays the sync contract baseline.
- Optional narrative: [`simulations/auto-ai-v2/6/interrupt.md`](../../simulations/auto-ai-v2/6/interrupt.md).
- Substep goldens in **`6-sub-1`** … **`6-sub-4`** (`N-sub-M`); trace lives in each folder’s **`response.json`** → `workbench.slots.interruptTrace`.
- [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) — `interrupt.md` and `N-sub-M/` folders (not full eight-file steps).
- To add a **full** golden with interrupts: extend `response.md` + `server-transforms-response.json` to emit `interrupt`, then set `response.json` / `received.json` to the **final** post-loop state.

## Example: `compress_history`

1. LLM JSON in `response.md` includes `"interrupt": { "reason": "compress_history" }`.
2. Response transform copies it to `$out.interrupt`.
3. Server runs the compress chat; replaces history arrays.
4. Client receives the usual `execute` (e.g. `write-file`) and **shortened** `history`.

## Example: `thinking` then second main turn

1. LLM emits `interrupt: { "reason": "thinking" }`.
2. Server fills `workbench.slots.thinking`, then rebuilds `request.md` and calls the main LLM again.
3. Final response transform has **no** `interrupt` → result returned to client.

## Client visibility: `interruptTrace`

Each completed dialog invoke may include **`context.workbench.slots.interruptTrace`**: an ordered array of [`ServerInterruptTraceEvent`](../src/transform/types.ts) objects (`llm_output`, `response_transform`, `interrupt_handler`, `request_rebuild`, `sidecar_llm`). The Web task-flow UI renders them as a collapsible **“Server LLM chain”** block (see `a2a-client/web/js/task-flow/render.js`).

## Limitations (current code)

- Intermediate interrupt LLM text is **not** sent to the client — only structured trace rows and the final `execute` / context.
- **`auto_read_file`** and **`clarify`** are listed on `InterruptDirective` but **not** implemented in `applyInterrupt`.
- **`interrupt.schema`** is not consumed by the interrupt loop.
- There is **no** separate guard that forbids repeating the same `reason`; only the global budget applies.

## See also

- [LLM-REQUEST-PREP.md](./LLM-REQUEST-PREP.md) — how `request.md` is built **before** the first LLM call.
- [TRANSFORM-OPS.md](./TRANSFORM-OPS.md) — response pipeline operations.
- [ADR-0029](../../docs/adr/ADR-0029-server-interrupt-loop.md) — decision record (summary).
