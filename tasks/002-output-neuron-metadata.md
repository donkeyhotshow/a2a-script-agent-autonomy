# Task 002: Output — activated_neurons, request_files

**Index:** [tasks/README.md](README.md) | **Depends:** [001-process-input-neurons.md](001-process-input-neurons.md)

---

## Problem

`serializeOutput` does not include `activated_neurons` or `request_files` in the written result. Client cannot see which neurons fired.

## Solution

1. `processInput` returns `activatedNeurons` from `processNewTaskToContext` (need to extract it).
2. `serializeOutput` accepts and writes `activated_neurons`, `request_files` sections.

## Files

- [a2a-server/scripts/process-input.ts](../a2a-server/scripts/process-input.ts)
- [a2a-server/src/knowledge/context-handler.ts](../a2a-server/src/knowledge/context-handler.ts)

## Notes

`processNewTaskToContext` returns context only, not `activatedNeurons`. Options:
- A: Refactor to return `{ context, activatedNeurons }`
- B: Call `activateNeurons` again in process-input with same context (duplicate work)
- A preferred — single activation, explicit result.

## Verification

Run etalon B. Output should show `### Activated neurons: validation` and `request_files: [...]`.

## Prev / Next

← [001](001-process-input-neurons.md) | → (none)
