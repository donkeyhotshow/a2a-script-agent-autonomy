# Memory Package - Quick Reference

## 1. PACKAGE INVENTORY

### Files in packages/memory/src/src/
| File | Primary Exports | Purpose |
|------|-----------------|---------|
| [episodic-memory.ts](a2a-server/packages/memory/src/src/episodic-memory.ts) | `EpisodicMemory` (class) | Persistent episodic memory with semantic recall (ADR-0062) |
| [experience-bank.ts](a2a-server/packages/memory/src/src/experience-bank.ts) | `ExperienceBank` (class), `globalExperienceBank` (singleton) | State-action pair storage for reinforcement learning |
| [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) | `TemporalMemory` (class) | Multi-hop episodic recall with temporal reasoning (ADR-0064) |

---

## 2. ALL IMPORTS MAPPED

| Importing File | Import Type | What | Line |
|---|---|---|---|
| [cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts) | Type import | `EpisodicMemory` | 2 |
| [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts) | Named import | `EpisodicMemory` from `@a2a/server-memory` | 35 |
| [gray-room/orchestrator](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts) | Relative import | `globalExperienceBank` | 46 |
| [gray-room/request-processor](a2a-server/packages/gray-room/src/core/request-processor/gray-room-orchestrator.ts) | Relative import | `globalExperienceBank` | 46 |
| [features/orchestrator](a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts) | Relative import | `globalExperienceBank` | 46 |
| [features/request-processor](a2a-server/packages/features/src/gray-room/core/request-processor/gray-room-orchestrator.ts) | Relative import | `globalExperienceBank` | 46 |
| [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) | Local import | `EpisodicMemory`, `Episode`, `RecallResult` | 15 |
| [daemon/temporal-memory.ts](a2a-server/packages/daemon/src/memory/temporal-memory.ts) | Local import | `EpisodicMemory`, `Episode`, `RecallResult` | 15 |

---

## 3. EXPORTED SYMBOLS (ALL)

### Classes
- `EpisodicMemory` - Persistent episodic memory storage
- `ExperienceBank` - State-action pair bank
- `TemporalMemory` - Multi-hop recall engine

### Singleton Instances
- `globalExperienceBank: ExperienceBank` - Global experience store

### Types (EpisodicMemory)
- `Episode` - Episode record (id, session_id, task_description, embedding, outcome, etc.)
- `EpisodeOutcome` - 'success' | 'partial' | 'failure'
- `RecallResult` - { episode, similarity_score, applicable_lessons, risk_warnings }

### Types (ExperienceBank)
- `StateActionPair` - { state_hash, context_summary, action_type, action_payload, quality_score, timestamp }

### Types (TemporalMemory)
- `TemporalHop` - { episode_id, similarity, temporal_distance_days, bridge_concept, lessons_transferred }
- `TemporalChain` - { query, hops, synthesized_insight, confidence, contradictions_found }
- `TemporalPattern` - { description, occurrences, first_seen, last_seen, sessions_affected, confidence }
- `KnowledgeNode` - { concept, episode_ids, related_concepts, co_occurrence_count }

---

## 4. CONFIG & DEPENDENCIES

### Environment Variables
| Variable | Module | Default | Purpose |
|---|---|---|---|
| `EPISODIC_MEMORY_PATH` | episodic-memory.ts | `{cwd}/storage/episodic.json` | Episode storage file path |
| `DATABASE_URL` | episodic-memory.ts | undefined | Postgres connection; if set, overrides JSON backend |
| `EXPERIENCE_BANK_PATH` | experience-bank.ts | `{cwd}/storage/experience_bank.json` | Experience store file path |
| `COGNITION_INJECTION_ENABLED` | dialog-request-processor.ts | undefined | Enable/disable EpisodicMemory injection in LLM context |

### Missing package.json
- **Status:** ⚠️ No `packages/memory/package.json` exists
- **Workaround:** Resolved via `"workspaces": ["packages/*"]` glob in root
- **Import:** `@a2a/server-memory` (scoped import) OR relative path
- **Risk:** Fragile; no explicit exports configuration

### TypeScript Config
- No memory-specific tsconfig
- Included via root: `"include": ["packages/**/src/**/*", ...]`
- No path alias for `@a2a/server-memory`

---

## 5. CODE FLOWS

### Flow 1: Cognition Knowledge Injection
```
DialogRequestProcessor (line 472)
  ↓ [if COGNITION_INJECTION_ENABLED]
  ├─ new CognitionBase()
  ├─ new EpisodicMemory()
  └─ cognition.injectPriors(..., episodic)
      └─ episodic.recall(topic) → RecallResult[]
      └─ inject prior knowledge into LLM message
```

### Flow 2: Experience Recording
```
GrayRoomOrchestrator (line 46)
  ↓
  import globalExperienceBank
  ↓
  During gray room loop:
  └─ globalExperienceBank.recordTurn(sessionId, turnId, context, action, score)
```

---

## 6. STORAGE BACKENDS

### EpisodicMemory Backends (Priority Order)
1. **PostgreSQL** (if DATABASE_URL set)
   - Table: `episodic_memory`
   - Optional dependency: `pg` package
   - Falls back to JSON if pg not installed

2. **JSON File** (fallback/default)
   - Path: `{EPISODIC_MEMORY_PATH}` or `{cwd}/storage/episodic.json`
   - Auto-creates directory if needed

---

## 7. CRITICAL ISSUES

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No package.json for memory | HIGH | `packages/memory/` | Implicit exports, fragile workspace resolution |
| Nested src/src structure | MEDIUM | `packages/memory/src/src/` | Confusing, non-standard |
| No index.ts entry point | MEDIUM | `packages/memory/src/` | No unified export path |
| Relative imports assumed dir structure | LOW | gray-room, features | Brittle to refactoring |

---

## 8. QUICK STATS

| Metric | Count |
|--------|-------|
| Memory package files | 3 |
| Exported classes | 3 |
| Exported singleton instances | 1 |
| Imported types | 7 |
| Files importing from memory | 8 |
| Unique import patterns | 3 |
| Environment variable deps | 4 |
| Feature flags using memory | 1 |
| Storage file paths | 3 |
