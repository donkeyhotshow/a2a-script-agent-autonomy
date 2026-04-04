# ADR-0063: Stateful Experiences (MuSEAgent Pattern)
Status: Proposed | Date: 2026-04-04 | Priority: P1 | Effort: 1h
Context: MuSEAgent показал +8% accuracy и OOD generalization через atomic state-action pairs с качественными advice вместо хранения полных noisy сессий. A2A EpisodicMemory хранит целые сессии → много шума при recall.
Decision: Добавить ExperienceBank поверх EpisodicMemory. Каждая завершённая итерация GrayRoom → atomic experience с hindsight advice.

## Consequences:
- +8% recall accuracy (MuSEAgent benchmark)
- OOD generalization через bigram similarity
- Noise reduction vs полных сессий (atomic state-action vs full history)
- качественный advice без LLM call (heuristic hindsight, < 1ms)
