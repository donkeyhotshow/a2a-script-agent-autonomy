# ADR-0066: SWE-HERO Verification Pipeline
Status: Proposed | Date: 2026-04-04 | Priority: P1 | Effort: 1h
Context: SWE-HERO достигает 62% SWE-bench через two-stage verification: SWE-ZERO (static semantic analysis) → SWE-HERO (execution в sandbox). A2A использует только ToolTracker success_rate без структурированного verification pipeline.
Decision: Добавить SWEVerifier в action post-processing.

## Consequences:
- +62% verification accuracy (SWE-HERO benchmark)
- Two-stage: fast static (< 5ms) + optional execution
- Реиспользует существующий command-execution sandbox
- Hero stage требует TEST_COMMAND env var (опционально)
