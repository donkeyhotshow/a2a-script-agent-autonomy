# ADR-0060: Dedicated Analyzer (ASI-EVOLVE Pattern)
Status: Proposed | Date: 2026-04-04 | Priority: P0 | Effort: 1h
Context: A2A имеет LLM Judge, но он оценивает output целиком без структурированного извлечения паттернов из multi-dim данных. ASI-EVOLVE показал, что dedicated analyzer (отдельный от generative LLM) даёт +15% insight quality и устраняет плато автономности.
Decision: Добавить DedicatedAnalyzer в GrayRoom post-LLM pipeline. Analyzer работает после получения response, перед applyInterrupt(). Результаты инжектируются в следующую итерацию через thinkingSlot.

## Consequences:
- +15% insight quality (structured vs. raw LLM judge)
- Anomaly detection → earlier loop/confidence recovery
- Hypothesis-driven next iteration (top-3 hypotheses в thinkingSlot)
- +5-10ms latency per turn (CPU-only, no LLM call)
