# Task 015: Neuron activation — error handling ✓

**Index:** [tasks/README.md](README.md)

---

## Status

Done. processNewTaskToContext wraps activateNeurons in try/catch.

## Problem

What if `activateNeurons` throws? Missing context block for inject target? Malformed trigger regex? No explicit handling — errors propagate.

## Solution

1. **neuron-activator:** wrap regex in try/catch per trigger (already done). Ensure no throw from activateNeurons.
2. **context-injector:** `getContextBlock` returns undefined for missing — resolveInjections skips (already done).
3. **processNewTaskToContext:** if activateNeurons throws, catch and return context without request_files (degraded mode).

## Files

- [neuron-activator.ts](../a2a-server/src/knowledge/neurons/neuron-activator.ts)
- [context-handler.ts](../a2a-server/src/knowledge/context-handler.ts)

## Verification

Invalid regex trigger → neuron skipped, no crash. Missing inject target → skipped.
