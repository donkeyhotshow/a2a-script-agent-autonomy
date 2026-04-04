# ADR-0065: Progressive Retrieval (OMNI-SIMPLEMEM Pattern)
Status: Proposed | Date: 2026-04-04 | Priority: P2 | Effort: 45 min
Context: OMNI-SIMPLEMEM +411% F1 на LoCoMo через pyramid retrieval (summary → full → KG). A2A RAG работает только с code и использует flat BM25+semantic. Нет pyramid и нет knowledge graph для multi-hop reasoning.
Decision: Добавить ProgressiveRetriever поверх существующего RAG.

## Consequences:
- +200% F1 на сложных queries (OMNI-SIMPLEMEM subset improvement)
- Progressive: fast path (layer 1 only) для простых запросов
- Совместимость с существующим Meilisearch RAG
