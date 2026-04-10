# ADR-0088: Agentic Decision Cell

## Status
Superseded

## Context
The "Papa-mama gang" (orchestrator/verifier) needs a more atomic and reusable logic for decision-making.

## Decision
Introduce `DecisionCell` — an atomic unit that takes inputs (logs, state, task), performs autonomous reasoning, and produces a definitive `done` or `retry` signal.

## Consequences
- Cleaner orchestrator logic.
- Modular verification units that can be swapped or improved independently.

## Supersedes (2026-04-06)
The extra hub `DecisionCell` LLM call was removed. **SIEGE_REVIEW** and related reflection now key off the **primary** turn only: response transforms expose **`result.completed`** from `$.llm.completed` (see `agent-response.json`, `dialog-response.json`, `agent-request.md`). Archived snapshot: [`archive/a2a-server/request-processor/decision-cell.ARCHIVED.md`](../../archive/a2a-server/request-processor/decision-cell.ARCHIVED.md).
