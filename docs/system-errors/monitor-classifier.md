# ErrorClassifier (Task Monitor)

**Source:** [`tests/monitor-tasks/errors.js`](../../tests/monitor-tasks/errors.js) — `errorPatterns[]` + `suggestQuickFix` keys `type:subtype`.

Classification is **regex on `error.message`** (and HTTP status when present). First match wins.

## Patterns (type / subtype / severity / hint summary)

| type | subtype | severity | Hint (short) |
|------|---------|----------|--------------|
| connection | refused | critical | Start stack (`start-all.bat`), ports |
| connection | dns | critical | Hostname / env |
| connection | timeout | high | Timeout env, overload |
| connection | reset | high | Crash / restart |
| connection | aborted | medium | Network |
| connection | broken-pipe | medium | Peer closed |
| http | bad-request | high | Payload shape |
| http | auth | critical | JWT / ENCRYPTION_KEY 32 / SKIP_AUTH |
| http | forbidden | high | Permissions |
| http | notfound | medium | URL / session id |
| http | timeout | high | Server slow |
| http | conflict | medium | State |
| http | unprocessable | high | Validation |
| http | rate-limit | medium | Throttle |
| http | internal-error | critical | Server logs |
| http | bad-gateway | critical | AI hub / upstream |
| http | unavailable | critical | Ollama / hub down |
| http | gateway-timeout | high | Increase forward timeout |
| schema | action-key | critical | Action-key shape (AGENTS.md) |
| schema | validation | high | `sim:lint` |
| schema | missing-field | high | Required fields |
| schema | type-error | medium | Types / undefined |
| llm | model | critical | `ollama pull`, tags |
| llm | context | high | Gray room / compress |
| llm | rate-limit | medium | Provider |
| llm | gpu-memory | high | Smaller model / CPU |
| llm | loading | medium | Wait for load |
| session | not-found | medium | New session |
| session | promise | medium | Poll `/async` |
| session | state-corrupt | high | `monitor:reset` |
| router | choice | high | `form.choices` + id |
| router | form | high | Beat A/B |
| router | beat | high | AGENTS router section |
| task | no-tasks | low | Empty queue |
| task | timeout | high | Ollama stuck? |
| task | parse-error | medium | MD format |
| task | router-stuck | high | Beat A vs B |
| task | promise-stuck | high | Ollama `/api/ps` |
| task | session-invalid | medium | Reset state |
| gray-room | processing | medium | `A2A_GRAY_ROOM_*` |
| gray-room | interrupt | medium | `interrupt.reason` |
| filesystem | not-found | medium | Paths |
| filesystem | permission | high | ACL |
| filesystem | is-directory | medium | Path typo |
| parse | json | high | HTML vs JSON |
| parse | serialization | medium | Circular / undefined |
| network | socket | high | Restart / unstable |
| network | generic | high | Connectivity |
| network | tls | medium | Dev HTTP |
| request | payload-size | medium | Shrink context |
| request | verification | medium | Middleware |
| monitor | retry-exhausted | medium | `TASK_MONITOR_MAX_POLL_ATTEMPTS` |
| monitor | state-error | high | `monitor:reset` |
| monitor | concurrency | medium | One monitor instance |
| async | infinite-pending | high | Ollama idle vs stuck |
| async | leak | medium | Tracking |
| module | import | critical | `npm install` |
| module | esm | high | `type: module` |
| unknown | unclassified | — | Full message + diagnostics |

**Exports:** `ErrorClassifier`, `ServerUnavailableError`. **Direct test map** and **diagnosticScripts** live in the same file (`directTests`, `buildDiagnostic`).
