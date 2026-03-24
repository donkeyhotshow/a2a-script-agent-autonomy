# A2A Server logging — application variants

**Last reviewed:** 2026-03-24

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

- [ ] `json-info`
- [ ] `pretty-dev`
- [ ] `json-warn`

**Notes:**

## Implementation backlog

- [ ] Align Winston (or other sinks) docs with `LOG_FORMAT` if multiple loggers exist.

## Related

- `a2a-server/src/config/index.ts`
- `a2a-server/src/utils/logger.ts` (if present)

## Open questions

- …
