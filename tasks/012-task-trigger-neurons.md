# Task 012: Add task-trigger neurons

**Index:** [tasks/README.md](README.md) | **Etalon:** [etalon-neuron-activation.md](../docs/etalon-neuron-activation.md)

---

## Problem

`taskText` is in contentPool, but base neurons have code triggers (FormRequest, extends Model). Task "add user validation" without codeBlocks won't fire validation neuron — "validation" substring would, but validation neuron triggers are FormRequest, rules(), etc.

## Solution

Add neurons with task-keyword triggers. Example: neuron with triggers `["validation", "rules", "validate"]` — activates when task says "add validation". Same for auth, test, model.

## Files

- New: [neurons/base/task-validation.neuron.ts](../a2a-server/src/knowledge/neurons/base/task-validation.neuron.ts) (or extend existing with task triggers)
- [neurons/base/index.ts](../a2a-server/src/knowledge/neurons/base/index.ts)

## Options

- A: New neurons (task-validation, task-auth, ...) — separate from content neurons
- B: Add task triggers to existing neurons (validation gets ["validation"] in addition to FormRequest)

Option B simpler — one neuron, multiple trigger types.

## Verification

Run etalon E with taskText "add validation". Validation neuron activates.
