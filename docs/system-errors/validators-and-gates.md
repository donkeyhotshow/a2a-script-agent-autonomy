# Validators & gates (how errors surface)

Run from **repo root** unless noted.

## Indirect (Mama, no stack)

| Command | What fails |
|---------|------------|
| `npm run test:indirect` | Registry, schemas, imports, prompts, Mama red/gray fixtures, sticky-router audit, execute-shape sims, choice `description`, gray-room sequence fixture |
| `npm run test:server:unit` | a2a-server Vitest **excluding** `tests/integration/**`, `tests/e2e/**` |
| `npm run test:server:unit:all` | Full server Vitest (needs what those tests need) |
| `npm run test:direct-tests` | Root Vitest: schema guards, router transition |
| `cd a2a-client && npm test` | Client package tests |

## Simulations

| Command | What fails |
|---------|------------|
| `npm run sim:lint:all` | Sim structure / golden rules |
| `npm run sim:validate` | **Requires** `--sim` or `--all` |
| `npm run sim:validate:all` | All sims |
| `npm run sim:validate:all:contract` | All sims + `--step-contract` |
| `npm run sim:check-md` | MD vs JSON drift (report-only unless `--fail`) |
| `npm run sim:check-md:fail` | Same, exit 1 on mismatch |

## Artifact scans

| Command | What fails |
|---------|------------|
| `npm run scan-promise-bodies` | Missing `proxy_logs/promises` dir (unless `--skip-if-missing`) |
| `npm run scan-promise-bodies:strict` | + exit 1 on shape issues |
| `npm run scan-session-responses` / `:strict` | Same for session `server-response.json` |

## Full orchestrator

| Command | What fails |
|---------|------------|
| `npm run test:gang` | Mama chain + Papa E2E if `:3000` + Client API up |
| `npm run test:gang:mama` | Mama only |
| `npm run test:gang:papa` | Papa only |
| `npm run test:recon` / `test:recon:mama` | Stricter artifacts + contract sims + async E2E (recon) |

**Help:** `node tests/papa-mama-gang.mjs --help`

## E2E (Papa)

| Command | What fails |
|---------|------------|
| `node tests/direct-tests/e2e-dialog-test.js` | Client API + server integration; env `E2E_DIRECT_LOW_LLM`, `REQUIRE_ASYNC_PIPELINE`, `PAPA_E2E_ONLY` / `--only=` |

See [`tests/direct-tests/README.md`](../../tests/direct-tests/README.md).
