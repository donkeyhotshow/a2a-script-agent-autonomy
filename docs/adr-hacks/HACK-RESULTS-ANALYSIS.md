# Hack Results Analysis

**Date:** 2026-02-20 | **Source:** [adr-hacks/README.md](README.md) | **Tasks:** [tasks/README.md](../../tasks/README.md) | **Completed:** [tasks/COMPLETED-SUMMARY.md](../../tasks/COMPLETED-SUMMARY.md)

---

## Run Summary

| Etalon | Input | Outcome | request_files | activated_neurons |
|--------|-------|---------|---------------|-------------------|
| A | fix bug, no files | completed | — | — |
| B | add validation, arch [FormRequest] | completed | — | — |
| D | refactor model, User.php | completed | — | — |
| E | do something, no files | completed | — | — |

---

## Findings

### 1. process-input runs without neurons

Script imports `processNewTaskToContext` but never `registerBaseNeurons`. Neurons are loaded only in `app.ts`. Result: `activateNeurons` returns `[]`, no `request_files` in context.

**Expected (with neurons):**
- B: validation neuron → `request_files: [app/Http/Requests/*.php]`
- D: eloquent neuron → `request_files: [database/migrations/*, app/Models/*.php]`

### 2. Output lacks neuron metadata

`serializeOutput` does not include `activated_neurons`, `request_files` (from context). Client cannot see which neurons fired.

### 3. Index is placeholder

`queryIndex` returns `{ question }` only. No semantic search, no file paths/snippets.

### 4. Request processor vs flow doc mismatch

[flow-graph-requests.md](../flow-graph-requests.md) describes: `recognizeEntitiesBatch` → `buildAndStoreGraph` → `isGraphIncomplete`. Actual [request-processor.service.ts](../../a2a-server/src/services/request-processor.service.ts) does: `processNewTaskToContext` → `extractSemantics` → `buildQuestions` → `queryIndex`. No entity recognition, no graph.

### 5. Questions from semantics

- A, E: task text only → 1 question
- B: task text only → 1 question
- D: task + codeBlocks → 3 questions (task + class User + function posts)

### 6. Result format

All return `outcome: completed`, `message: placeholder for ChatGPT`. No `graph_incomplete`, no `request_files` in API result.

---

## Gaps → Tasks

| Gap | Task |
|-----|------|
| Neurons not loaded in process-input | [001-process-input-neurons.md](../../tasks/001-process-input-neurons.md) |
| No activated_neurons in output | [002-output-neuron-metadata.md](../../tasks/002-output-neuron-metadata.md) |
| Index placeholder | [003-index-integration.md](../../tasks/003-index-integration.md) |
| No graph in processor | [004-processor-graph.md](../../tasks/004-processor-graph.md) |
| Result missing context block | [005-result-context-block.md](../../tasks/005-result-context-block.md) |
| ChatGPT placeholder | [006-chatgpt-integration.md](../../tasks/006-chatgpt-integration.md) |
| Fallback for empty pool | [007-bootstrap-neuron.md](../../tasks/007-bootstrap-neuron.md) |
| processNewTask returns context only | [008-processNewTask-return-activated.md](../../tasks/008-processNewTask-return-activated.md) |
| Request API no injected content | [009-request-api-injected-content.md](../../tasks/009-request-api-injected-content.md) |
| Session routes no context-handler | [010-session-routes-context-handler.md](../../tasks/010-session-routes-context-handler.md) |
| ADR 0008 path vs content | [011-adr-content-triggers.md](../../tasks/011-adr-content-triggers.md) ✓ |
| Task-trigger neurons | [012-task-trigger-neurons.md](../../tasks/012-task-trigger-neurons.md) |
| architectural_features source | [013-architectural-features-source.md](../../tasks/013-architectural-features-source.md) |
| request_files resolution spec | [014-request-files-resolution-spec.md](../../tasks/014-request-files-resolution-spec.md) |
| Neuron error handling | [015-neuron-activation-error-handling.md](../../tasks/015-neuron-activation-error-handling.md) |
| Integration tests | [016-neuron-flow-integration-tests.md](../../tasks/016-neuron-flow-integration-tests.md) |
