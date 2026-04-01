# Master prompt — full-spectrum run (repo + live stack)

**Use this file to start the entire work surface:** indexed tasks under `prompts-to-agent-mode/`, methodology, Client API checks, docs/sims — in one disciplined loop.

| You drive… | What to do |
|------------|------------|
| **Cursor / IDE agent** | Paste the **Agent prompt** block below into the chat. You edit the repo, run tests/sims, and (when needed) call the Client API like an operator. |
| **Live stack only (curl/script)** | Seed `POST /api/a2a/sessions` with `"mode": "agent"` and put the **Agent prompt** (or a shortened “execute ONE-PIPELINE for the next open prompt”) in `task`. Then `/next` + poll `/async` per `AGENTS.md`. |

**Client API base URL:** default dev is `http://localhost:5173`; other deployments — [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md).

**Normative spine:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md). **Task catalog:** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md). **HTTP contour:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md) + [`AGENTS.md`](AGENTS.md) (*Unified manual path*, *Router dialog*). **Unlimited operator loop (RU detail):** [`START-PROMPT-UNLIM.md`](START-PROMPT-UNLIM.md).

---

## Agent prompt (copy everything below this line into the agent session)

You are the lead operator for the **a2a-script-agent** repository.

**Goal:** Run the **full spectrum** of work encoded in [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md): every indexed `.md` task file is a work unit with **sources** and an **Agent prompt** inside it. Execute them systematically until the current milestone is satisfied or you log a **blocker** with evidence.

**Linear process (do not skip):** Follow [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md) step by step for any live-stack verification.

**Priority order for picking the next prompt file:**

1. Rows linked from [`DEV_STATE.md`](DEV_STATE.md), [`work/STATE.md`](work/STATE.md), and [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (plus any `tasks/*.md` specs they reference).
2. Methodology rows in the prompts index ([`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md) → *Methodology*).
3. Client API manual verification prompts (aligned with [`a2a-client/docs/api-testing-plan.md`](a2a-client/docs/api-testing-plan.md)).
4. Remaining README sections (docs, sims, modules, ADRs) as time allows.

**Live stack rules:**

- Start/restart the stack only from repo root: `start-all.bat` / `start-all.sh` ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)).
- Drive sessions via **Client API** (default dev: `http://localhost:5173/api/a2a/...`): `POST /sessions` with **`mode: "agent"`**, then `POST …/next`, poll `GET …/async`, hydrate `GET …/sessions/{id}`. **Do not** use `POST :3000/api/v1/invoke` alone as the session driver.
- After each response, inspect `execute.form`: **no `choices`** → next body uses free text (`message` / top-level `task`); **`choices` present** → send **`choice`** / `task` as the chosen row’s **`id`** ([`AGENTS.md`](AGENTS.md) → *Router dialog*).

**Quality and evidence:**

- Schema/shape bugs: reproduce via [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) before relying only on golden sims.
- When you touch protocol or fixtures: `npm run sim:lint` / `npm run sim:validate` as appropriate; respect [`simulations/SCHEMA.md`](simulations/SCHEMA.md) and action-key shape in [`AGENTS.md`](AGENTS.md).

**State and iteration:**

- Update [`DEV_STATE.md`](DEV_STATE.md) and module `DEV_STATE.md` when you change facts or risks; align [`work/STATE.md`](work/STATE.md) when work-scope shifts; add follow-ups under `tasks/pending/` when needed.
- **Empty queue is not “done”:** prune state, discover work, write tasks — [`AGENTS.md`](AGENTS.md) → *Empty queue — mandatory*.
- Mark **Completion** in each prompt file you finish; if the stack or prompts were wrong, fix code/docs/prompts so the next run inherits the fix.

**Stop only when:** the user explicitly limits scope, or you are blocked after documenting repro steps, logs, and a proposed next task in `DEV_STATE` / `tasks/pending/`.

---

## End of Agent prompt block
