# DEV_STATE — a2a-server (2026-04-07)

**Rules Q&A:** [`../docs/PROJECT-RULES-QA.md`](../docs/PROJECT-RULES-QA.md) · [`../AGENTS.md`](../AGENTS.md)

---

## Role for the north star

Stateless **invoke** server: Client API forwards context; each call may return **`promiseId`** — terminal `execute` / `context` come from **`GET /api/v1/requests/{id}/result`** polling. Dialog and agent pipelines must emit valid **action-key** `execute` / `result` shapes so the client can persist steps and the Task Monitor can finish tasks.

**Triangle vertex B** — [`docs/TRIANGLE-WORKFLOW.md`](../docs/TRIANGLE-WORKFLOW.md). **Gray alert** = server-first triage; **Gray Room** = runtime LLM chain ([`GLOSSARY.md`](../GLOSSARY.md) *Rooms vs alerts*).

---

## Endpoints (operator-relevant)

| Method | Path | Note |
|--------|------|------|
| GET | `/health` | Liveness |
| POST | `/api/v1/invoke` | Returns `promiseId`; poll result |
| GET | `/api/v1/requests/:id/result` | Terminal payload for pollers |

Session storage is **not** here — see [a2a-client/DEV_STATE.md](../a2a-client/DEV_STATE.md).

**Request files (`storage/requests/*.json`):** corrupt / truncated JSON on `load` is **quarantined** to `{id}.corrupt.{ts}.json`, `load` returns `null` (pollers see missing request instead of `JSON.parse` throw). Test: [`tests/unit/request-file-storage.test.ts`](tests/unit/request-file-storage.test.ts).

---

## Processors (mental model)

`request-processor` → dialog / agent / router / form / gray-room paths. For monitor-driven agent work, failures often show up as **stuck `processing`** or bad `execute` shape — start with [`tests/direct-tests/README.md`](../tests/direct-tests/README.md) if contracts break.

---

## AI-Integration lock

UNBLOCKED.

---

## Security hygiene

**2026-04-07:** [`bug-fixer.ts`](src/services/llm/bug-fixer.ts) `getGitDiff` — `spawnSync('git', ['diff','--no-color','--', filePath])` instead of shell-interpolated `execSync`. Purple hunt log: [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](../docs/PURPLE-ALERT-HARMFUL-HUNT.md).

**Magenta:** [`package.json`](package.json) `overrides.tar` → `^7.5.13` so production `npm audit --omit=dev` is clean (transitive `tar` from `bcrypt` / `node-pre-gyp`).

---

## Verify

```bash
cd a2a-server && npm run test
cd a2a-server && npm run sim:lint -- --all --json
cd a2a-server && npm run sim:validate -- --all --json
```

Repo-root **`npm run test:before-start`** runs indirect (Mama) checks, then **`tests/indirect-tests/run-server-unit-tests.ps1`** (full `a2a-server` Vitest), then **`npm run test:monitor`**.

Docs: [`docs/GRAY-ROOM.md`](docs/GRAY-ROOM.md) · [`simulations/SERVER-CONTRACT.md`](../simulations/SERVER-CONTRACT.md)
