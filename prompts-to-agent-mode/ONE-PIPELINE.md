# One-line development workflow (API-driven agent + indexed prompts)

This document is the **single linear spine** for: run stack → drive the agent **only** through the Client API → execute tasks from this folder → observe outcomes → fix stack/docs/prompts → repeat. Everything else (ADRs, sims, methodology) **hangs off** these steps.

## Linear sequence (do not skip)

1. **Environment** — From repo root: `start-all.bat` / `start-all.sh` ([`docs/SYSTEM_STARTUP.md`](../docs/SYSTEM_STARTUP.md)). Confirm health: `AGENTS.md` → *Debugging* (3000, 11434, 11435, 5173).
2. **Pick a prompt task** — Use the index in [`README.md`](README.md). Prefer order: `DEV_STATE.md` / `work/STATE.md` / `tasks/system-improvement-priorities.md` linked rows → methodology → client-api checks → docs/sims. Each `.md` file here is one **work unit** with sources + **Agent prompt** text.
3. **Create session (API)** — `POST {ClientAPI}/api/a2a/sessions` with `mode: "agent"`, `projectId`/`projectRoot` as needed, and seed **`task`** with the **Agent prompt** body (or first-beat text). **Not** `POST :3000/api/v1/invoke` alone. Normative detail: [`STACK-RUN.md`](STACK-RUN.md), [`AGENTS.md`](../AGENTS.md) → *Unified manual path*.
4. **Drive turns** — `POST …/sessions/{id}/next` → poll `GET …/sessions/{id}/async` until settled. After **every** server-visible step, `GET …/sessions/{id}` (`includeContext=1` when debugging). **Router:** no `form.choices` → send text (`message` / `task`); with `choices` → send `choice` / `task` as choice **`id`**. See *Router dialog* in `AGENTS.md`.
5. **Observe** — Disk steps: `a2a-client/storage/sessions/{id}/`; compare to expected behavior in the prompt’s **Completion** / linked spec. For contract/shape issues, start at [`scripts/direct-tests/README.md`](../scripts/direct-tests/README.md) before sims.
6. **Hardening pass (what can go wrong)** — Walk at least these classes once per milestone or after regressions:
   - **Stuck async** — Poll `/async`; do not stop after `/next` ack alone ([`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md) → *Driver checklist*).
   - **Wrong router beat** — Mis-sent `message` vs `choice` → session idle or wrong branch (`AGENTS.md` → *Why iteration stops*).
   - **401 / env** — `ENCRYPTION_KEY` 32 chars, `JWT_SECRET`, `SKIP_AUTH` in dev.
   - **LLM / hub** — Ollama tags, timeouts; treat `pending` with backoff.
   - **Schema / golden** — `npm run sim:lint` / `npm run sim:validate`; [`simulations/SCHEMA.md`](../simulations/SCHEMA.md).
7. **Record** — Update [`DEV_STATE.md`](../DEV_STATE.md), module `DEV_STATE` if touched, [`work/STATE.md`](../work/STATE.md) when work-scope changes; add `tasks/pending/*.md` for follow-ups. Mark the prompt file **Completion** when criteria are met.
8. **Improve** — If the agent or stack failed: fix code/client/server, **then** update the prompt or linked doc so the next run encodes the lesson (no “tribal knowledge” only in chat). Idle queue is **not** done — prune → discover → write tasks (`AGENTS.md` → *Empty queue*).
9. **Next prompt** — Go to step 2 until the indexed slice for your milestone is complete.

## What describes the process (map)

| Layer | Role in this pipeline |
|--------|------------------------|
| [`AGENTS.md`](../AGENTS.md) | Contract: Client API, router two beats, anti-stop rules |
| [`STACK-RUN.md`](STACK-RUN.md) | Live stack vs IDE vs invoke |
| [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md) | Curl examples + driver checklist |
| [`methodology/INDEX.md`](../methodology/INDEX.md) | Modes, metrics narrative, links to tasks/improvements |
| [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) | Depth checks beyond one happy path |
| [`README.md`](README.md) | **Which** prompt file maps to **which** canonical source |
| [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md) | Root **master prompt** to run the full index (IDE or session `task`) |

## Automation note

Scripts may create sessions and POST `/next` in a loop; they must still **branch on `execute.form`** (router) and **poll `/async`**. The linear order above stays the **spec** for any driver (human, CI, or bot).

See also: parent index [`README.md`](README.md), stack contour [`STACK-RUN.md`](STACK-RUN.md), master run [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).
