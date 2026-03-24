# Agent Auto-AI v2 — hand-authored golden (ISSUE 6 / ISSUE 9)

**Not a copy of `simulations/auto-ai`.** Short agent run built to document **context strategy** and **LLM-bound payloads**.

## Contract

| Nuance | How this sim shows it |
|--------|------------------------|
| No raw `result` on LLM turns | Steps **3–7** `request.json` are **post-`prepareInvokePayloadForLlmPrompt`** shapes: **only `context`** (plus nothing at top level). Tool outcomes appear as `context.history` `system` one-liners and `context.files`. |
| `context.files` working set | After **6**, `src/app.js` body lives under `context.files` (full text), not in `history`. |
| `context.scratchpad` | Boolean flags updated via **`scratchpad_ops`** in `response.md` → `apply-scratchpad-ops` in `server-transforms-response.json`. Includes **`remove`** (step 4 drops `pending_rag`). |
| RAG pagination | `execute.rag-search` uses `page` / `pageSize`; `history` carries `RAG: … (page 1, pageSize 10, total 1, hasMore false)`. |
| Tool summaries | One `system` line per tool (RAG, list-directory, read-file, write-file). |
| Server interrupt loop | Step **6** — [`6/interrupt.md`](6/interrupt.md); substeps **`6-sub-1`** … **`6-sub-4`** (`request.json` / `request.md` / `response.json` / `response.md` + server-transforms; `interruptTrace` in `response.json`). |

## Scenario

User task: **Add GET `/health` returning `{ ok: true }` and wire it in `src/app.js`.**

## Steps

1. **Router** — `task` / `new` → `execute.form.choices` includes `agent`.
2. **Choice** — `result.choice: agent` → `execute.form.input` (message).
3. **LLM** — First model turn: `rag-search` + `scratchpad_ops` (`add` flags).
4. **LLM** — After RAG folded into `history` (no `result` in `request.json`): `list-directory` + `remove`/`add` scratchpad ops.
5. **LLM** — After listing folded: `read-file` `src/app.js`.
6. **LLM** — With file in `context.files`: `write-file` `src/routes/health.js`. **`6/interrupt.md`** + **`6-sub-1`…`6-sub-4/`** document interrupt traces (numbered substeps next to step 6).
7. **LLM** — After write folded: `completed: true`.

## Regenerate `request.md` (steps 3–7)

From repo root:

```bash
cd a2a-server && npx tsx scripts/regen-agent-request-md.ts
```

Uses `auto-ai-request.md` + materialize + flow hints (same pipeline as runtime).

## Files per step

- **1–2:** `client.json`, `request.json`, `response.json`, `received.json` only.
- **3–7:** full chain + `server-transforms-*.json` + `request.md` + `response.md`.
