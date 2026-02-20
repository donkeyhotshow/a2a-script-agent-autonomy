# ADR 0004: Neurons: new_task → tasks

## Status

accepted

## Date

2026-02-20

## Context

Client sends `new_task: ["task description", ...]`. Server must convert to structured `Task[]` and activate neurons for context enrichment.

## Decision

- `processNewTaskToContext(context, codeBlocks)` — stateless, no session
- Build `ActivationContext` from `codeBlocks` paths + `architectural_features` + **taskText** (joined `new_task`)
- `activateNeurons(ctx)` — match neuron triggers against content (paths, arch, task words)
- **Bootstrap:** if no neuron matches, activate neurons with `activatesWhenEmpty: true` (e.g. request composer.json, app/)
- **Task triggers:** neurons may have task-keyword triggers (e.g. "validation", "validate", "rules") so short tasks like "add validation" fire without codeBlocks
- Convert `new_task` strings to `Task[]` via `inferTaskType`
- Return `ProcessNewTaskResult { context, activatedNeurons }`; API result includes `context` (tasks, request_files, …), `activated_neuron_ids`, `injected_content`
- Neuron activation wrapped in try/catch; invalid regex trigger → skip neuron, no crash

## Consequences

- Neurons activate before graph work; injected content available for downstream
- Neuron does not go into context if not triggered; **trigger data** goes into context for re-triggering on next iteration
- Partial match builds suspicion; one neuron has many triggers
- `new_task` cleared after move — client knows tasks were accepted
- Result exposes `activated_neurons` / `activated_neuron_ids`, `request_files`, `injected_content` for client and etalon tests
- Empty pool still gets `request_files` via bootstrap neuron
