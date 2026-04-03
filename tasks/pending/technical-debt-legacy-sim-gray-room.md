# Technical debt — legacy formats, simulation gaps, Gray Room complexity

## Status: partial (2026-04-03)

- **Gray Room triggers:** resolution order + policy/env/explicit matrix documented in [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md) (§ Trigger resolution order); behavior still covered by [`a2a-server/tests/gray-room-trigger.test.ts`](../../a2a-server/tests/gray-room-trigger.test.ts).
- **Legacy result blobs:** [`validateResultShape`](../../a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts) locked with unit tests in [`a2a-server/tests/unit/transform-execute-validator.test.ts`](../../a2a-server/tests/unit/transform-execute-validator.test.ts).
- **Async gaps:** [`simulations/async/README.md`](../../simulations/async/README.md) documents what goldens exclude (retries, loader timing); `promise-lifecycle` remains the async shape baseline.
- **Still open:** remove or further isolate `ActionRequest` legacy export; invoke/sessions compat comments; full E2E for polling retries / `execute.wait`.

## 1. Legacy compatibility code

Remnants of older payload shapes (validators, exports, inline compatibility notes).

| Area | Location | Notes |
|------|----------|-------|
| Validator rejects legacy blobs | [`a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts`](../../a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts) | Rejects legacy bare `{content}` / `{results}` blobs |
| External compat types | [`a2a-server/src/services/core/request-processor/legacy-interfaces.ts`](../../a2a-server/src/services/core/request-processor/legacy-interfaces.ts) | Isolated `ActionRequest` legacy shape for external compatibility |
| Compatibility behavior | [`a2a-server/src/services/core/request-processor/request-processor.service.ts`](../../a2a-server/src/services/core/request-processor/request-processor.service.ts), [`a2a-server/src/routes/sessions.routes.ts`](../../a2a-server/src/routes/sessions.routes.ts) | Comments document compatibility behavior |

**Possible outcomes:** sunset plan + removal of dead paths; or keep and lock behavior with targeted unit/integration tests; or narrow public surface so only supported shapes are documented.

## 2. Simulations — uncovered areas (out of scope today)

| Gap | Gap |
|-----|-----|
| Async client contract | `promiseId`, async polling, retries — no golden coverage |
| Loader / wait | `execute.wait` / loader timing — not validated in goldens |

Related docs: [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md), [`a2a-client/docs/LOADER-BEHAVIOR.md`](../../a2a-client/docs/LOADER-BEHAVIOR.md) (if present).

**Definition of done (suggested):** minimal `simulations/async/` or client-replay fixtures that assert promise lifecycle + retry boundaries; optional Vitest around polling helpers.

## 3. Gray Room complexity

Server-side chain of LLM sub-requests with dense branching:

| Theme | Detail |
|-------|--------|
| Triggers | Three mechanisms: explicit flag, env, policy — should be one matrix (ADR or `GRAY-ROOM.md`) |
| Interrupt contract | Budget / loop / trace contract — needs stable spec + tests |
| Schemas | Substep schemas + transform contracts — align with [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md) and transform pipeline |

Cross-reference: [`tasks/pending/gray-room-system-tasks.md`](gray-room-system-tasks.md) (sequence / broader backlog); [`tasks/system-improvement-priorities.md`](../system-improvement-priorities.md).
