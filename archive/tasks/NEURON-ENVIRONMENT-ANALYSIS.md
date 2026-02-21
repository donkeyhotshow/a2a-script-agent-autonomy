# Neuron Environment Analysis

**Index:** [tasks/README.md](README.md) | **Etalon:** [docs/etalon-neuron-activation.md](docs/etalon-neuron-activation.md)

---

## 1. Neuron System Boundary

```mermaid
flowchart TB
    subgraph inputs [Inputs]
        new_task[new_task]
        codeBlocks[codeBlocks path+content]
        arch[architectural_features]
    end
    
    subgraph neuron_core [Neuron Core]
        AC[ActivationContext]
        AN[activateNeurons]
        AS[neuron-store]
        CS[context-store]
    end
    
    subgraph outputs [Outputs]
        activated[ActivatedNeuron[]]
        inject[resolveInjections]
        request_files[resolveRequestFiles]
    end
    
    new_task --> AC
    codeBlocks --> AC
    arch --> AC
    AC --> AN
    AS --> AN
    CS --> inject
    AN --> activated
    activated --> inject
    activated --> request_files
```

---

## 2. Inputs (ActivationContext)

| Field | Source | Used by |
|-------|--------|---------|
| filePaths | codeBlocks.map(c => c.path) | contentPool (indirect) |
| fileContents | codeBlocks → Record<path, content> | contentPool |
| projectStructure | architectural_features | contentPool |
| taskText | new_task.join(' ') | contentPool |

**Gaps:**
- `architectural_features` not always passed from client
- codeBlocks optional — empty for etalon A, B, E

---

## 3. Outputs

| Output | Consumer | Flow |
|--------|-----------|------|
| ActivatedNeuron[] | context-injector | resolveInjections, resolveRequestFiles |
| request_files | context | processNewTaskToContext merges into result |
| injectedContent | — | processNewTaskToContext does NOT use it (stateless) |

**Gap:** processNewTaskToContext uses request_files but discards injectedContent. Session flow (handleRootContext) uses both.

---

## 4. Consumers (who calls neuron system)

| Consumer | Entry | Neurons loaded? | Uses activatedNeurons? |
|----------|-------|-----------------|------------------------|
| request-processor | processNewTaskToContext | ✓ (app.ts) | No — only context |
| process-input | processNewTaskToContext | ✗ | No |
| handleRootContext | context-handler | ✓ | Yes — inject, request_files |
| handleNewTask | context-handler | ✓ | Yes |
| handleContext | context-handler | ✓ | Yes |
| neurons-cli | activateNeurons direct | ✓ (manual) | Yes |

**Gap:** handleRootContext/handleNewTask/handleContext exist but are NOT called from sessions.routes. Session API does not use context-handler.

---

## 5. Providers (what feeds neurons)

| Provider | What | Used by |
|----------|------|---------|
| neuron-store | registered neurons | activateNeurons |
| neurons/base | registerBaseNeurons | app.ts |
| context-store | inject targets (neuron-context-*) | resolveInjections |

---

## 6. External Dependencies

| Dependency | Status |
|------------|--------|
| app.ts registerBaseNeurons | ✓ Loaded at startup |
| context-store builtin blocks | ✓ 7 blocks |
| Neuron inject targets | Must exist in context-store |

---

## 7. Gaps Summary

| # | Gap | Impact | Task |
|---|-----|--------|------|
| 1 | process-input no neurons | Etalon B, D show no request_files | [001](001-process-input-neurons.md) |
| 2 | processNewTaskToContext returns context only | activatedNeurons not exposed | [008](008-processNewTask-return-activated.md) |
| 3 | Session routes don't call context-handler | handleRootContext unused | [010](010-session-routes-context-handler.md) |
| 4 | Injected content not in Request API result | Client gets request_files but not injected knowledge | [009](009-request-api-injected-content.md) |
| 5 | architectural_features optional | Arch-triggered neurons may not fire | [013](013-architectural-features-source.md) |
| 6 | ADR 0008 said path triggers | Outdated; implementation is content-based | [011](011-adr-content-triggers.md) ✓ |
| 7 | No task-trigger neurons | "add validation" without codeBlocks won't fire | [012](012-task-trigger-neurons.md) |
| 8 | request_files resolution unclear | Client doesn't know how to resolve globs | [014](014-request-files-resolution-spec.md) |
| 9 | No error handling for neuron failures | Crashes possible | [015](015-neuron-activation-error-handling.md) |
| 10 | No integration tests | Neuron flow untested end-to-end | [016](016-neuron-flow-integration-tests.md) |
