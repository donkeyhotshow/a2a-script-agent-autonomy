# tasks/

## Where work lives

| Location | Role |
|----------|------|
| [`work/STATE.md`](../work/STATE.md) | Personal queue and status; links to specs below. |
| **`tasks/*.md`** and **`tasks/pending/`** | **Pre-stack / engineering specs** — what to build, fix, or document *before* or *without* treating the live session as the primary tool. |
| **`tasks/completed/`** | Finished tickets kept for audit (e.g. closed magenta/npm audit log). |
| [`prompts-to-agent-mode/`](../prompts-to-agent-mode/README.md) | **Stack queue** — flat `.md` files consumed by Task Monitor; each task should be runnable via Client API + agent after the stack is up. |
| [`tasks/ide-prompts/`](ide-prompts/README.md) | **IDE prompts** — docs, methodology, ADR, sim authoring, module plans; copy-paste in Cursor, not in the default monitor scan. |
| [`cross-system-contracts/`](../cross-system-contracts/README.md) | **Inter-system** contracts — evidence paths, curated `fixtures/`, backlog [`tasks/pending/cross-system-parameter-hunt.md`](pending/cross-system-parameter-hunt.md). |

## Self-Upgrade order (policy)

**Self-Upgrade** here means driving work through the **Client API session dialog** (`npm run monitor`, manual `/sessions` + `/next` + `/async`, or [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md)) — **this is the protocol for “doing work”, not an optional extra.**

1. **Primary / engineering first** — Close or materially advance items in **`tasks/*.md`**, **`tasks/pending/`**, and (as needed) **[`ide-prompts/`](ide-prompts/README.md)** in the IDE: implementation, sims, docs, fixes. The monitor does **not** enforce this; it is the intended operator sequence.
2. **Archive sessions before heavy Self-Upgrade** — Before a **large** volume of session work (full Task Monitor pass over `prompts-to-agent-mode/`, long daemon run, repeated `monitor:once`, or extended manual `POST /sessions` + `/next`): copy or zip session trees you care about from **`a2a-client/storage/sessions/{sessionId}/`** to an operator archive (e.g. **`logs/archive/sessions-<date>/`**). Distinct from wiping storage (**Session Cleanup** in [`GLOSSARY.md`](../GLOSSARY.md)); goal is recoverable step JSON and bounded disk if storage is pruned or sessions later 404. Not enforced in code.
3. **Then session-queue prompts** — Run the flat queue under [`prompts-to-agent-mode/`](../prompts-to-agent-mode/README.md) when the stack is the right surface to verify or execute those tasks.
4. **Empty engineering queue ⇒ drive stack** — When `tasks/pending/` and top-level `tasks/*.md` no longer contain concrete, testable items, do **not** stop. Treat that state as a trigger to (a) run `prompts-to-agent-mode/` via the monitor or manual Client API sessions, and (b) take the concrete follow-ups the agent produces and write them back into `tasks/` + `DEV_STATE`. In other words, **no local tickets** means “switch to stack-driven prompts”, not “idle”.

Rationale: session-based self-upgrade assumes a **working stack** and stable contracts; burning monitor cycles before main specs are addressed wastes LLM time and confuses failure attribution, but skipping the monitor when the queue is empty silently kills the self-upgrade loop.

Operator HTTP flow: [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md).

Task specs in this folder: parity, sync sims, system backlog (`script-dialog-agent-response-parity.md`, `sync-*.md`, `system-improvement-priorities.md`, etc.).
