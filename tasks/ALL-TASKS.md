# Full backlog: data shape ↔ golden `simulations/` (T001–T024)

**Index with links:** [`README.md`](README.md)  
**Authority:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md), [`simulations/CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md), [`AGENTS.md`](../AGENTS.md)

**Verify:** `npm run sim:lint -- --all --json` (root); `npm run sim:validate -- --sim <name> --json` per touched flow.

---

## Tier A — Contract / correctness (do first)

| ID | Summary |
|----|---------|
| T001 | Vite `web-execute-dto.js` ↔ SDK `web-execute-dto.ts` parity |
| T002 | `sim-lint` received strip keys ↔ client `INTERNAL_CLIENT_ACTION_KEYS` |
| T018 | Poll `GET /requests/:id/result` whitelist drops `workbench` / `files` / `scratchpad` vs SCHEMA |
| T025 | `action-validator.ts` missing `rag-search`, `list-directory` vs `sim-lint` / protocol |
| T026 | Zod `message` string-only vs UI `{ content, role }` |
| T004 | Server `result` action keys only (no bare blobs) |

## Tier B — Client + SDK

| ID | Summary |
|----|---------|
| T003 | First invoke `context.execution` matches router goldens |
| T005 | `result.choice` vs legacy `actions[]` / `result.action` |
| T008 | SDK tests: single `execute` key / `extractExecuteAction` |
| T009 | `workbench` merge server ↔ `session-transform` |
| T010 | `includeContext`: raw vs Web DTO on session APIs |
| T012 | Tests: drop flat `execute.action`; use action-key shape |
| T013 | Unify Client API envelopes (`success` / `data` / `session`) |
| T019 | Document async URL matrix: A2A poll vs Vite `/async` vs SDK `AsyncClient` |
| T021 | Document `agent-rag-chain`: many invokes, one execute key each |
| T022 | SDK `auth.ts` TODOs (validation / project access) |

## Tier C — Server / transforms / docs

| ID | Summary |
|----|---------|
| T014 | `transform/index.ts` doc ↔ full op set (see SCHEMA table) |
| T017 | `scratchpad_ops` E2E: apply + persist vs SCHEMA |
| T020 | Document runtime-only `execute.wait` vs sync goldens |
| T027 | `finalResult` / `execute.finalResult` vs SCHEMA top-level `result` |

## Tier D — Hygiene / tests / misc

| ID | Summary |
|----|---------|
| T006 | Map golden step filenames ↔ runtime session filenames |
| T007 | Router `choices[].description` in goldens + server |
| T015 | Clarify `packages/json` `actionId` vs protocol keys |
| T028 | Merge `validateSimulationResponse` with `validateActionResponse` |

---

## Flat list (T001–T024)

1. **T001** — Web DTO parity (Vite vs SDK)  
2. **T002** — sim-lint keys ↔ buildWebExecute  
3. **T003** — First-step `context.execution` vs goldens  
4. **T004** — Server `result` action-key shape  
5. **T005** — `result.choice` vs legacy router  
6. **T006** — Session file names vs sim names (doc)  
7. **T007** — Router form `choices` metadata  
8. **T008** — SDK single-key execute tests  
9. **T009** — Workbench merge parity  
10. **T010** — includeContext / DTO behavior  
11. **T012** — Remove `execute.action` from tests  
12. **T013** — Client API envelope unification  
13. **T014** — Transform ops doc sync  
14. **T015** — JSON package `actionId` vs protocol  
15. **T017** — scratchpad_ops E2E  
16. **T018** — Poll result context filter  
17. **T019** — Async poll URL matrix  
18. **T020** — `execute.wait` runtime doc  
19. **T021** — Agent tool chain vs single execute  
20. **T022** — SDK auth TODOs  
21. **T025** — action-validator vs sim-lint types  
22. **T026** — execute.message Zod vs UI  
23. **T027** — finalResult vs SCHEMA `result`  
24. **T028** — Unify simulation response validation  

Each item has a matching `tasks/T0xx-*.md` file with Goal / Acceptance / pointers.