# Gray room — step 1 example

This folder’s **canonical goldens** (`response.md`, `response.json`) describe the **normal** single LLM turn: no
`interrupt` in the LLM JSON. **Gray-room substeps** live in **sister folders** next to this step: [
`../1-sub-1/`](../1-sub-1/) (`thinking` + follow-up), [`../1-sub-2/`](../1-sub-2/) (`auto_rag_page` reenter). Each
subfolder holds **server-internal** artifacts (`request.*`, `response.*`, optional `request.md` / `response.md` /
server-transforms) — **no** `client.json` / `received.json`, because the gray room runs entirely on the server; the
Web only gets the **final** payload for step **1** (this folder). Trace for UI is `context.workbench.slots.interruptTrace`
in each substep **`response.json`**. Full spec: [
`GRAY-ROOM.md`](../../../a2a-server/docs/GRAY-ROOM.md).

## Why this step

- This step demonstrates **`thinking`** interrupt: the LLM can request a sidecar thinking phase to plan complex actions before responding.
- The server runs a thinking sidecar LLM, writes **`workbench.slots.thinking`**, and may continue with another main LLM turn.
- Same schema and transforms apply; `interrupt` field triggers the thinking sidecar.

## Pipeline reminder

1. Primary LLM → `response.md` (may include `interrupt` in JSON).
2. `server-transforms-response.json` must copy LLM `interrupt` into **`$out.interrupt`** (e.g. `include-if` + `set`,
   same as the design doc).
3. Server sees `interrupt` → runs **`applyInterrupt`** (e.g. thinking sidecar) → may run **another** full request transform +
   LLM turn if `continueLoop` is true.
4. **`response.json` / `received.json`** in the repo = **final** payload after the loop (what the client sees).
   Interrupt-only traffic is never sent to the Web DTO.

5. **Trace for UI** — same event shape as primary interrupt sub-step
    `workbench.slots.interruptTrace` (extend in **`1-sub-1`…`1-sub-2`**). Server sends *
   *`context.workbench.slots.interruptTrace`**: [
   `ServerInterruptTraceEvent`](../../../a2a-server/src/transform/types.ts). Web: collapsible **“Server LLM chain”** (no
   full prompts).

## Example: primary LLM JSON with `thinking`

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
  "interrupt": { "reason": "thinking", "maxTurns": 3 }
}
```

## Example: thinking sub-call output (server-only)

The thinking handler runs a sidecar LLM to generate planning text. Illustrative result written to `workbench.slots.thinking`:

```json
{
  "thinking": "Health route file content is ready; user still needs mount in app.js on a later turn.",
  "next_action": "Return write-file execute to client."
}
```

After thinking, the server may `continueLoop: true` to run another main LLM turn with the thinking context available.

## Other simulations where interrupts fit

| Simulation / step         | `reason`                         | Notes                                                                                                                  |
|---------------------------|----------------------------------|------------------------------------------------------------------------------------------------------------------------|
| **interrupt-thinking / 1** (this) | `thinking`                      | Demonstrates thinking interrupt with sidecar LLM for planning.                                                        |
| **agent / 6**             | `compress_history`               | Long tool + assistant history.                                                                                         |
| **agent / 3–5**           | `thinking` or `compress_history` | Earlier turns; use `thinking` if you want `workbench.slots.thinking` before the main reply.                            |
| **agent / 3+** (RAG)      | `auto_rag_page`                  | Only if the server implements RAG fetch inside the loop; current stub mainly marks context and re-enters the main LLM. |
| **dialog** (multi-turn)   | `compress_history`               | Any step where `history` length grows past the server threshold.                                                       |

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
