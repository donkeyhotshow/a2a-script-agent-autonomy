# Extending LLM-driven actions (playbook)

How to add or evolve **AI-actions**, **dialog** tools, **RAG** variants, and related context — without breaking the protocol or goldens.

## 1. Contract first

| Layer | What to change |
|--------|----------------|
| **LLM JSON** | `a2a-server/prompts/<action>-request.md` — allowed `step` values, `execute` keys, optional `workbench_ops` / `interrupt` / `completed`. |
| **Single execute key** | Keep **one** key under `execute` per turn unless you document a deliberate exception (e.g. dialog pattern A: `message`+`form` inside `execute`). |
| **Persistence** | State that must survive the next invoke goes through **response transforms** or existing materialization: `context.history`, `context.files`, `merge-workbench-sections`, `apply-workbench-section-ops`, `apply-scratchpad-ops` — not ad-hoc fields in processors unless you add an ADR. |

## 2. Transforms before processor hacks

1. Prefer a new **`op`** in [`src/transform/operations.ts`](../src/transform/operations.ts) + row in [`TRANSFORM-OPS.md`](./TRANSFORM-OPS.md) + test in [`tests/transform-runtime.test.ts`](../tests/transform-runtime.test.ts).
2. Wire **`prompts/transforms/<schema>-request.json`** / **`-response.json`** (or a schema-specific override like [`dialog-llm-response.json`](../prompts/transforms/dialog-llm-response.json) via [`resolveTransformFile`](../src/transform/pipeline.ts)).
3. Touch **`DialogRequestProcessor`** / invoke only for **routing**, promise handling, or **pass-through** lists (e.g. [`DIALOG_TOOL_EXECUTE_KEYS`](../src/services/core/request-processor/dialog-request-processor.ts)) — not for business logic that belongs in the transform DSL.

## 3. Client-visible `execute` types

- Add the key to [`a2a-server/scripts/sim-lint.ts`](../scripts/sim-lint.ts) **`VALID_EXECUTE_TYPES`**.
- Ensure the **Web / Client API** can run that action (same key as protocol).
- For **dialog** tool rounds, extend **`DIALOG_TOOL_EXECUTE_KEYS`** and **`isDialogToolExecutePayload`** so the server does not rewrite tool `execute` into `message`+`form`.

## 4. RAG / search “modes” (when you add them)

1. **Config**: `context.execution` / `context.workbench.slots` / env (e.g. `A2A_RAG_PROFILE`) — one canonical place the client and server both read.
2. **Prompt**: short table in the relevant `*-request.md` (query shape, `page` / `pageSize`, filters).
3. **Implementation**: prefer **one** module (client RAG or server stub) branching on that key; avoid scattered string literals.

## 5. Simulations and lint

1. Add or extend **`simulations/<flow>/<step>/`** with aligned `request.json` / `response.json` / `server-transforms-*.json` / `.md` as needed.
2. Run from repo root: `npm run sim:lint -- --sim <name> --json` and `npm run sim:validate -- --sim <name> --json` (see [`AGENTS.md`](../../AGENTS.md)).

## 6. Documentation order

| Order | Doc |
|-------|-----|
| 1 | [`LLM-REQUEST-PREP.md`](./LLM-REQUEST-PREP.md) — prep + transform flow |
| 2 | [`AI-ACTION-TRANSFORM-PATTERN.md`](./AI-ACTION-TRANSFORM-PATTERN.md) — JSON shape + checklist |
| 3 | [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) — golden / context fields |
| 4 | [`AGENTS.md`](../../AGENTS.md) — agent-facing rules and verification |
| 5 | [`docs/adr/README.md`](../../docs/adr/README.md) — **ADR** only when the decision is cross-cutting or hard to revert |

## 7. Server-side gates and budgets

- Reuse **`interrupt.when`** on transform output ([`types.ts`](../src/transform/types.ts) `InterruptDirective`) for data-driven interrupt conditions.
- Use **`A2A_MAX_INTERRUPT_TURNS`**, **`A2A_COMPRESS_HISTORY_MIN_ENTRIES`**, etc. ([`AGENTS.md`](../../AGENTS.md) environment table) instead of new magic numbers in code.

## Where this playbook is linked (discoverability)

| Place | Role |
|-------|------|
| [`AGENTS.md`](../../AGENTS.md) | Agents: TOC §12, Key Files, simulation rules |
| Root [`README.md`](../../README.md) | **Contributing** — when you touch LLM / transforms / sims |
| [`simulations/README.md`](../../simulations/README.md) + [`SCHEMA.md`](../../simulations/SCHEMA.md) | Golden authors |
| [`LLM-REQUEST-PREP.md`](./LLM-REQUEST-PREP.md) / [`AI-ACTION-TRANSFORM-PATTERN.md`](./AI-ACTION-TRANSFORM-PATTERN.md) | Server LLM pipeline details |
| This repo’s **`a2a-server/README.md`** | Server package docs list |

**When to apply:** start of any task that changes prompts (`prompts/*.md`), `prompts/transforms/*.json`, `dialog-request-processor` pass-through keys, `sim-lint` `VALID_EXECUTE_TYPES`, or client execute handlers — run through §1–§5 here before opening the PR.

Optional later: add the same link to a **PR template** (`.github/pull_request_template.md`) or **`.cursor/rules`** if your team uses them — neither exists in this repo yet.

## See also

- [`SERVER-INTERRUPT-LOOP.md`](./SERVER-INTERRUPT-LOOP.md)
- [`ADR-0026-server-llm-request-prep.md`](../../docs/adr/ADR-0026-server-llm-request-prep.md)
