# ADR-0088: Agentic Decision Cell

## Status
Approved

## Context
The "Papa-mama gang" (orchestrator/verifier) needs a more atomic and reusable logic for decision-making.

## Decision
Introduce `DecisionCell` — an atomic unit that takes inputs (logs, state, task), performs autonomous reasoning, and produces a definitive `done` or `retry` signal.

## Consequences
- Cleaner orchestrator logic.
- Modular verification units that can be swapped or improved independently.
