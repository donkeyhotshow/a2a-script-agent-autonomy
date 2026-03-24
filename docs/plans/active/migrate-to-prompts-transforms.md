# Plan: Full Migration to prompts/transforms

## Goal

Make `a2a-server/prompts/transforms/` the **single source of truth** for all server transform pipelines. Remove or deprecate per-step `server-transforms-*.json` in `simulations/`.

---

## Current State

| Location | Contents | Used By |
|---------|----------|---------|
| `prompts/transforms/` | `server-transforms-request.json`, `server-transforms-response.json`, `{action}-request.json`, `{action}-response.json` | DialogRequestProcessor (dialog only) |
| `simulations/<name>/<step>/` | Per-step `server-transforms-request.json`, `server-transforms-response.json` | SimulationRequestProcessor (replay) |

**prompts/transforms** layout:
- `server-transforms-request.json` — generic LLM request (append history, render-markdown with `{{TEMPLATE_NAME}}`)
- `server-transforms-response.json` — generic LLM response (parse-json-from-md → execute, context)
- `dialog-request.json`, `dialog-response.json` — non-LLM form steps (no render-markdown, no parse-json)
- Same for `coder`, `analyze`, `auto-ai`

**simulations** layout:
- ~89 step dirs with `server-transforms-*.json`
- Some steps: LLM (request.md, response.md); some: server-only (no .md)
- Template refs: `a2a-server/prompts/<name>-request.md` or `simulations/<name>/<step>/request.md`

---

## Target State

1. **Runtime**: All processors load transforms from `prompts/transforms/`
2. **simulations**: Keep `request.json`, `response.json`, `client.json`, `received.json`, `request.md`, `response.md` as golden fixtures; **remove** `server-transforms-*.json` (or keep as deprecated symlinks for tests)
3. **Schema mapping**: `simulationName` + optional `step` → schema name (e.g. `dialog/3` → `dialog`, `agent-coder/3` → `coder` action schema)

---

## Phases

### Phase 1: Simulation processor → prompts/transforms (Runtime)

**Scope**: `SimulationRequestProcessor` uses `runPromptsTransform` instead of `runSimulationTransform`.

**Tasks**:
1. Add `SIMULATION_TO_SCHEMA` mapping in pipeline or processor:
   - `dialog` → `dialog`
   - `coder` → `coder`
   - `analyze` → `analyze`
   - `auto-ai` → `auto-ai`
   - `fix-vue-imports` → `fix-vue-imports` or `coder` (decide)
   - `task-decomposition` → `task-decomposition` (add schema if missing)
   - `test-action-flow` → `test-action-flow` or generic
2. Extend `runPromptsTransform` to support step-specific overrides:
   - Try `{schema}-{step}-request.json` / `{schema}-{step}-response.json` first
   - Fallback to `server-transforms-request.json` / `server-transforms-response.json` with `{{TEMPLATE_NAME}}`
3. Update `SimulationRequestProcessor.handleReplay()` and `runSimulationTransforms()` to call `runPromptsTransform(promptsTransformsPath, schemaName, input, type, { baseDir })` instead of `runSimulationTransform(simulationDir, ...)`
4. Add `PROMPTS_TRANSFORMS_PATH` env (default: `process.cwd()/prompts/transforms` when cwd is a2a-server)

**Files**:
- `a2a-server/src/transform/pipeline.ts` — extend `runPromptsTransform` with step param, step-specific file lookup
- `a2a-server/src/services/core/request-processor/simulation-request-processor.ts` — switch to `runPromptsTransform`

---

### Phase 2: Step-specific transforms (when needed)

**Scope**: Some steps have different response transforms (e.g. dialog/2 = copy-only, dialog/3 = parse-json-from-md).

**Tasks**:
1. Audit simulations: list steps with non-standard transforms
2. For each: either
   - **A)** Add `{schema}-{step}-response.json` in prompts/transforms (e.g. `dialog-2-response.json`), or
   - **B)** Use `switch` in generic `server-transforms-response.json` by step (if feasible)
3. Implement lookup: `{schema}-{step}-{type}.json` → else `server-transforms-{type}.json`

**Example**:
- `dialog-2-response.json` — copy only (no LLM)
- `dialog-3-response.json` — optional override; if absent, use `server-transforms-response.json`

---

### Phase 3: Template refs and SCHEMA_TO_TEMPLATE

**Scope**: Ensure all schemas have correct template mapping.

**Tasks**:
1. Extend `SCHEMA_TO_TEMPLATE` in `pipeline.ts`:
   - `fix-vue-imports` → `fix-vue-imports-request.md` or reuse `coder-request.md`
   - `task-decomposition` → `task-decomposition-request.md` (create if needed)
2. For schemas using local templates (`simulations/task-decomposition/5/request.md`): either
   - Move templates to `prompts/` and add schema, or
   - Keep simulation-specific path in step override

---

### Phase 4: Deprecate simulations server-transforms

**Scope**: Remove or mark as deprecated `server-transforms-*.json` in simulations.

**Tasks**:
1. Run full simulation suite; ensure all pass with prompts/transforms
2. Add deprecation notice in `simulations/SCHEMA.md`: "server-transforms-*.json are deprecated; transforms live in a2a-server/prompts/transforms"
3. Optionally: delete `server-transforms-*.json` from simulations (or keep for reference during transition)
4. Update `sim-compare.ts`, `sim-report.ts`, `run-simulation.ts` to not rely on per-step transforms

---

### Phase 5: Tests and tooling

**Tasks**:
1. Update `tests/transform-runtime.test.ts` — use prompts/transforms paths
2. Update `scripts/run-dist-transform.ts` — use prompts/transforms
3. Update docs: `docs/server-elements-hierarchy.md`, `simulations/SCHEMA.md`, `docs/new-request-flow/SERVER-ARCHITECTURE.md`

---

## Schema → Template Mapping (Current)

| Schema | Template |
|--------|----------|
| dialog | dialog-request.md |
| auto-ai | auto-ai-request.md |
| coder | coder-request.md |
| analyze | analyze-request.md |
| fix-vue-imports | (add or reuse coder) |
| task-decomposition | (add) |

---

## Simulation → Schema Mapping (To Add)

| Simulation | Schema |
|------------|--------|
| dialog | dialog |
| coder | coder |
| analyze | analyze |
| auto-ai | auto-ai |
| fix-vue-imports | coder or fix-vue-imports |
| task-decomposition | task-decomposition |
| coder-smart | coder |
| test-action-flow | test-action-flow or generic |

---

## File Layout After Migration

```
a2a-server/prompts/
├── transforms/
│   ├── server-transforms-request.json    # Generic LLM request ({{TEMPLATE_NAME}})
│   ├── server-transforms-response.json  # Generic LLM response
│   ├── dialog-request.json              # Non-LLM form (optional)
│   ├── dialog-response.json             # Non-LLM form (optional)
│   ├── dialog-2-response.json           # Step override (optional)
│   ├── coder-request.json               # ...
│   ├── coder-response.json
│   ├── analyze-request.json
│   ├── analyze-response.json
│   ├── auto-ai-request.json
│   ├── auto-ai-response.json
│   └── [task-decomposition-*, fix-vue-imports-* as needed]
├── dialog-request.md
├── coder-request.md
├── analyze-request.md
└── auto-ai-request.md

simulations/
├── dialog/
│   ├── 1/
│   │   ├── client.json
│   │   ├── request.json
│   │   ├── response.json
│   │   └── received.json
│   │   # server-transforms-*.json REMOVED
│   ├── 2/
│   └── 3/
│       ├── request.md
│       └── response.md  # Golden fixtures kept
└── ...
```

---

## Risks

| Risk | Mitigation |
|------|-------------|
| Step-specific transforms differ widely | Add step override files; fallback to generic |
| Simulations fail after migration | Run `npm run test:sim:all` before/after; fix diffs |
| baseDir / template path resolution | Use project root for prompts; document cwd expectations |

---

## Success Criteria

- [ ] DialogRequestProcessor uses prompts/transforms (done)
- [ ] SimulationRequestProcessor uses prompts/transforms
- [ ] All simulation replay tests pass
- [ ] No runtime reads of `simulations/*/server-transforms-*.json`
- [ ] Docs updated
