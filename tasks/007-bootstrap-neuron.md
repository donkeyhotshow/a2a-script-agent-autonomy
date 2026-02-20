# Task 007: Bootstrap neuron for empty pool

**Index:** [tasks/README.md](README.md) | **Etalon:** [etalon-neuron-activation.md](../docs/etalon-neuron-activation.md)

---

## Problem

Etalon A, E: empty pool (no codeBlocks, no arch, task doesn't match). 0 neurons. No `request_files` to gather context. User stuck.

## Solution

Add "bootstrap" neuron: activates when `contentPool` is empty or below threshold. Actions: `request_files: [composer.json, package.json, app/, resources/]` (generic discovery).

## Files

- New: [bootstrap.neuron.ts](../a2a-server/src/knowledge/neurons/base/bootstrap.neuron.ts)
- [neurons/base/index.ts](../a2a-server/src/knowledge/neurons/base/index.ts)
- [neuron-activator.ts](../a2a-server/src/knowledge/neurons/neuron-activator.ts)

## Implementation

Option A: Neuron with empty triggers + special `activatesWhenEmpty: true` in types.
Option B: In `activateNeurons`, if result empty and pool empty → inject bootstrap manually.

Option A cleaner — extend Neuron type.

## Verification

Run etalon A, E. Should get `request_files` from bootstrap neuron.

## Prev / Next

— | —
