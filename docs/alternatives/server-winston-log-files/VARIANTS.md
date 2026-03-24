# Winston log file directory policy — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- **`a2a-server/src/utils/logger.ts`**: under **`cwd/logs`**, **`prepareLogFile`** **deletes every file** in that directory except **`a2a.log`**, then truncates **`a2a.log`**. File transport appends after that.

## Context

On **every server start**, non-**a2a.log** files in **`logs/`** are removed. That is aggressive if you store other artifacts there (rotated logs, heap dumps).

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `current-aggressive` | As implemented | Single **a2a.log**; wipe siblings on boot. | Simple; destroys co-located files. |
| `dedicated-subdir` | Convention | Only put **a2a-server** logs under **logs/a2a-server/** after code change. | Requires small refactor. |
| `rotate-retain` | Winston daily rotate | Replace wipe with **winston-daily-rotate-file** or OS **logrotate**. | Keeps history; more ops setup. |

## Current selection (this repo)

- [ ] `current-aggressive`
- [ ] `dedicated-subdir`
- [ ] `rotate-retain`

**Notes:**

## Implementation backlog

- [ ] If adopting `rotate-retain`, remove unlink loop or scope it to **a2a.log** only.

## Related

- `a2a-server/src/utils/logger.ts`
- `docs/alternatives/server-logging/VARIANTS.md`

## Open questions

- …
