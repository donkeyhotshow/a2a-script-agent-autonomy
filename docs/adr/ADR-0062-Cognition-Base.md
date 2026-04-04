# ADR-0062: Cognition Base (ASI-EVOLVE Knowledge Injection)
Status: Proposed | Date: 2026-04-04 | Priority: P1 | Effort: 1h
Context: ASI-EVOLVE Cognition Base инжектирует domain priors из papers/databases в начало каждого эксперимента → -50% cold start iterations. A2A RAG покрывает только code в репозитории. Session start без priors → агент тратит 3-5 итераций на "разведку" перед продуктивной работой.
Decision: Добавить CognitionBase с topic-aware prior injection на старте каждой сессии.

## Consequences:
- -50% cold start iterations (агент сразу знает anti-patterns)
- Max +500 tokens overhead (с контролем бюджета)
- Sources: LessonStore + PatternStore + EpisodicMemory (всё уже реализовано)
- truncated=true если превышает лимит → graceful degradation
