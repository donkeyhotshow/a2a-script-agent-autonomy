# Simulation audit workbook

Use this as a **session log** when scanning [`simulations/`](./) for schema gaps, legacy shapes, and drift from [`SCHEMA.md`](./SCHEMA.md). Pair it with [`AGENTS.md`](../AGENTS.md) (golden rules) and server docs ([`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](../a2a-server/docs/EXTENDING-LLM-ACTIONS.md)).

## What automation already covers

| Tool | Location | Scope |
|------|----------|--------|
| `sim:lint` | [`a2a-server/scripts/sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) | JSON syntax, required step files, single key under `execute` in `response.json`, allowed execute types, bare `result` warning, first-step hints, kebab-case sim folder names, optional root `description.md`, `received.json` `execute` free of client-only tool keys (aligned with `buildWebExecute`) |
| `sim:validate` | [`a2a-server/scripts/sim-validate.ts`](../a2a-server/scripts/sim-validate.ts) | AJV + pipeline checks vs [`docs/new-request-flow/json-schemas/`](../docs/new-request-flow/json-schemas/) (normalization unless `--strict`) |

**Still manual / spot-check:** embedded JSON in `request.md` / `response.md` vs sibling `.json` files; optional greps below remain useful for protocol drift and types not covered above. Use the [discrepancy grep checklist](#discrepancy-grep-checklist-beyond-lintvalidate) when doing a full audit pass.

---

## 1. Session header (copy per audit run)

Fill in at the start of each session (or duplicate this block in `simulations/_audit/<YYYY-MM-DD>/NOTES.md`).

| Field | Value |
|-------|--------|
| Date | |
| Git branch | |
| Git commit | `git rev-parse HEAD` |
| Scope | All simulations / list: … |
| Artifact directory | e.g. `simulations/_audit/2025-03-25/` |

**In scope:** Top-level folders under `simulations/` that `sim:lint --all` traverses: each **kebab-case** directory that contains numbered step dirs (`1/`, `2/`, …) and/or a root `request.json`, plus nested sim names like `agent-coder/3` as reported by `npm run sim:lint:all -- --json` under each result’s `name`. Special trees such as [`dialog/`](./dialog/) follow the same layout rules if they participate in lint.

**Done (checkboxes):** optional list of `name` values from lint JSON you have fully reviewed.

---

## 2. Baseline snapshots (machine-readable state)

From **repository root** (scripts forward to `a2a-server`):

```bash
mkdir -p simulations/_audit/<YYYY-MM-DD>
npm run sim:lint:all -- --json > simulations/_audit/<YYYY-MM-DD>/sim-lint.json
npm run sim:validate -- --all --json > simulations/_audit/<YYYY-MM-DD>/sim-validate.json
```

**Windows CMD** (same redirection):

```bat
mkdir simulations\_audit\<YYYY-MM-DD>
npm run sim:lint:all -- --json > simulations\_audit\<YYYY-MM-DD>\sim-lint.json
npm run sim:validate -- --all --json > simulations\_audit\<YYYY-MM-DD>\sim-validate.json
```

**PowerShell** (UTF-8, avoids broken Unicode):

```powershell
New-Item -ItemType Directory -Force -Path "simulations/_audit/<YYYY-MM-DD>"
npm run sim:lint:all -- --json | Out-File -Encoding utf8 "simulations/_audit/<YYYY-MM-DD>/sim-lint.json"
npm run sim:validate -- --all --json | Out-File -Encoding utf8 "simulations/_audit/<YYYY-MM-DD>/sim-validate.json"
```

Git Bash on Windows behaves like the Unix snippet. Keep artifacts under `simulations/_audit/` locally or add that path to `.gitignore` if you do not want commits.

---

## 3. Per-simulation progress table (template)

Columns: **`sim`** (exact string for `npm run sim:lint -- --sim <sim>`), **`lint`**, **`validate`**, **`notes`**.

Populate `sim` from `sim-lint.json` results (`name` field) or by inspecting `simulations/*`.

| sim | lint (pass/fail) | validate (pass/fail) | notes |
|-----|------------------|----------------------|-------|
| | | | |
| | | | |

---

## 4. Discrepancy grep checklist (beyond lint/validate)

Run from **repository root**. Expect **no hits** unless noted.

- Stray client storage snapshots (delete when normalizing goldens):

  ```bash
  rg -n "server-response\.json" simulations
  ```

- Deprecated execute types:

  ```bash
  rg -n "error-recovery" -g "*.json" simulations
  ```

- Bare `result` blobs (should use action-key shape, e.g. `{ "read-file": { ... } }`):

  ```bash
  rg -n 'result"\s*:\s*\{\s*"content"' -g "*.json" simulations
  ```

- **`received.json`:** client-only tool keys must not appear under top-level **`execute`** (they may appear under **`result`** as action-key payloads). Adjust the pattern if new tool keys are added to the protocol; align with [`a2a-client/packages/vite-plugin/routes/utils/web-execute-dto.js`](../a2a-client/packages/vite-plugin/routes/utils/web-execute-dto.js) / SDK `web-execute-dto`.

  ```bash
  rg -n '"rag-search"\s*:|"read-file"\s*:|"write-file"\s*:|"execute-command"\s*:|"script"\s*:\s*\{|"list-directory"\s*:|"grep-search"\s*:|"file-exists"\s*:|"edit-patch"\s*:|"run-script"\s*:' -g "**/received.json" simulations
  ```

  Inspect each hit: path must be under `result`, not `execute`.

- **`response.json`:** heuristic for multiple action keys under `execute` (prefer relying on `sim:lint`; use grep for spot checks):

  ```bash
  rg -n '"execute":\s*\{[^}]*"(form|script|read-file|rag-search)"' -g "**/response.json" simulations
  ```

**Manual (optional):** Embedded JSON in `request.md` / `response.md` should match `request.json` / `response.json` for the same step. No tool enforces this in CI.

---

## 5. Server redundancy and dead-weight (methodology)

Use this after simulation goldens look clean, to find **overlap or obsolete server code**—not as a license to delete without review.

1. **Execute surface vs lint allowlist**  
   Compare `VALID_EXECUTE_TYPES` in [`sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) with handlers, transforms, and prompts under [`a2a-server/src`](../a2a-server/src) and [`a2a-server/prompts`](../a2a-server/prompts). Types allowed in lint but never implemented (or implemented but never in goldens) may indicate docs drift or removable paths.

2. **Deprecations**  
   Read recent ADRs in [`docs/adr/`](../docs/adr/) and [`EXTENDING-LLM-ACTIONS.md`](../a2a-server/docs/EXTENDING-LLM-ACTIONS.md). Grep the server for removed symbols or old action names before removing code.

3. **Duplicate HTTP / session surfaces**  
   [`AGENTS.md`](../AGENTS.md) documents multiple entry points (e.g. Vite Client API vs A2A server session routes). Treat differences as **intentional contracts** until proven duplicate **logic** (same behavior maintained twice). Prefer consolidating implementation behind one module and thin adapters rather than deleting routes blindly.

---

## 6. Optional follow-ups (not required)

- `simulations/_audit/.gitignore` with `*` is present to keep snapshot artifacts local (directory may be empty until you run §2).
- Further `sim-lint` rules (e.g. stricter `workbench` shape) can be added as the schema evolves.
