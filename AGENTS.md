# AGENTS.md

Guidance for agents working in this repository.

**Self-Upgrade in one sentence:** **doing work** here always has **two phases**:  
1) **Execute concrete tasks** from `tasks/` + `DEV_STATE` in the IDE.  
2) **When those are empty, run the stack queue through the Task Monitor** — **`npm run monitor`** or **`npm run monitor:once`** ([`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md), [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js)) so **`prompts-to-agent-mode/*.md`** are driven end-to-end via Client API sessions (`/next` + `/async`, router beats). Export evidence with **`npm run monitor:completed:json`** → **`merged`**. Write new testable tasks from outcomes into `tasks/` + `DEV_STATE`. **Ad-hoc** `POST /sessions` loops without the monitor are **debug / one-off repro only**, not the default way to burn the indexed queue.

## Quick Reference

| Topic | Reference |
|-------|-----------|
| **Operator workstation / production bar** | Repo is an **autonomous operator workstation**: multi-turn **async** sessions until terminal; **production acceptance** = explicit `tasks/` criteria + Task Monitor + offline validators (**contracts + boundary cases**). [`README.md`](README.md) *Project positioning* |
| **Windows live stack bootstrap/restart** | **`start-all.bat`** from repo root when you need full bootstrap or full reset — not per-service `npm run dev` ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)) |
| **Hot-reload policy (default)** | After code edits, **do not request full-stack restart by default**: `a2a-server` (`tsx watch`), Client API (`tsx watch`), Web UI (`vite`), `ai-integration` (`uvicorn --reload`), and promise daemon dev-watch auto-reload. Restart stack only for env/port/process-level faults. See [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md). |
| **Unified manual path** | **Client API only:** create session → **`mode: "agent"`** (or `execution.action`) → **`task`** → `next` + poll `async` — [`docs/AGENTS-REFERENCE.md` § Unified manual path](docs/AGENTS-REFERENCE.md#unified-manual-path-client-api) |
| **Markdown task ≠ one HTTP call** | Task text seeds **`task`**; **finishing** needs **many turns** on the **same `sessionId`** or **`npm run monitor`** — [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md) (top), [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) |
| **Backlog prompts (live stack)** | **[`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md)** + **[`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md)** — **run via Task Monitor** (`npm run monitor` / `monitor:once`); same Client API contour (`sessions`, `next`, poll `async`, `mode: "agent"`). Manual curl only for targeted debug, not batch queue |
| **Task Monitor (run + docs + static tests)** | **[`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)** · **`npm run monitor`** / `monitor:once` — **canonical** driver for `prompts-to-agent-mode/` (system of record for prompt ↔ **`sessionId`**); entry defaults **`TASK_MONITOR_STRICT_AGENT_COMPLETION=0`** (poll only — no auto continuation **`/next`**; Red Room tool cycles run without monitor nudges — opt in **`=1`** to burn queue until **`step=completed`** / **`context.result`**); scripts read **`npm run monitor:completed:json`** → **`merged`** · human: **`npm run monitor:completed`** · regression: **`npm run test:monitor`** (also last step of **`npm run test:before-start`**) |
| **Self-Upgrade order (policy)** | Do **`tasks/`** + **[`tasks/ide-prompts/`](tasks/ide-prompts/README.md)** first; **before large monitor / session volume**, archive needed **`a2a-client/storage/sessions/`** trees ([`tasks/README.md`](tasks/README.md) step 2); run **`prompts-to-agent-mode/`** / monitor **after** — not enforced in code; **[`tasks/README.md`](tasks/README.md)** (*Self-Upgrade order*) |
| **Single pipeline (API → prompts → observe → improve)** | **[`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md)** — linear sequence + failure classes + doc map |
| **Master prompt (run full prompt index + loop)** | **[`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md)** — root; paste Agent block into IDE or session `task` |
| **Sessions / curl / agent tests** | Same surface: not `invoke` alone — [`docs/AGENTS-REFERENCE.md` § Sessions / HTTP](docs/AGENTS-REFERENCE.md#sessions-tests-and-agent-mode-where-to-send-http) |
| **Schema debugging start point** | **[`tests/direct-tests/README.md`](tests/direct-tests/README.md)** — reproduce shape issues here first, then sims/e2e |
| **Offline validators (LLM / execute shape, sessions, sims)** | **[`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md)** — scripts flag contract mistakes (e.g. top-level `message` + tool vs `execute.message`); run from repo root: `scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions`, `sim:check-md`; client session drift → **`npm run audit:session-storage`** |
| **Promise id → artifacts + Gray Room MD report** | **`npm run report:promise -- <promiseId> [--out path.md] [--logs]`** — [`scripts/promise-artifacts-report.mjs`](scripts/promise-artifacts-report.mjs) aggregates server `storage/requests`, client session steps, `proxy_logs/promises/<id>/`, optional log lines; documents `interruptTrace` / `operationHistory` when present |
| **Triangle triage + colored alerts** | **[`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md)** — vertices **A/B/C**, loop **0→4**; **[`GLOSSARY.md`](GLOSSARY.md)** *Alerts* (triage colors) vs *Rooms* (Gray/Red/Black **Room** runtime) |
| **Iterativity + full normalization** | **[`DEV_STATE.md`](DEV_STATE.md)** *Iterativity — conditions for full project normalization* — per-cycle gates, queue honesty, stop rules; **[`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md)** |
| **Practical evidence (mandatory)** | Every loop must record runtime evidence (test output, `sessionId`/`promiseId`, async status, or concrete diff). If missing, run a minimal experiment first, then log it — [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) *Evidence rule* |
| **Yellow alert (AI code scan)** | **[`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md)** — paste invocation; debt/hacks/TODO/contract smells; not the same as *Yellow alert (operator)* in [`GLOSSARY.md`](GLOSSARY.md) |
| **Async-only (no sync switch)** | Never add **sync** invoke, **inline** LLM forwarding, or operator docs that tell people to **disable** the promise queue to “unstick” work — [Critical Rules §5](#5-async-only-transport-mandatory) |
| Imports | **Server / NodeNext:** `.js` on relative imports. **`premium-ui`:** `@/` (Vite) — [`.cursor/rules/code-hierarchy.mdc`](.cursor/rules/code-hierarchy.mdc) |
| Test ENCRYPTION_KEY | Exactly 32 characters |
| Test DB | `a2a_test` (not `a2a_server`) |
| Action-Key Shape | ONE action per execute/result |
| DEV_STATE | Always update before/after tasks |
| **No actionable work** | **Not** “done”: empty queue **triggers** maintenance — prune `DEV_STATE` (root + modules), discover work, write tasks — see [Empty queue](#empty-queue--mandatory-not-optional) and [`docs/AGENTS-REFERENCE.md` § DEV_STATE](docs/AGENTS-REFERENCE.md#dev_state-protocol) |
| **Why iteration stops** | Misreads vs mitigations — [`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md#why-iteration-stops-misreads-and-mitigations) |
| **Rules Q&A log (yes/no)** | **[`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md)** — interview answers only; normative text remains here + **DEV_STATE** |
| **Agent-over-agent safety** | Before edits: state goal/files/risks; keep minimal diffs; avoid unproven deletions — [Critical Rules §7](#7-agent-over-agent-safety-protocol-mandatory) |
| **Recursive-agent safety** | Guard against loops, uncontrolled self-modification, and entry-point loss; mark self-management as **EXPERIMENTAL** — [Critical Rules §9](#9-recursive-agent-safety-protocol-mandatory) |

### Empty queue — mandatory (not optional)

**Default human/agent misread:** “nothing in the queue” = work finished = stop. **In this repo that is wrong.**

1. **Prune** — Trim root and module `DEV_STATE.md` and any checklists: drop completed items, duplicates, noise.
2. **Discover** — Scan code, simulations, risks, backlog for real, testable work.
3. **Write** — Add concrete tasks to `DEV_STATE` and `tasks/pending/` as needed.
4. **Then drive the stack** — If, after (1)–(3), there is still no concrete work item to pick up, that is **not** a stop signal. It is an instruction to **run the Task Monitor** over `prompts-to-agent-mode/` (`npm run monitor` or `monitor:once`) so sessions surface new, testable tasks; write those back into `DEV_STATE` + `tasks/`. Use manual Client API only for a **single** repro step when the monitor is not the right tool.

Stopping with an empty queue **without** (1)–(3) is a protocol violation. Full rationale: [`docs/AGENTS-REFERENCE.md` § DEV_STATE Protocol](docs/AGENTS-REFERENCE.md#dev_state-protocol). Archived `archive/methodology/tasks.md` and related files are **not** in the tree — see [tasks/brown-alert/archive-methodology-missing.md](tasks/brown-alert/archive-methodology-missing.md).

**Minimal or vague user prompt is not a stop signal.** Silence, a one-liner, or no restated acceptance criteria does **not** mean “single turn then exit.” Keep iterating until stated criteria are met (or until you have honestly blocked and logged why). If there is no pending task text, still run (1)–(3) above instead of stopping. A stuck session after `next` is usually a **router contract** issue—inspect `GET …/sessions/{id}` and send **`message`** vs **`choice`** per [`docs/AGENTS-REFERENCE.md` § Router dialog](docs/AGENTS-REFERENCE.md#router-dialog-two-beats--read-this); that is a fix, not an excuse to halt.

### Evidence-first loop (mandatory)

Every iteration must include **practical evidence**, not only reasoning:

1. Run one concrete check (test/sim, session turn, curl poll, or targeted script).
2. Capture identifiers + terminal signal (`sessionId`/`promiseId`, pending/completed/failed, pass/fail).
3. If evidence is missing, run a **minimal experiment** first, then continue decisions.
4. Write the evidence in `DEV_STATE` (what ran, observed outcome, next action).

**No evidence = no closure.** Missing runtime proof is an open item, not completion.

---

## Critical Rules

### 0. Schema Debugging Entry Point (MANDATORY)

For schema-level debugging, start with **[`tests/direct-tests/README.md`](tests/direct-tests/README.md)** (section *Schema debugging — start here*). Reproduce and isolate the shape issue there before moving to session-flow checks, simulations (`sim:lint` / `sim:validate`), or full end-to-end runs. [`simulations/SCHEMA.md`](simulations/SCHEMA.md) points here so sim authors do not skip this step.

**Validators** (high-signal, offline checks — not Vitest): **[`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md)**. They print concrete problems (wrong assistant-line placement, missing router `description`, MD/JSON drift in sim mirrors, gray-room snapshot consistency). Use them when debugging LLM outputs, proxy logs, or saved sessions before chasing issues in full UI flows.

### 1. Imports with Path Aliases

Use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution)

### 2. Testing

- ENCRYPTION_KEY: exactly 32 characters
- Database: `a2a_test`

### 3. Action-Key Shape (MANDATORY)

```json
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { ... } } }
```

NOT: `{ "execute": { "action": "...", ... } }` or `{ "result": { "content": "..." } }`

### 4. Golden Simulations

- Single action per `response.json` execute
- `received.json`: client-sanitized (no `rag-search`, `read-file` in execute; only result)
- Workbench in `context.workbench.sections`
- No deprecated execute types (`execute.error-recovery`)
- Router choices need descriptive `description` + stable `id`
- Form metadata: title/description (not input array)

### 5. Async-only transport (MANDATORY)

**Do not** introduce or document a "switch to sync" path. This stack is **async end-to-end**: `POST /api/v1/invoke` returns **`promiseId`** only; terminal `execute` / `context` come from **polling** (`GET …/requests/{id}/result`, Client API **`GET …/async`**). For **ai-integration**, **`?promise=1`** traffic is **queued** when **`PROMISE_DAEMON_ONLY`** is on (default): drain it with the **promise-queue daemon** or **`POST …/promise/<id>/execute`** — **not** by turning the queue off for inline/synchronous forwarding. PRs and operator runbooks must **never** treat disabling the queue or adding a sync invoke flag as an acceptable workaround.

### 6. Client-Server Data Separation (MANDATORY)

Strict separation between a2a-client and a2a-server must be maintained to prevent data leakage:

- Client must not send internal data (sessionIds, project metadata) to server.
- Server must not send internal data (gray room processing, secrets, internal LLM chains like compress_history, thinking, auto_rag_page, auto_read_file, clarify) to client.
- Server responses should only include sanitized execute/context for client consumption. Internal server-side operations (e.g., gray room) must not appear in responses, as they could expose sensitive processing details or secrets if leaked.

### 7. Agent-over-Agent Safety Protocol (MANDATORY)

When editing this repository as an autonomous coding agent (agent operating on agent infrastructure):

- Treat architectural stability as default: preserve current module boundaries and async flow unless task scope explicitly requires change.
- Apply minimal, stepwise diffs. Avoid broad refactors unless explicitly requested.
- Before each edit batch, state: (a) change goal, (b) files to touch, (c) primary risks.
- Do not delete code unless you have concrete evidence it is unused and safe to remove.
- Prefer incremental verification after each step (tests, lint, or targeted runtime check) over large unverified change sets.

### 8. AI-only Documentation and Comments (MANDATORY)

Assume documentation and inline comments are consumed by an automated agent service, not a human reader.

Required style for README/docs/comments:

- Use unambiguous statements; avoid figurative language and metaphor.
- Explicitly define assumptions and constraints.
- For behavior descriptions, always state: **inputs**, **outputs**, and **side effects**.
- When multiple interpretations exist, list interpretations, choose one, and state the selection reason.
- Prefer deterministic wording (`must`, `must not`, `if/then`) over conversational wording.

Minimum contract block (for new/updated procedural docs):

1. **Inputs** — required fields, optional fields, accepted formats.
2. **Outputs** — returned artifacts, statuses, and terminal conditions.
3. **Side effects** — storage mutations, network calls, process changes.
4. **Assumptions** — preconditions expected to be true.
5. **Constraints** — hard limits, forbidden paths, non-goals.
6. **Ambiguities** — possible interpretations and chosen interpretation.

### 9. Recursive-Agent Safety Protocol (MANDATORY)

Assume this repository can run in a recursive agent environment where mistakes can impact the agent itself.

- Before and after each significant change, verify the change does not introduce logic loops, uncontrolled self-modification, or loss of a valid entry point.
- Prefer configuration/declarative controls over imperative self-management logic when both can solve the task.
- Any self-management, self-invocation, or self-update mechanism must be explicitly labeled **EXPERIMENTAL** in code comments/docs.
- If a requested change may degrade or destabilize agent behavior, stop implementation and report the risk and safer alternative.

---

## Extended reference

Operator walkthrough (Client API, router beats, iteration traps), A2A protocol, env/ports, API tables, debugging, testing, common issues, ADRs, glossary slice, DEV_STATE protocol detail, operational checklist: **[`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md)**.

Driver checklist and curl narrative: **[`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)**.
