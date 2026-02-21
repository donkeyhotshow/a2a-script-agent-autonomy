# Task 001: Process-input — load neurons

**Index:** [tasks/README.md](README.md) | **Analysis:** [docs/adr-hacks/HACK-RESULTS-ANALYSIS.md](docs/adr-hacks/HACK-RESULTS-ANALYSIS.md)

---

## Problem

`process-input.ts` runs standalone. Neurons are never loaded. `activateNeurons` returns `[]`, so no `request_files` in context for etalon B, D.

## Solution

Import and call `registerBaseNeurons()` at script start.

## Files

- [a2a-server/scripts/process-input.ts](../a2a-server/scripts/process-input.ts)

## Change

```ts
import { registerBaseNeurons } from '../src/knowledge/neurons/base/index.js';

registerBaseNeurons();
```

Add before `parseMdInput` / main flow.

## Verification

Run etalon B, D. Output context should include `request_files` when neurons match.

## Next

→ [002-output-neuron-metadata.md](002-output-neuron-metadata.md)
