# Central orchestrator — monitor, sessions, Papa/Mama, artifacts

**Purpose:** One canonical map for the **parameterless** entry ([`central-orchestrator.mjs`](../central-orchestrator.mjs) at repo root), the **Task Monitor** (Client API sessions over `prompts-to-agent-mode/`), **Papa & Mama** test layers, **simulations** as offline gates, and **artifact generators** that point operators at failure loci.

**Canonical policy links:** [`AGENTS.md`](../AGENTS.md) (async-only, Task Monitor), [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md), [`docs/PROJECT-RULES-QA.md`](PROJECT-RULES-QA.md).

---

## 1. Inputs

| Input | Required | Notes |
|-------|----------|--------|
| [`central-orchestrator.mjs`](../central-orchestrator.mjs) (repo root) | yes | Invoked with **no CLI arguments** (`process.argv` must be `[node, script]` only). |
| Environment | optional | Standard repo `.env` / `.env.local` for ports and monitor flags. **`CENTRAL_SKIP_OFFLINE=1`** — if set, the orchestrator runs **`monitor:once`** only (skip offline steps; use when the offline suite already passed). |
| Live stack | conditional | Task Monitor **`monitor:once`** **requires** Client API + routed services per [`docs/SYSTEM_STARTUP.md`](SYSTEM_STARTUP.md). Offline steps (**`test:before-start`**, **`cross-system:validate`**, sim gates) do **not** require the live stack. Papa shift in [`tests/papa-mama-gang.mjs`](../tests/papa-mama-gang.mjs) requires HTTP `:3000` for E2E. |

---

## 2. Outputs

| Output | Producer |
|--------|----------|
| **`tasks/pending/session-storage-*.md`** (regenerated when issues exist) | **`verify:audit-session-storage`** inside **`test:before-start`** (orchestrator step 1) |
| Client API **sessions** (`POST /api/a2a/sessions`, `/next`, poll `/async`) | Task Monitor ([`tests/monitor-and-process-tasks.js`](../tests/monitor-and-process-tasks.js)) — final step |
| **monitor-artifacts/** (`monitor-run-*.md`, `*.json`) | Task Monitor (when configured) |
| **task-monitor-state.json** | Task Monitor cursor / resume state |
| Console exit code | `0` success, non-zero failure |

---

## 3. Side effects

- **`test:before-start`** runs **`verify:audit-session-storage`**, which may **write or rewrite** Markdown under **`tasks/pending/`** and delete obsolete generated files when drift clears.
- **Task Monitor** may write **client session storage** under `a2a-client/storage/sessions/`, update **`task-monitor-state.json`**, and emit **monitor-artifacts/**.
- **`cross-system:validate`** only reads storage / prints; it does not write `tasks/pending/`.

---

## 4. Assumptions

- **Async-only transport** (Orange alert) end-to-end; no sync invoke workaround ([`GLOSSARY.md`](../GLOSSARY.md) *Orange alert*).
- **Self-Upgrade order:** prefer `tasks/` + `tasks/pending/` before burning large monitor volume ([`tasks/README.md`](../tasks/README.md)).

---

## 5. Constraints

- The **central orchestrator script** must **not** parse CLI flags or positional parameters. If extra argv is present, it must exit with an error and point to this document.
- Do **not** treat Markdown task files as a substitute for fixing the **HTTP driver loop** (monitor implements `/next` → `/async` → session).

---

## 6. Ambiguities and chosen interpretation

| Ambiguity | Chosen interpretation |
|-----------|-------------------------|
| “Central” vs `npm run monitor` | **`npm run central`** is the **documented** single door: **offline** Mama gate (**`test:before-start`**), **cross-system** validators, **sim** lint/validate/strict MD check, then **`monitor:once`**. Long-running queue burn remains **`npm run monitor`** / `monitor:daemon`. |
| “Mama” vs `test:indirect` | **`test:indirect`** is the **default Mama bundle** in [`tests/indirect-tests/run-all.mjs`](../tests/indirect-tests/run-all.mjs). **`npm run central`** uses **`test:before-start`**, which adds server units, **`test:monitor`**, and **`verify:audit-session-storage`**. **`tests/papa-mama-gang.mjs`** extends further with client units and **proba-servera**. |
| Simulations “in tests” | **Offline:** `npm run sim:lint:all` and `npm run sim:validate -- --all` (delegate to **a2a-server**). **`npm run central`** runs both after **`cross-system:validate`** and **`sim:check-md:fail`**. |
| Skip offline | **`CENTRAL_SKIP_OFFLINE=1`** runs **`monitor:once`** only — not a second CLI; environment only. |

---

## 7. Chain: orchestrator → offline gates → monitor → sessions

1. **Operator runs** `npm run central` (no arguments). **Runtime:** much longer than the historical two-step central (full Mama + session audit + cross-system + sims + one monitor pass).

2. **Unless** **`CENTRAL_SKIP_OFFLINE=1`**, the script runs in order:
   - **`npm run test:before-start`** — indirect tests, server unit script, **`test:monitor`**, **`verify:audit-session-storage`** (generator contract + **`audit:session-storage`** + accuracy).
   - **`npm run cross-system:validate`** — [`tests/cross-system-validate.mjs`](../tests/cross-system-validate.mjs) (`scan-promise-bodies`, `scan-session-responses`, `verify:gray-room` on latest snapshot with sequence, **`audit:sim-choice-descriptions`**; skips missing dirs).
   - **`npm run sim:check-md:fail`** — MD vs JSON drift under **`simulations/`** with **exit non-zero** on mismatch.
   - **`npm run sim:lint:all`**
   - **`npm run sim:validate -- --all`**

3. **`npm run monitor:once`** — one Task Monitor pass (requires live stack).

4. **Monitor** selects a prompt under **`prompts-to-agent-mode/`**, creates or resumes **Client API sessions**, sends **`/next`**, polls **`/async`**, hydrates session — see [`docs/AGENT-DIALOG-API-STATE.md`](AGENT-DIALOG-API-STATE.md).

5. **Evidence** lands in **session storage** and optional **monitor-artifacts/** for audit.

---

## 8. Papa and Mama — unified map

| Layer | Role | Typical command | Live stack |
|-------|------|-----------------|------------|
| **Mama (narrow)** | Schemas, registry, red/gray fixtures | `npm run test:indirect` | No |
| **Mama (repo gate)** | Indirect + server unit + monitor + **`verify:audit-session-storage`** | `npm run test:before-start` | No |
| **Mama (gang)** | Indirect + server + client units + **sim:validate** + proba | `node tests/papa-mama-gang.mjs` | Proba no; Papa checks `:3000` |
| **Papa** | E2E Client API dialog, optional hub checks | Inside `papa-mama-gang.mjs` | Yes (`:3000`, optional `:11434`) |

**Maintenance rule:** when adding a new **offline** failure class, wire it into **Mama** (indirect or `test:before-start`) or **gang** so the same class cannot regress silently.

---

## 9. Simulations as test gates

| Gate | Command | What it proves |
|------|---------|----------------|
| Lint | `npm run sim:lint:all` | Authoring and JSON shape rules |
| Validate | `npm run sim:validate -- --all` | Golden step bundles per [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) |
| MD vs JSON | `npm run sim:check-md:fail` | Fenced JSON in `request.md` / `response.md` matches sibling `*.json` (strict) |

**Interpretation:** Simulations are **offline** system tests of server/dialog fixtures. They **complement** Mama indirect tests; **papa-mama-gang** runs **`sim:validate`**; **`npm run central`** runs **lint + validate + strict MD**.

---

## 10. Artifact generators — error loci

These systems **emit documents** (or console paths) that **name the broken file or contract**, not vague “something failed”.

| Generator | Command | Artifact / signal |
|-----------|---------|---------------------|
| Session storage audit | `npm run audit:session-storage` | `tasks/pending/session-storage-*.md` — per-session and cluster tasks with **Findings** and **Evidence paths** |
| Full audit verify | `npm run verify:audit-session-storage` | Regenerates tasks + checks accuracy vs `scripts/lib/session-storage-audit-analyze.mjs` |
| Promise report | `npm run report:promise -- <promiseId>` | Markdown report — server storage, client steps, proxy logs |
| Validators | `scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, etc. | Stdout — file paths and rule IDs ([`tests/direct-tests/validators/README.md`](../tests/direct-tests/validators/README.md)) |

**Goal:** One **quality** surface: **Mama** catches shape drift early; **monitor + sessions** catch live-stack behavior; **artifact generators** turn failures into **actionable paths** under `tasks/pending/` or reports.

---

## 11. Related entry points

| Entry | Use when |
|-------|----------|
| `npm run central` | Parameterless door: **offline** suite + **`monitor:once`**; **`CENTRAL_SKIP_OFFLINE=1`** → **`monitor:once`** only |
| `npm run central:offline` | Same offline steps as **`npm run central`** except **`monitor:once`** — **`test:before-start`**, **`cross-system:validate`**, **`sim:check-md:fail`**, **`sim:lint:all`**, **`sim:validate --all`**. No live stack. Duplicates the orchestrator offline chain from [`package.json`](../package.json). |
| `npm run monitor` | Full prompt queue / daemon |
| `npm run verify:audit-session-storage` | Regenerate + verify session-storage task docs |
| `npm run test:before-start` | CI-style offline gate (includes full session-storage verify) |
| `node tests/papa-mama-gang.mjs` | Extended Mama + Papa integration |
