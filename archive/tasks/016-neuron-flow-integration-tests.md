# Task 016: Neuron flow — integration tests

**Index:** [tasks/README.md](README.md)

---

## Problem

No integration test: POST /requests → neurons activate → result has request_files. process-input has no tests with neurons loaded.

## Solution

1. **Request API integration:** POST with new_task + codeBlocks (model). Assert result.context.request_files includes eloquent requests. Requires [001](001-process-input-neurons.md) or run against real server with neurons.
2. **process-input test:** Add test that runs process-input with etalon-B, asserts request_files in output. Requires [001](001-process-input-neurons.md).

## Files

- New: [tests/integration/requests-neurons.test.ts](../a2a-server/tests/integration/requests-neurons.test.ts)
- [process-input.ts](../a2a-server/scripts/process-input.ts) — or test via processNewTaskToContext directly with neurons

## Dependencies

[001](001-process-input-neurons.md) — neurons must load in test env.

## Verification

Integration test passes. Etalon B, D produce request_files in result.
