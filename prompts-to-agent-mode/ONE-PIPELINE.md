# One-line development workflow (API-driven agent + indexed prompts)

> **Same rule as this folder’s [`README.md`](README.md) (top callout):** each `.md` task is **multi-turn** on **one Client API session** until done — not “POST once and done.”

This document is the **single linear spine** for: run stack → **`npm run monitor`** / **`monitor:once`** (Task Monitor on Client API) → execute tasks from this folder → observe outcomes → fix stack/docs/prompts → repeat. Everything else (ADRs, sims, methodology) **hangs off** these steps.

## Linear sequence (do not skip)

1. **Environment** — From repo root: `start-all.bat` / `start-all.sh` ([`docs/SYSTEM_STARTUP.md`](../docs/SYSTEM_STARTUP.md)). Confirm health: `AGENTS.md` → *Debugging* (3000, 11434, 11435, 5173).
2. **Plan** — Use the index in [`README.md`](README.md) plus [`DEV_STATE.md`](../DEV_STATE.md) / [`work/STATE.md`](../work/STATE.md) / [`tasks/system-improvement-priorities.md`](../tasks/system-improvement-priorities.md) to choose milestone order. Each flat `.md` here is one **work unit** (sources + **Agent prompt**).
3. **Execute the indexed queue (mandatory default)** — From repo root: **`npm run monitor`** (daemon, one incomplete prompt at a time) or **`npm run monitor:once`** (default: one prompt per invocation). This **is** the workflow: Task Monitor creates sessions, posts `/next`, polls `/async`, branches on router **`form.choices`**, keeps one Client API session per file until done. **Do not** hand-drive the same queue file-by-file with curl unless you are debugging one step. Operator detail: [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md), [`STACK-RUN.md`](STACK-RUN.md). **Not** `POST :3000/api/v1/invoke` alone.
4. **Manual Client API (exception)** — Only for isolated repro or when the monitor is wrong tool: `POST {ClientAPI}/api/a2a/sessions` with `mode: "agent"`, then `/next` + `/async`, hydrate `GET …/sessions/{id}` (`includeContext=1` when debugging). **Router:** no `form.choices` → `message` / `task` as text; with `choices` → `choice` / `task` as choice **`id`** — [`AGENTS.md`](../AGENTS.md) *Router dialog*.
5. **Observe** — Disk steps: `a2a-client/storage/sessions/{id}/`; compare to expected behavior in the prompt’s **Completion** / linked spec. For contract/shape issues, start at [`tests/direct-tests/README.md`](../tests/direct-tests/README.md) before sims.
6. **Hardening pass (what can go wrong)** — Walk at least these classes once per milestone or after regressions:
   - **Stuck async** — Poll `/async`; do not stop after `/next` ack alone ([`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md) → *Driver checklist*).
   - **Wrong router beat** — Mis-sent `message` vs `choice` → session idle or wrong branch (`AGENTS.md` → *Why iteration stops*).
   - **401 / env** — `ENCRYPTION_KEY` 32 chars, `JWT_SECRET`, `SKIP_AUTH` in dev.
   - **LLM / hub** — Local LLM upstream tags, timeouts; treat `pending` with backoff.
   - **Schema / golden** — `npm run sim:lint` / `npm run sim:validate`; [`simulations/SCHEMA.md`](../simulations/SCHEMA.md).
7. **Record** — Update [`DEV_STATE.md`](../DEV_STATE.md), module `DEV_STATE` if touched, [`work/STATE.md`](../work/STATE.md) when work-scope changes; add `tasks/pending/*.md` for follow-ups. Mark the prompt file **Completion** when criteria are met. **Stack-driven runs:** capture **`sessionId`** for evidence via **`npm run monitor:completed:json`** → **`merged`** (Task Monitor is the audit trail for this folder).
8. **Improve** — If the agent or stack failed: fix code/client/server, **then** update the prompt or linked doc so the next run encodes the lesson (no “tribal knowledge” only in chat). Idle queue is **not** done — prune → discover → write tasks (`AGENTS.md` → *Empty queue*).
9. **Next** — Daemon: monitor picks the next incomplete file. One-shot: re-run **`monitor:once`** or raise **`TASK_MONITOR_MAX_TASKS_PER_RUN`**. Until the milestone slice is done, loop from step 2.

## What describes the process (map)

| Layer | Role in this pipeline |
|--------|------------------------|
| [`AGENTS.md`](../AGENTS.md) | Contract: Client API, router two beats, anti-stop rules |
| [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md) | **Instrument:** launch indexed tasks through session dialog (`npm run monitor`) |
| [`STACK-RUN.md`](STACK-RUN.md) | Live stack vs IDE vs invoke |
| [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md) | Curl examples + driver checklist |
| [`tasks/brown-alert/archive-methodology-missing.md`](../tasks/brown-alert/archive-methodology-missing.md) | Archived `archive/methodology/*` index/tasks were removed; this tracks broken inbound links |
| [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) | Depth checks beyond one happy path |
| [`README.md`](README.md) | **Which** prompt file maps to **which** canonical source |
| [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md) | Root **master prompt** to run the full index (IDE or session `task`) |

## Automation note

The repo **Task Monitor** ([`tests/monitor-and-process-tasks.js`](../tests/monitor-and-process-tasks.js), [`tests/monitor-tasks/`](../tests/monitor-tasks/)) is the **only** supported automation for this indexed queue: it creates sessions, POSTs `/next`, polls `/async`, branches on **`form.choices`**, writes **`merged`**-ready completion data, and surfaces errors with **direct-tests** hints. Other drivers may follow the same HTTP contour, but they are **not** the audit trail for `prompts-to-agent-mode/` unless you adopt that code path. The linear order above is the **spec** for any driver (human, CI, or bot).

See also: [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md), parent index [`README.md`](README.md), stack contour [`STACK-RUN.md`](STACK-RUN.md), master run [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).
