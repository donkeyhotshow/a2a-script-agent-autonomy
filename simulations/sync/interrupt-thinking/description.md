# Interrupt Thinking — Server Interrupt Loop Example

Demonstrates the **`thinking`** interrupt type in the server interrupt loop.

## Scenario

User task: **Add GET `/health` returning `{ ok: true }` and wire it in `src/app.js`.**

The LLM requests a `thinking` interrupt to plan the multi-step code changes, then continues with implementation.

## Steps

1. **Primary LLM** — Requests `thinking` interrupt for planning.
2. **Sub-step 1** — Thinking sidecar runs, writes to `workbench.slots.thinking`, continues loop.
3. **Sub-step 2** — Main LLM re-enters with thinking context, creates and mounts the health route.

## Contract

| Nuance                  | How this sim shows it |
|-------------------------|-----------------------|
| Server interrupt loop   | Step 1 — interrupt.md; substeps 1-sub-1 … 1-sub-2 demonstrate thinking interrupt. |
| Thinking sidecar        | Sidecar LLM generates planning text in `workbench.slots.thinking`. |
| Continue loop           | After thinking, server runs another main LLM turn. |
