# Task 009: Request API — include injected content in result

**Index:** [tasks/README.md](README.md) | **Depends:** [008-processNewTask-return-activated.md](008-processNewTask-return-activated.md)

---

## Problem

processNewTaskToContext produces `request_files` (from neurons) but not `injectedContent`. Session flow uses `mergeInjectedContext(resolveInjections(activatedNeurons))` — Request API does not. Client gets request_files but not the knowledge blocks (Laravel 11, validation, etc.).

## Solution

After [008](008-processNewTask-return-activated.md), request-processor has `activatedNeurons`. Add:
1. `resolveInjections(activatedNeurons)` → InjectedContext[]
2. `mergeInjectedContext(injected)` → string
3. Include in result: `injected_content`, `activated_neuron_ids`

## Files

- [request-processor.service.ts](../a2a-server/src/services/request-processor.service.ts)
- [context-injector.ts](../a2a-server/src/knowledge/context-injector.ts)

## Result shape

```json
{
  "outcome": "completed",
  "context": { "tasks": [...], "request_files": [...] },
  "injected_content": "## Laravel 11...\n\n## Validation...",
  "activated_neuron_ids": ["neuron-eloquent", "neuron-validation"]
}
```

## Verification

POST with codeBlocks (model + FormRequest). Result includes injected_content.

## Prev / Next

← [008](008-processNewTask-return-activated.md) | —
