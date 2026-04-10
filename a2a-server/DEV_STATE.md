# DEV_STATE — a2a-server (2026-04-08)

**Rules:** [../../AGENTS.md](../../AGENTS.md), [../../GLOSSARY.md](../../GLOSSARY.md)\n**Rules Q&A:** [`../docs/PROJECT-RULES-QA.md`](../docs/PROJECT-RULES-QA.md)

---

## Role for the north star

Stateless **invoke** server: Client API forwards context; each call may return **`promiseId`** — terminal `execute` / `context` come from **`GET /api/v1/requests/{id}/result`** polling. Dialog and agent pipelines must emit valid **action-key** `execute` / `result` shapes so the client can persist steps and the Task Monitor can finish tasks.

**Triangle vertex B** — [`docs/TRIANGLE-WORKFLOW.md`](../docs/TRIANGLE-WORKFLOW.md). **Gray alert** = server-first triage; **Gray Room** = runtime LLM chain ([`GLOSSARY.md`](../GLOSSARY.md) _Rooms vs alerts_).

---

## Endpoints (operator-relevant)

| Method | Path                          | Note                             |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/health`                     | Liveness                         |
| POST   | `/api/v1/invoke`              | Returns `promiseId`; poll result |
| GET    | `/api/v1/requests/:id/result` | Terminal payload for pollers     |

Session storage is **not** here — see [a2a-client/DEV_STATE.md](../a2a-client/DEV_STATE.md).

**Request files (`storage/requests/*.json`):** corrupt / truncated JSON on `load` is **quarantined** to `{id}.corrupt.{ts}.json`, `load` returns `null` (pollers see missing request instead of `JSON.parse` throw). Test: [`packages/server/tests/unit/request-file-storage.test.ts`](packages/server/tests/unit/request-file-storage.test.ts).

---

## Processors (mental model)

`request-processor` → dialog / agent / router / form / gray-room paths. For monitor-driven agent work, failures often show up as **stuck `processing`** or bad `execute` shape — start with [`tests/direct-tests/README.md`](../tests/direct-tests/README.md) if contracts break.

**Agent `step=request` loop (2026-04-08):** If the LLM re-emits the initial **Agent Mode** form after **≥2** assistant history lines, [`agent-spurious-request-normalize.ts`](src/services/core/request-processor/agent-spurious-request-normalize.ts) coerces **`processing` + `execute.message`** before `finalizeDialogGrayRoomResult` — avoids Task Monitor strict `/next` spam. Tests: [`packages/server/tests/unit/agent-spurious-request-normalize.test.ts`](packages/server/tests/unit/agent-spurious-request-normalize.test.ts).

**Hub disk-cache / `inlineResponseBody` (2026-04-08):** `POST /api/chat?promise=1` **200** returns full provider JSON in `responseBody`. Dialog + Gray Room + Black Room + AgentSwing now run [`extractLlmTextFromHubResponseBody`](src/daemon/llm-hub-poll.ts) on that string before `response.md` / JSON parses — avoids `context.history` assistant lines containing raw `{"choices":[...]}` envelopes. Tests: [`packages/server/tests/unit/llm-hub-poll.test.ts`](packages/server/tests/unit/llm-hub-poll.test.ts).

---

## AI-Integration lock

UNBLOCKED.

---

## Security hygiene

**2026-04-08:** [`ai-hub-chat-sync.ts`](src/utils/ai-hub-chat-sync.ts) — after hub **`POST /api/chat?promise=1`** returns **202**, call **`POST /promise/:id/execute`** before polling so **`PROMISE_DAEMON_ONLY`** tickets actually run (fixes **`hub_promise_empty`** / Gray Room internal debate `AI hub error: 0 hub_promise_empty`). Tests: `npx vitest run packages/server/tests/unit/ai-hub-chat-sync.test.ts` · `packages/server/tests/integration/invoke-http-parity.test.ts`.

**Magenta:** [`package.json`](package.json) `overrides.tar` → `^7.5.13` so production `npm audit --omit=dev` is clean (transitive `tar` from `bcrypt` / `node-pre-gyp`).

**Tools evolve:** [`src/api/tools-evolve-sandbox.ts`](src/api/tools-evolve-sandbox.ts) validates `toolCode` (TS + vm2 `VM`) before deploy; [`tests/unit/tools-evolve-sandbox.test.ts`](tests/unit/tools-evolve-sandbox.test.ts). Task: [`tasks/completed/improve-tools-evolve-sandboxing.md`](../tasks/completed/improve-tools-evolve-sandboxing.md).

---

## Verify

```bash
cd a2a-server && npm run test
cd a2a-server && npm run sim:lint -- --all --json
cd a2a-server && npm run sim:validate -- --all --json
```

Repo-root **`npm run test:before-start`** runs indirect (Mama) checks, then **`tests/indirect-tests/run-server-unit-tests.ps1`** (full `a2a-server` Vitest), then **`npm run test:monitor`**, then **`npm run verify:audit-session-storage`** (session-storage task regen + accuracy).

Docs: [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) · [`simulations/SERVER-CONTRACT.md`](../simulations/SERVER-CONTRACT.md)
