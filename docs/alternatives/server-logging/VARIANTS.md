# A2A Server logging — application variants

**Last reviewed:** 2026-03-24

**Review status:** [Active consideration](../README.md#under-consideration-active-review).

## Constraints (invariants)

- `a2a-server/src/config/index.ts` validates **`LOG_LEVEL`** (`error` | `warn` | `info` | `debug`) and **`LOG_FORMAT`** (`json` | `pretty`).

## Context

**JSON** logs suit aggregators (Loki, CloudWatch); **pretty** helps local terminals. Level affects noise vs signal in support.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `json-info` | JSON + info | Default schema; production-friendly. | Parseable; less readable in bare console. |
| `pretty-dev` | pretty + debug | Human-readable; maximum verbosity. | Do not rely on in prod pipelines. |
| `json-warn` | JSON + warn | Quieter; fewer lines in high-traffic deploys. | May hide useful diagnosis. |

## Current selection (this repo)

- [x] `json-info`
- [ ] `pretty-dev`
- [ ] `json-warn`

**Notes:**
- `LOG_FORMAT` defaults to `json` in `a2a-server/src/config/index.ts`, so production logs follow the JSON/info combo.

## Implementation backlog

- [ ] Align Winston (or other sinks) docs with `LOG_FORMAT` if multiple loggers exist.

## Related

- `a2a-server/src/config/index.ts`
- `a2a-server/src/utils/logger.ts`

---

## Log file directory (Winston)

**Last reviewed:** 2026-03-24

### Constraints (invariants)

- **`a2a-server/src/utils/logger.ts`**: under **`cwd/logs`**, **`prepareLogFile`** **deletes every file** in that directory except **`a2a.log`**, then truncates **`a2a.log`**. File transport appends after that.

### Context

On **every server start**, non-**a2a.log** files in **`logs/`** are removed. That is aggressive if you store other artifacts there (rotated logs, heap dumps).

### Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `current-aggressive` | As implemented | Single **a2a.log**; wipe siblings on boot. | Simple; destroys co-located files. |
| `dedicated-subdir` | Convention | Only put **a2a-server** logs under **logs/a2a-server/** after code change. | Requires small refactor. |
| `rotate-retain` | Winston daily rotate | Replace wipe with **winston-daily-rotate-file** or OS **logrotate**. | Keeps history; more ops setup. |

### Current selection (log files)

- [x] `current-aggressive`
- [ ] `dedicated-subdir`
- [ ] `rotate-retain`

### Implementation backlog (log files)

- [ ] If adopting `rotate-retain`, remove unlink loop or scope it to **a2a.log** only.

**Notes:**
- `prepareLogFile()` already deletes non-`a2a.log` siblings before truncating the active file, so the aggressive cleanup matches existing behavior.

## Open questions

- …
