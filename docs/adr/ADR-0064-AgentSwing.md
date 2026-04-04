# ADR-0064: Adaptive Context Routing — AgentSwing
Status: Proposed | Date: 2026-04-04 | Priority: P1 | Effort: 45 min
Context: AgentSwing (2025) показал +3× steps efficiency через parallel branching с lookahead при context overflow. A2A использует линейное сжатие через compress_history interrupt. Нет adaptive выбора стратегии сжатия на основе task state.
Decision: Заменить линейный compress_history на AgentSwing parallel branching при превышении 80% контекста.

## Consequences:
- +3× steps efficiency на длинных задачах (AgentSwing benchmark)
- Adaptive vs linear — выбирает стратегию под текущий task state
- Параллельное построение branches (< 10ms, без LLM)
- Реиспользует session-compaction.ts логику
