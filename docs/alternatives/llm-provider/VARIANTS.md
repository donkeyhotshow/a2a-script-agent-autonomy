# LLM provider — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Action-key shaped `execute` / `result` and session flow are unchanged by provider; only the model transport differs.

## Context

The stack can route model calls through a local runtime (Ollama), a proxy (AI Hub), or other backends. Variants describe *how* the project relies on that layer.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `local-ollama` | Local Ollama only | Dev machine runs Ollama; AI Hub or server targets `11434`. | Default local dev. |
| `hub-proxy` | AI Hub as gate | All LLM traffic via AI Hub (`11435`); Ollama managed there. | Matches `start-all` / prod-like routing. |
| `remote-api` | Hosted API | OpenAI/Anthropic/etc. instead of Ollama. | Needs keys, different cost model. |
| `mock-sync` | Deterministic mock | No real model; sync fixtures / simulations only. | CI, `sim:validate`, offline. |

## Current selection (this repo)

- [ ] `local-ollama`
- [ ] `hub-proxy`
- [ ] `remote-api`
- [ ] `mock-sync`

**Notes:** Mark one or more as *active* (e.g. dev vs CI).

## Implementation backlog

- [ ] Document env vars per variant in one place.
- [ ] …

## Related

- ADR: see AI / LLM touchpoints in `docs/adr/README.md` (e.g. ADR-0026 for request prep — orthogonal to provider choice).
- Config: `AGENTS.md` (Environment Variables), `ai-integration/` proxy routes.

## Open questions

- …
