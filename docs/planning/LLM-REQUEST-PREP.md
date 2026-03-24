# LLM request preparation (planning note)

**Навіщо тут:** орієнтир для планування симуляцій і промптів без дублювання технічної специфікації.

**Канон (деталі, шляхи від `a2a-server/`, тести, related docs):** [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md).

**AI-action патерн (execute / transforms):** [`a2a-server/docs/AI-ACTION-TRANSFORM-PATTERN.md`](../../a2a-server/docs/AI-ACTION-TRANSFORM-PATTERN.md).

**Коротко для плану:** `result` згортається в `context.history`; у шаблон потрапляє `${flowControlHint}` з `execution.action` + `step`. Після змін — прогін симуляцій / golden: [`issues/07-simulations-golden-standard.md`](issues/07-simulations-golden-standard.md).

## Див. також

- [`ADR-0026-server-llm-request-prep.md`](../adr/ADR-0026-server-llm-request-prep.md) — формальне рішення (ADR).
- [`AGENTS.md`](../../AGENTS.md) — Simulation Pipeline (коротке посилання).
- [`issues/02-dialog-history.md`](issues/02-dialog-history.md) — історія діалогу.
- [`issues/09-auto-ai.md`](issues/09-auto-ai.md) — auto-ai.
