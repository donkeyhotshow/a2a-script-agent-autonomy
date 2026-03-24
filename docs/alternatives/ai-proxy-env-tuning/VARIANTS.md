# AI proxy / promise tuning (.env) — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- `.env.example` defines knobs for **timeouts**, **promise TTL**, **worker counts**, and **Ollama lifecycle** (even if Python tree layout varies by checkout).

## Context

Long LLM calls need generous **forward** and **poll** timeouts; busy hosts need **worker** limits; laptops may want **Ollama auto-stop** to save RAM. Pick profiles: **dev laptop**, **shared CI**, **production**.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `dev-relaxed` | High timeouts, auto-start Ollama | `FORWARD_TIMEOUT_SECONDS`, `POLL_TIMEOUT_MS` large; `OLLAMA_AUTO_START=true`. | Fewer false timeouts; more background RAM. |
| `ci-tight` | Short TTL, few workers | Cap `PROMISE_MAX_WORKERS`, lower `PROMISE_TTL_SECONDS` if jobs must not linger. | Faster failure; may kill slow legitimate runs. |
| `prod-guarded` | Bounded workers + TTL | Balance cost and fairness; tune from metrics. | Requires monitoring. |

### Representative knobs (from `.env.example`)

- `FORWARD_TIMEOUT_SECONDS`, `POLL_INTERVAL_MS`, `POLL_TIMEOUT_MS`
- `PROMISE_TTL_SECONDS`, `PROMISE_MAX_WORKERS`
- `OLLAMA_AUTO_START`, `OLLAMA_IDLE_TIMEOUT`, `OLLAMA_KEEP_ALIVE`

## Current selection (this repo)

- [ ] `dev-relaxed`
- [ ] `ci-tight`
- [ ] `prod-guarded`

**Concrete values (fill):**

**Notes:**

## Implementation backlog

- [ ] Map each profile to a checked-in `.env.example` section or `docs/SYSTEM_STARTUP.md`.

## Related

- `.env.example` (AI Integration block)
- `AGENTS.md` (LLM timeout workflow)

## Open questions

- …
