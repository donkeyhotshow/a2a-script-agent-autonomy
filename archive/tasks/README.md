# Server Service Development Tasks

**Source:** [docs/adr-hacks/HACK-RESULTS-ANALYSIS.md](docs/adr-hacks/HACK-RESULTS-ANALYSIS.md) | **Neuron env:** [NEURON-ENVIRONMENT-ANALYSIS.md](NEURON-ENVIRONMENT-ANALYSIS.md) | **Completed:** [COMPLETED-SUMMARY.md](COMPLETED-SUMMARY.md)

---

## Dependency Graph

```
001 ──► 002 ──► 016
003
004 ──► 005 ──► 006
007
008 ──► 009
010
011 (ADR fix — done)
012 013 014 015
```

---

## Tasks

| # | Task | Depends | Status |
|---|------|---------|--------|
| [001](001-process-input-neurons.md) | Process-input: load neurons | — | done |
| [002](002-output-neuron-metadata.md) | Output: activated_neurons, request_files | [001](001-process-input-neurons.md) | done |
| [003](003-index-integration.md) | Index: integrate search.service | — | done |
| [004](004-processor-graph.md) | Processor: add entity recognition + graph | — | done |
| [005](005-result-context-block.md) | Result: full context block for client | [004](004-processor-graph.md) | done |
| [006](006-chatgpt-integration.md) | Replace ChatGPT placeholder | — | cancelled |
| [007](007-bootstrap-neuron.md) | Bootstrap neuron for empty pool | — | done |
| [008](008-processNewTask-return-activated.md) | processNewTaskToContext: return activatedNeurons | — | done |
| [009](009-request-api-injected-content.md) | Request API: include injected content in result | [008](008-processNewTask-return-activated.md) | done |
| [010](010-session-routes-context-handler.md) | Session routes: wire context-handler | — | done |
| [011](011-adr-content-triggers.md) | ADR 0008: content-based triggers | — | done |
| [012](012-task-trigger-neurons.md) | Add task-trigger neurons | — | done |
| [013](013-architectural-features-source.md) | architectural_features: document source | — | done |
| [014](014-request-files-resolution-spec.md) | request_files: client resolution spec | — | done |
| [015](015-neuron-activation-error-handling.md) | Neuron activation: error handling | — | done |
| [016](016-neuron-flow-integration-tests.md) | Neuron flow: integration tests | [001](001-process-input-neurons.md) | done |
