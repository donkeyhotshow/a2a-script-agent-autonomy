# Task 008: processNewTaskToContext — return activatedNeurons

**Index:** [tasks/README.md](README.md) | **Analysis:** [NEURON-ENVIRONMENT-ANALYSIS.md](NEURON-ENVIRONMENT-ANALYSIS.md)

---

## Problem

`processNewTaskToContext` returns `Record<string, unknown>` (context only). `activatedNeurons` is computed but not exposed. Consumers (process-input, request-processor) cannot report which neurons fired.

## Solution

Refactor to return `{ context, activatedNeurons }`:

```ts
export function processNewTaskToContext(
  context: Record<string, unknown>,
  codeBlocks: Array<{ path: string; content?: string }>
): { context: Record<string, unknown>; activatedNeurons: ActivatedNeuron[] }
```

## Files

- [context-handler.ts](../a2a-server/src/knowledge/context-handler.ts)
- [request-processor.service.ts](../a2a-server/src/services/request-processor.service.ts)
- [process-input.ts](../a2a-server/scripts/process-input.ts)
- [process-new-task.test.ts](../a2a-server/tests/unit/process-new-task.test.ts)

## Breaking change

Callers must destructure: `const { context, activatedNeurons } = processNewTaskToContext(...)`.

## Verification

Tests pass. process-input can use activatedNeurons for output.

## Next

→ [009-request-api-injected-content.md](009-request-api-injected-content.md)
