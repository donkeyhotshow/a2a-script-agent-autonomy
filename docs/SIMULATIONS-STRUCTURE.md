# Simulations Structure & README

**Merged from:** tests/simulations/README.md + tests/simulations/sync/README.md (DOC-STATE reorganization).

## Overview (from root README.md)

Golden fixtures for Web ↔ Client API ↔ Server ↔ LLM contract.

- **Validation:** `npm run sim:lint -- --all`, `npm run sim:validate -- --all` (from root/a2a-server).
- **Schema:** tests/simulations/SCHEMA.md — 8 files/step.
- **Quality:** `npm run sim:quality` exit 0 (CI gate).

## Sync Simulations Detail

**No promiseId** (immediate execution).

**Structure per step:**
```
{sim}/{step}/
├── client.json (Web→Client)
├── request.json (Client→Server)
├── server-transforms-request.json (opt)
├── request.md (Server→LLM opt)
├── response.md (LLM→Server opt)
├── server-transforms-response.json (opt)
├── response.json (Server→Client)
└── received.json (Client→Web)
+ description.md, analysis.md
```

**Available sync sims:** agent(-*), dialog, fix-vue/*, task-decomposition, etc. (full list in original sync/README.md).

**Substeps (N-sub-M):** Gray room only (no client/received).

**Keep data in:** tests/simulations/ (reference fixtures). Link from a2a-server/docs/.

**Archived:** 2024-10 DOC-STATE.

