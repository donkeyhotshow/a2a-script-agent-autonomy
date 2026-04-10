# Master prompt — full-spectrum run (repo + live stack)

**Self-Upgrade process:** This represents the Self-Upgrade mechanism: tasks are **launched through the Client API session dialog** — automated by **`tests/monitor-and-process-tasks.js`** (Task Monitor) or driven manually with the same `sessions` / `next` / `async` contour. See [GLOSSARY.md](GLOSSARY.md) (*Self-Upgrade*, *Task Monitor*). **Before a full-index or heavy run:** archive valuable session trees under `a2a-client/storage/sessions/` — [tasks/README.md](tasks/README.md) (*Self-Upgrade order*, step 2).

> **Do not confuse “paste this file” with “the stack ran the task.”** Indexed prompts need **one `sessionId` + many `/next`/`/async` turns** (or a running **`npm run monitor`**). Pasting the Agent block into Cursor without the daemon still means **you** must start the monitor or accept that **no** Client API dialog is advancing — see [prompts-to-agent-mode/README.md](prompts-to-agent-mode/README.md) (top callout).

**Primary instrument for “run the indexed prompts on the live stack”:** **[`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)** — that doc is the operator manual for dialog-based task launch (`npm run monitor`, env, router beats, errors → direct-tests).

**Use this file to start the entire work surface:** indexed tasks under `prompts-to-agent-mode/`, methodology, Client API checks, docs/sims — through **Task Monitor daemon** plus event-driven IDE follow-up on **`hooks/`**.

| You drive… | What to do |
|------------|------------|
| **Cursor / IDE agent** | Paste the **Agent prompt** block below. Run **`npm run monitor`** (or `node tests/monitor-and-process-tasks.js`); react to **`hooks/`** when the instrument surfaces failures or timeouts. |
| **Live stack only** | Same: start the Task Monitor; use **`MONITOR-QUICK-START.md`** for commands and env; intervene via Client API only when hooks or errors require it. |

**Client API base URL:** default dev is `http://localhost:5173`; other deployments — [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md).

**Operator guide (instrument + dialog contour):** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md). **Entry script:** [`tests/monitor-and-process-tasks.js`](tests/monitor-and-process-tasks.js). **Hook system:** JSON under `hooks/` — **Task Monitor** writes **`hooks/task_monitor_issue.json`** (see **errors[]** below) and **`hooks/task_completion_report.json`** on completion. **`hooks/CURSOR_AGENT_SIGNAL.md`** / **`.json`** are optional **sample / hand-maintained** IDE nudge files (this repo has **no** scheduled writer for them — not Task Monitor). **Task catalog:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md). **Normative spine:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md). **Indexed stack rules:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md). **Iteration traps + runbook:** [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md).

**Completed prompts → Client API `sessionId`:** after runs, use **`npm run monitor:completed`** (human) or **`npm run monitor:completed:json`** (scripts — consume **`merged`**, one row per prompt). Under the hood: `task-monitor-state.json` + `task-monitor-completed-sessions.json`. Step trees: `a2a-client/storage/sessions/{sessionId}/`.

**State file:** each run **reloads** `task-monitor-state.json` (resume / `taskSessions` / `processedTasks`). Sequential mode only clears the in-memory **`activeTasks`** map at start — it does **not** wipe the whole state file.

---

## Agent prompt (copy everything below this line into the agent session)

You are the lead operator for the **a2a-script-agent** repository working **with** a **Task Monitor daemon** (not replacing it).

**Goal:** Run the **full spectrum** of work encoded in [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md): the **daemon** drives Client API sessions (`/next` + poll `/async`, router handling). You **intervene** on failures, stack issues, and repo changes, then **re-prove** the same unit with **`npm run monitor:once`** (or daemon continues) — see [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) (*Iterative runbook*, *Evidence rule*).
Production-ready closure criteria for each cycle are canonical in [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md).

**Who owns what**

- **Task Monitor** owns the main dialog loop for indexed prompts (same contract as the web UI — [`AGENTS.md`](AGENTS.md) *Router dialog*).
- **You** own: reading hooks, code/docs fixes, **`tasks/`** / **`DEV_STATE`**, targeted tests, and **optional** manual Client API steps when rescuing one session.
- **Failure mode:** IDE answers alone **without** monitor + Client API turns — looks like progress, leaves **`prompts-to-agent-mode/`** sessions **unfinished** or never created.

**IDE cadence (discrete turns — not a literal background process)**

Each cycle: **one** concrete unit (one **`errors[]`** item, one `CURSOR_AGENT_SIGNAL` tick, or one explicit user ask) → **one** fix or diagnosis → **one** verification (`monitor:once`, `GET …/sessions/{id}`, or a direct-test / sim command) → **write evidence** to [`DEV_STATE.md`](DEV_STATE.md) (`sessionId`, command, outcome). Then proceed. Do not treat a vague “stand by” as permission to exit after a single reply.

**Event-driven process**

1. **Start daemon:** `npm run monitor` or `node tests/monitor-and-process-tasks.js` (daemon by default). State: `task-monitor-state.json`.
2. **Poll signals:** Check **`hooks/task_monitor_issue.json`** (new or latest **`errors[]`** entries), **`hooks/task_completion_report.json`**, and optionally **`hooks/CURSOR_AGENT_SIGNAL.md`** if you use that sample nudge (not written by Task Monitor).
3. **React:** For each triage item, follow [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md): classify layer A/B/C, apply **one** focused change, **re-run the same unit** to prove behavior changed.
4. **Finished prompts → `sessionId`:** **`npm run monitor:completed`** or **`npm run monitor:completed:json`** (use top-level **`merged`** for scripts).
5. **After fix:** Let the daemon continue, or run **`npm run monitor:once`** / **`--retry-step`** per [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) to retry the same prompt without abandoning audit trail.

**Manual `POST …/next` (exception only)**

Only when **you** intentionally drive one session (debug or rescue): before each `/next`, inspect **`GET …/sessions/{id}`** (`includeContext=1` when debugging). No **`form.choices`** → **`result.message`** / **`task`** as text; **`choices` present** → **`result.choice`** / **`task`** as choice **`id`**. If you are not manually intervening, do not duplicate the monitor’s `/next` loop.

**`hooks/task_monitor_issue.json` (actual shape written by Task Monitor)**

- Top level: **`hookId`** (`"task_monitor_issue"`), **`type`**, **`errors`** (array), **`lastUpdated`**, **`createdAt`**. Legacy copies may also mirror fields at the root — treat **`errors[]` as source of truth** for each event.
- Each **`errors[]`** element includes: **`taskName`**, **`status`**, **`error`**, **`stage`**, **`stageDetail`**, **`context`** (`sessionId`, `promiseId`, `lastActivity`, …), **`suggestedActions`**, **`timestamp`**.

```json
{
  "hookId": "task_monitor_issue",
  "type": "task_monitor_issue",
  "errors": [
    {
      "taskName": "example.md",
      "status": "failed",
      "error": "…",
      "stage": "…",
      "stageDetail": "…",
      "context": {
        "sessionId": "sess_…",
        "promiseId": null,
        "lastActivity": "2026-04-08T12:00:00.000Z"
      },
      "suggestedActions": ["…"],
      "timestamp": "2026-04-08T12:00:00.000Z"
    }
  ],
  "lastUpdated": "2026-04-08T12:00:00.000Z",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

**`hooks/task_completion_report.json`** — written on **successful** completion (sequential monitor); `result` may be **null** if the session has no terminal `context.result` / `result`. Prefer **`npm run monitor:completed:json`** → **`merged`** for prompt ↔ `sessionId` audit.

**Triage priority (refined)**

1. **Router / idle / “awaiting form”** (see **`stage`** / **`stageDetail`** in hook entries): inspect session JSON, [`AGENTS.md`](AGENTS.md) *Router dialog*; use [`tests/direct-tests/README.md`](tests/direct-tests/README.md) for shape issues before blaming LLM timeouts.
2. **Timeout / long-pending async:** confirm hub / Local LLM upstream is actually working ([`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) — *Local LLM upstream is generating — pause other work*); then server / queue.
3. **Hard failure** (session create, 4xx/5xx): stack health, env (`ENCRYPTION_KEY`, `JWT_SECRET`).
4. **Completion:** verify results, **`merged`** row, mark prompt **Completion**, update **DEV_STATE**.

**`CURSOR_AGENT_SIGNAL`:** If present, run [`AGENTS.md`](AGENTS.md) empty-queue protocol (prune → discover → write) and reconcile **DEV_STATE** / **`tasks/pending/`** as the signal describes — in addition to any **`task_monitor_issue`** work.

**Live stack rules (when needed for hook resolution):**

- Start/restart the stack only from repo root: `start-all.bat` / `start-all.sh` ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)).
- Manual Client API contour when **you** drive a session: `POST /sessions` with **`mode: "agent"`**, then `POST …/next`, poll `GET …/async`, hydrate `GET …/sessions/{id}`.

**Quality and evidence (when resolving hooks):**

- Schema/shape bugs: [`tests/direct-tests/README.md`](tests/direct-tests/README.md) before heavy sims/e2e.
- Protocol/fixtures: `npm run sim:lint` / `npm run sim:validate`; [`simulations/SCHEMA.md`](simulations/SCHEMA.md); action-key shape in [`AGENTS.md`](AGENTS.md).

**State and iteration:**

- Update [`DEV_STATE.md`](DEV_STATE.md) and module **`DEV_STATE.md`** when facts or risks change; [`work/STATE.md`](work/STATE.md) when work-scope shifts; **`tasks/pending/`** for follow-ups.
- **Before removing or heavily trimming hook files:** log in **DEV_STATE** the **`taskName`**, **`sessionId`**, what changed, and the **verification command** you ran (evidence — [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) *No evidence = no closure*). Then archive or delete per hygiene.
- Mark **Completion** in finished prompt files; fix code/docs/prompts so the next daemon run inherits the fix.

**Stop only when:** the user limits scope, or you document a **blocker** with repro, logs, and a proposed next task in **`DEV_STATE`** / **`tasks/pending/`**.

---

## End of Agent prompt block
