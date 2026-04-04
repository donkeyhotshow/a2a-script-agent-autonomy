# A2A Script Agent — Testing Framework

**Hierarchical, fail-fast validation of the agent stack.**
The test suite is organized into three levels (basic health, component integration, end-to-end workflows) that progressively cover more surface area. Runners stop on the first failure unless `-ContinueOnError` is passed so problems are easy to localize.

## Suite layout
```
scripts/tests/
├── run-all.ps1         # Master runner for Level 1+2+3
├── level1/             # Basic health checks (services, connectivity, API)
├── level2/             # Component integration (individual services, interactions, persistence)
└── level3/             # End-to-end workflows (workflow automations, CLI, performance)
```
Each level has its own `run.ps1` plus subdirectories for the three sub-levels described below.

## Running the suite
```powershell
# All levels (default): Level 1 -> Level 2 -> Level 3
.\scripts\tests\run-all.ps1

# Run only one level when you are iterating on a specific boundary
.\scripts\tests\run-all.ps1 -Level1Only
.\scripts\tests\run-all.ps1 -Level2Only
.\scripts\tests\run-all.ps1 -Level3Only
```
All runner scripts accept `-Verbose` for extra logs and `-ContinueOnError` to keep executing after failures (diagnostic mode).

## Level overview
| Level | Focus | Key checks | Typical duration |
|-------|-------|------------|------------------|
| Level 1 | Basic health | Services, networking, basic API endpoints | ~30 s |
| Level 2 | Component integration | Individual services, interactions, persistence | 2-3 min |
| Level 3 | End-to-end workflows | Workflow automation, CLI controls, load/performance | 6-16 min |

Each level runner enforces a fixed order of its three sub-levels and fails fast by default. Sub-level runners live under `level*/{run.ps1,test-*.ps1}` and are invoked by the master runner.

## Flags reference
| Flag | Description |
|------|-------------|
| `-Verbose` | Propagates to every nested runner and prints detailed progress messages |
| `-ContinueOnError` | Runs all scheduled sub-levels even if earlier ones fail (useful for diagnostics) |
| `-Quick` | Passed down only to Level 3 workflows to skip some heavier setup when speeding up iteration |
| `-Light` | Passed down to Level 3 performance tests to toggle lighter resource usage |
| `-Level[1|2|3]Only` | Shortcut to execute a single level without running the rest |

## Requirements and order
1. Always start with Level 1 — it verifies foundational services (A2A HTTP/AI proxies, Docker services, DB).  
2. When Level 1 succeeds, Level 2 validates component boundaries (server, client, AI integration, persistence).  
3. Level 3 assumes the full stack is running (Web UI on 5173, PostgreSQL, Ollama/model, etc.) before exercising end-to-end flows.

Run the level-specific runners directly for faster iteration against a broken suite:
```powershell
.\scripts\tests\level1\run.ps1
.\scripts\tests\level2\run.ps1
.\scripts\tests\level3\run.ps1
```

## Diagnostics & CI guidance
- Use `-ContinueOnError -Verbose` when you want a complete failure report in logs before fixing issues.
- `run-all.ps1` exits with `0` when every level passes, `2` when some levels fail but diagnostics are complete, and `1` for critical failures.
- In CI pipelines, run `run-all.ps1 -Level1Only` on every push and the full suite (with `-ContinueOnError` if desired) before release.

## Shared runtime helpers
- `scripts/tests/common/run-sequence.ps1` exposes `Invoke-TestSequence`, which accepts stage metadata, propagates global flags, renders consistent logging, and tracks failures. Every level and the master runner dot-source this helper so the fail-fast behavior and reporting stay in sync.
- Level runners now declare their sub-levels as metadata objects and feed them to `Invoke-TestSequence`, which handles verbosity, continue-on-error, Quick/Light inheritance, and final bookkeeping. This keeps the command-line interfaces tight while ensuring bigger orchestrations reuse the same safety net.

## Notes for maintainers
- The fast path (`-Quick`/`-Light`) is wired only into Level 3 runners (Workflows and Performance sub-levels) because earlier levels already run quickly.
- Keep documentation in sync with any new `test-*.ps1` scripts — add a short description inside the corresponding subdirectory when you add new checks.

## See also
- **[tests/direct-tests/](../../tests/direct-tests/README.md)** — Hub for health checks by stack part (`run-checks.ps1 -Scope LLM|ServerLLM|ClientServer|…`) and runners for RAG, SDK, AI, server sim, and root `scripts/` (no service startup; run from repo root).
- Direct test scripts in this folder: `test-services-basic.ps1`, `test-web-ui.ps1`, `test-a2a-client.ps1` (also invokable via `tests/direct-tests/scripts/run-*.ps1`).
