# S14 — Script mode response parity with dialog / agent

**Status:** pending  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (focus §2, row S14)

## Goal

The script-driven path (`execute.script` and related flows) should expose **the same response contract** as dialog and agent modes where it matters for operators and UI: forms, messages, workbench visibility, and golden-simulation shape — not only the LLM input pipeline (covered by S2/S5).

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

## Acceptance (draft)

- Documented matrix: script vs dialog vs agent for `execute`, `result`, `context.workbench`, and client-facing payload.
- At least one golden sim path (or extension of existing) proving script responses match the documented contract.
- `sim:lint` / `sim:validate` (and server tests if code changes) pass after implementation.
