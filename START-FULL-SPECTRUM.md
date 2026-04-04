# Master prompt — full-spectrum run (repo + live stack)

**Self-Upgrade process:** This represents the Self-Upgrade mechanism: tasks are **launched through the Client API session dialog** — automated by **`monitor-and-process-tasks.js`** (Task Monitor) or driven manually with the same `sessions` / `next` / `async` contour. See [GLOSSARY.md](GLOSSARY.md) (*Self-Upgrade*, *Task Monitor*). **Before a full-index or heavy run:** archive valuable session trees under `a2a-client/storage/sessions/` — [tasks/README.md](tasks/README.md) (*Self-Upgrade order*, step 2).

**Primary instrument for “run the indexed prompts on the live stack”:** **[`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)** — that doc is the operator manual for dialog-based task launch (`npm run monitor`, env, router beats, errors → direct-tests).

**Use this file to start the entire work surface:** indexed tasks under `prompts-to-agent-mode/`, methodology, Client API checks, docs/sims — through **Task Monitor daemon** plus event-driven IDE follow-up on **`hooks/`**.

| You drive… | What to do |
|------------|------------|
| **Cursor / IDE agent** | Paste the **Agent prompt** block below. Run **`npm run monitor`** (or `node monitor-and-process-tasks.js`); react to **`hooks/`** when the instrument surfaces failures or timeouts. |
| **Live stack only** | Same: start the Task Monitor; use **`MONITOR-QUICK-START.md`** for commands and env; intervene via Client API only when hooks or errors require it. |

**Client API base URL:** default dev is `http://localhost:5173`; other deployments — [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md).

**Operator guide (instrument + dialog contour):** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md). **Entry script:** [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js). **Hook system:** JSON under `hooks/`. **Task catalog:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md). **Normative spine:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md). **Indexed stack rules:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md).

**Скрипт мониторинга и отчётности:** Скрипт очищает файл отчёта (`task-monitor-state.json`) на старте и пишет результаты после завершения. Если данных нет, остановить сессию — пользователь перезапустит.

---

## Agent prompt (copy everything below this line into the agent session)

You are the lead operator for the **a2a-script-agent** repository running in **event-driven daemon mode**.

**Goal:** Run the **full spectrum** of work encoded in [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md) through an automated daemon process that monitors tasks continuously and triggers agent interventions only when needed.

**Event-driven process:**

1. **Start daemon:** Run `node monitor-and-process-tasks.js` (daemon mode by default) to begin continuous monitoring of all indexed tasks. Скрипт очистит файл отчёта на старте и запишет результаты после завершения.
2. **Stand by:** The daemon will process tasks autonomously, creating hook documents in `hooks/` directory when issues are detected (timeouts, failures, completions).
3. **React to hooks:** When a hook document appears, read it and take appropriate action based on the issue type. Если в файле отчёта нет данных, остановить сессию — пользователь перезапустит.
4. **Guide the dialog intentionally:** Every time you send a `POST /sessions/{id}/next` request, confirm whether the latest step expects free-text (`result.message` / `task`) or a router choice (`result.choice` / `task` as choice id). Feeding the correct action shape steers the script agent toward finishing its work.
5. **Resume monitoring:** After resolving the issue, the daemon continues monitoring automatically.

**Hook document format:**
```json
{
  "hookId": "task_issue_123456",
  "type": "task_monitor_issue",
  "taskName": "filename.md",
  "status": "timeout|failed|completed",
  "error": "error description (if any)",
  "context": {
    "sessionId": "sess_123",
    "promiseId": "prom_456",
    "lastActivity": "2026-04-02T19:45:22Z"
  },
  "suggestedActions": ["action1", "action2", "action3"],
  "createdAt": "2026-04-02T19:45:22Z"
}
```

**Priority order for hook processing:**
1. **Timeout hooks:** Tasks stuck for 5+ minutes - investigate server/LLM issues
2. **Failure hooks:** Session creation or execution failures - check stack health
3. **Completion hooks:** Successfully completed tasks - verify results and update state

**Live stack rules (when needed for hook resolution):**

- Start/restart the stack only from repo root: `start-all.bat` / `start-all.sh` ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)).
- For manual intervention: Use **Client API** (default dev: `http://localhost:5173/api/a2a/...`): `POST /sessions` with **`mode: "agent"`**, then `POST …/next`, poll `GET …/async`, hydrate `GET …/sessions/{id}`.
- **Daemon handles the main workflow** - you only intervene when hooks indicate problems.

**Quality and evidence (when resolving hooks):**

- Schema/shape bugs: reproduce via [`tests/direct-tests/README.md`](tests/direct-tests/README.md) before relying only on golden sims.
- When you touch protocol or fixtures: `npm run sim:lint` / `npm run sim:validate` as appropriate; respect [`simulations/SCHEMA.md`](simulations/SCHEMA.md) and action-key shape in [`AGENTS.md`](AGENTS.md).

**State and iteration:**

- Update [`DEV_STATE.md`](DEV_STATE.md) and module `DEV_STATE.md` when you change facts or risks; align [`work/STATE.md`](work/STATE.md) when work-scope shifts; add follow-ups under `tasks/pending/` when needed.
- **Monitor hooks directory** continuously for new issues to resolve.
- Mark **Completion** in each prompt file you finish; if the stack or prompts were wrong, fix code/docs/prompts so the daemon inherits the fix.
- **Delete processed hook files** after resolving issues to keep the hooks directory clean.

**Stop only when:** the user explicitly limits scope, or you are blocked after documenting repro steps, logs, and a proposed next task in `DEV_STATE` / `tasks/pending/`.

---

## End of Agent prompt block
