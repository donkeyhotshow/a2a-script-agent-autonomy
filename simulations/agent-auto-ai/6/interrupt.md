# Server interrupt loop — step 6 example

This folder’s **canonical goldens** (`response.md`, `response.json`) describe the **normal** single LLM turn: no
`interrupt` in the LLM JSON. For examples of interrupt substeps demonstrating the internal loop, see the `interrupt-thinking` simulation. Full spec: [
`SERVER-INTERRUPT-LOOP.md`](../../../a2a-server/docs/SERVER-INTERRUPT-LOOP.md).

## Why this step

- `context.history` is **long** (many `assistant` / `system` lines). A good candidate for **`compress_history`**: server
  runs an extra LLM call, replaces history with a short summary, then returns the same `execute` to the client.
- Same schema (`auto-ai`) and transforms can stay; only the LLM payload and post-transform `$out` gain an `interrupt`
  field.

## Pipeline reminder

1. Primary LLM → `response.md` (may include `interrupt` in JSON).
2. `server-transforms-response.json` must copy LLM `interrupt` into **`$out.interrupt`** (e.g. `include-if` + `set`,
   same as the design doc).
3. Server sees `interrupt` → runs **`applyInterrupt`** (e.g. compress) → may run **another** full request transform +
   LLM turn if `continueLoop` is true.
4. **`response.json` / `received.json`** in the repo = **final** payload after the loop (what the client sees).
   Interrupt-only traffic is never sent to the Web DTO.

5. **Trace for UI** — `context.workbench.slots.interruptTrace` in the final response. Server sends *
   *`context.workbench.slots.interruptTrace`**: [
   `ServerInterruptTraceEvent`](../../../a2a-server/src/transform/types.ts). Web: collapsible **“Server LLM chain”** (no
   full prompts).

## Example: primary LLM JSON with `compress_history`

```json
{
  "step": "edit_code",
  "message": "Creating src/routes/health.js and will mount it next turn.",
  "execute": {
    "write-file": {
      "path": "src/routes/health.js",
      "content": "const express = require('express');\nconst router = express.Router();\nrouter.get('/health', (_req, res) => res.json({ ok: true }));\nmodule.exports = router;\n"
    }
  },
  "scratchpad_ops": [{ "op": "add", "item": "read_app_js" }],
  "completed": false,
  "interrupt": { "reason": "compress_history", "maxTurns": 3 }
}
```

## Example: compress sub-call output (server-only)

The compress handler expects **only** a JSON array of `{ "role", "message" }` entries (see `DialogRequestProcessor` /
`applyInterrupt`). Illustrative result:

```json
[
  {
    "role": "user",
    "message": "Add GET /health returning JSON { ok: true }; wire the route in src/app.js."
  },
  {
    "role": "system",
    "message": "Found app entrypoint via RAG; listed src/; read app.js; creating health route file next."
  },
  {
    "role": "assistant",
    "message": "Creating src/routes/health.js and will mount it next turn."
  }
]
```

After compress, the **client-visible** `response.json` would keep the same **`execute.write-file`** as today, but *
*`context.history`** would match the shortened array above (and optional `interrupt_truncated: true` if the global
interrupt budget is exhausted).

## Other simulations where interrupts fit

| Simulation / step       | `reason`                         | Notes                                                                                                                  |
|-------------------------|----------------------------------|------------------------------------------------------------------------------------------------------------------------|
| **agent / 6** (this)    | `compress_history`               | Long tool + assistant history.                                                                                         |
| **agent / 3–5**         | `thinking` or `compress_history` | Earlier turns; use `thinking` if you want `workbench.slots.thinking` before the main reply.                            |
| **agent / 3+** (RAG)    | `auto_rag_page`                  | Only if the server implements RAG fetch inside the loop; current stub mainly marks context and re-enters the main LLM. |
| **dialog** (multi-turn) | `compress_history`               | Any step where `history` length grows past the server threshold.                                                       |

## Transform snippet (`server-transforms-response.json`)

Add only when you turn this step into an interrupt golden (not required for the current baseline):

```json
{
  "op": "set",
  "path": "$.interrupt",
  "valueFrom": "$.llm.interrupt"
}
```

Ensure `parse-json-from-md` already maps the full LLM object to `$llm` so `$.llm.interrupt` exists when the model emits
it.
