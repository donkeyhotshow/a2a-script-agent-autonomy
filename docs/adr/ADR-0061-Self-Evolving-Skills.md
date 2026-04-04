# ADR-0061: Self-Evolving Skills (EvoSkills Pattern)
Status: Proposed | Date: 2026-04-04 | Priority: P1 | Effort: 1.5h
Context: EvoSkills достигает 71% SkillsBench через Gen→Surrogate→Oracle→Refine цикл с multi-file skill packages. A2A Registry статичен — новые инструменты добавляются только вручную. При tool_failure × 3 нет автоматического создания лучшей версии.
Decision: Добавить SkillEvolver в Registry. Trigger: TOOL_AUDIT outcome_class=fail трижды подряд → автоматическая эволюция skill.

## Consequences:
- +30% tool performance (соответствует EvoSkills benchmark)
- Automatic recovery from systematic tool failures
- Multi-file skill packages → reusable across sessions
- 2-5 min latency on first evolution (async, non-blocking)
- Oracle sandbox required (используем существующий command-execution)
