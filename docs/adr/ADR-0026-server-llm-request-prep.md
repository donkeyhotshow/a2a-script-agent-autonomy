# ADR-0026: Server-side LLM request preparation (history + flow hints)

Status: accepted  
Date: 2026-03-24

## Context

The invoke payload arriving at the A2A Server may carry:

- **`result`** — tool / action-key outcomes (`read-file`, `rag-search`, user message text, etc.) that must inform the model.
- **`context.execution`** — current **action** and **step**, which should steer what the model does *this* turn (phase boundaries, “wait for user”, next tool, etc.).

If we pass **`result`** verbatim into markdown templates, the model sees an inconsistent mix of shapes, risk of duplicating content already in `context.history`, and no single place for phase-specific instructions tied to the state machine.

## Decision

For the **request** transform path (`runPromptsTransform` with `type === 'request'`), **before** `render-markdown` builds `request.md`:

1. **Materialize `result` into `context.history`**  
   - Run on a **clone** of the invoke-shaped object (the original payload is not mutated).  
   - Map `result.message` (if present) to a `user` history line; other action keys to compact `system` summaries.  
   - Deduplicate identical lines where defined by implementation.  
   - Set **`result` to `{}`** so request templates do not expose a separate `result` block to the model — tool outcomes are visible only via **history**.

2. **Attach `flowControlHint`**  
   - Set a root-level string from **`context.execution.action`** and **`context.execution.step`** (with lookup table + fallbacks in code).  
   - Prompt templates inject it via **`${flowControlHint}`** (same mechanism as other template fields).

3. **Canonical documentation and tests**  
   - Spec: [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md).  
   - Related pattern: [`a2a-server/docs/AI-ACTION-TRANSFORM-PATTERN.md`](../../a2a-server/docs/AI-ACTION-TRANSFORM-PATTERN.md).  
   - Unit tests: `a2a-server/tests/unit/materialize-result-for-llm.test.ts`, `flow-control-hints.test.ts`.

## Consequences

- **Simulations / golden `request.md`**: After changing materialize or hints, re-run transform replay and update recorded `request.md` when it is an artifact of `request.json` + transforms (see [ADR-0001](ADR-0001-simulations-as-golden-standard.md)).  
- **Custom markdown under `simulations/`** only: if parity with server templates is required, authors must add **`${flowControlHint}`** themselves.  
- **Planning note** (non-normative): [`docs/planning/LLM-REQUEST-PREP.md`](../planning/LLM-REQUEST-PREP.md) points here and to the server doc — no duplicate spec.

## Notes

- This ADR does **not** change the **action-key shape** for `execute` / `result` on the wire; it only defines how the server **prepares** the object used to render the LLM-facing markdown for one request leg.
- Where to document vs duplicate: [ADR-0027](ADR-0027-documentation-canonical-sources.md).
