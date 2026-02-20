# ADR 0004: Neurons: new_task → tasks

## Status

accepted

## Date

2026-02-20

## Context

Client sends `new_task: ["task description", ...]`. Server must convert to structured `Task[]` and activate neurons for context enrichment.

## Decision

- `processNewTaskToContext(context, codeBlocks)` — stateless, no session
- Build `ActivationContext` from `codeBlocks` paths + `architectural_features`
- `activateNeurons(ctx)` — match neuron triggers against paths
- Convert `new_task` strings to `Task[]` via `inferTaskType`
- Return context with `tasks: [...existing, ...newTasks]`, `new_task: []`

## Consequences

- Neurons activate before graph work; injected content available for downstream
- Neuron does not go into context if not triggered; **trigger data** goes into context for re-triggering on next iteration
- Partial match builds suspicion; one neuron has many triggers
- `new_task` cleared after move — client knows tasks were accepted
- Result `context` includes updated `tasks`
