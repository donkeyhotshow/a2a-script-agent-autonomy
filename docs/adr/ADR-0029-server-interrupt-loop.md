# ADR-0029: Server-side interrupt loop (dialog / transform processor)

- **Status:** accepted
- **Date:** 2026-03-24

## Context

Long `context.history` and multi-step reasoning benefit from **extra LLM work on the server** before returning to the client. Hard truncation loses task state; round-trips to the client for every sub-step add latency and UI noise.

## Decision

After **response** transforms, if transform output contains **`interrupt`** (`InterruptDirective`), `DialogRequestProcessor` runs **`processDialogResponseWithInterruptLoop`**: handle the interrupt (`applyInterrupt`), optionally run another **request transform + main LLM + response transform** cycle, until there is no interrupt or a **global** turn budget is exhausted. The client receives only the **final** `ProcessResult`.

Normative detail and the table of implemented `reason` values live in [`a2a-server/docs/SERVER-INTERRUPT-LOOP.md`](../../a2a-server/docs/SERVER-INTERRUPT-LOOP.md).

## Consequences

- **Positive:** History compression, internal thinking, and future server-side tool/RAG pagination can be added without protocol changes to the Web layer.
- **Negative:** More LLM cost and latency per invoke when interrupts fire; operators must monitor budgets and AI Hub load.
- **Simulations:** [`interrupt.md`](../../simulations/auto-ai-v2/6/interrupt.md) + numbered sister folders [`6-sub-1` … `6-sub-4`](../../simulations/auto-ai-v2/6-sub-1/) (`trace.json`, pattern `N-sub-M`).

## Related

- Code: `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`
- Types: `a2a-server/src/transform/types.ts` (`InterruptDirective`)
- Simulations: `simulations/SCHEMA.md` (supplementary `interrupt.md`)
