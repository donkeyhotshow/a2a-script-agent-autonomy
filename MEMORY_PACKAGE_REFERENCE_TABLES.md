# Memory Package - Structured Reference Tables

## Table 1: All Exported Symbols

| Symbol | Type | Module | Export Kind | Usage |
|--------|------|--------|-------------|-------|
| EpisodicMemory | class | episodic-memory.ts | Named export | Instantiated in dialog-request-processor.ts; Used in cognition-base.ts |
| Episode | interface | episodic-memory.ts | Named type export | Passed between TemporalMemory, EpisodicMemory; Properties accessed in cognition-base.ts |
| EpisodeOutcome | type | episodic-memory.ts | Named type export | Episode.outcome field type |
| RecallResult | interface | episodic-memory.ts | Named type export | Return type of EpisodicMemory.recall(); Used in cognition-base.ts, temporal-memory.ts |
| ExperienceBank | class | experience-bank.ts | Named export | Instantiated as globalExperienceBank singleton |
| StateActionPair | interface | experience-bank.ts | Named type export | ExperienceBank store type |
| globalExperienceBank | const (singleton) | experience-bank.ts | Named export | Imported in 4 gray-room orchestrator files |
| TemporalMemory | class | temporal-memory.ts | Named export | Composed into EpisodicMemory; Provides multi-hop reasoning |
| TemporalHop | interface | temporal-memory.ts | Named type export | TemporalChain.hops element type |
| TemporalChain | interface | temporal-memory.ts | Named type export | Return type of TemporalMemory.multiHopRecall() |
| TemporalPattern | interface | temporal-memory.ts | Named type export | Return type of TemporalMemory.temporalReasoning() |
| KnowledgeNode | interface | temporal-memory.ts | Named type export | Knowledge graph node type |

---

## Table 2: All Import Statements

| Importing File | Line | Import Statement | Gets | Import Type |
|---|---|---|---|---|
| [cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts) | 2 | `import type { EpisodicMemory } from '../../memory/episodic-memory.js';` | EpisodicMemory(type) | Type-only, relative path |
| [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts) | 35 | `import { EpisodicMemory } from "@a2a/server-memory";` | EpisodicMemory(class) | Named, scoped package |
| [gray-room/orchestrator](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts) | 46 | `import { globalExperienceBank } from "../../../memory/experience-bank.js";` | globalExperienceBank | Named, relative path |
| [gray-room/request-processor](a2a-server/packages/gray-room/src/core/request-processor/gray-room-orchestrator.ts) | 46 | `import { globalExperienceBank } from "../../memory/experience-bank.js";` | globalExperienceBank | Named, relative path |
| [features/orchestrator](a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts) | 46 | `import { globalExperienceBank } from "../../../memory/experience-bank.js";` | globalExperienceBank | Named, relative path |
| [features/request-processor](a2a-server/packages/features/src/gray-room/core/request-processor/gray-room-orchestrator.ts) | 46 | `import { globalExperienceBank } from "../../memory/experience-bank.js";` | globalExperienceBank | Named, relative path |
| [memory/temporal](a2a-server/packages/memory/src/src/temporal-memory.ts) | 15 | `import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';` | EpisodicMemory, Episode, RecallResult | Mixed, local file |
| [daemon/temporal](a2a-server/packages/daemon/src/memory/temporal-memory.ts) | 15 | `import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';` | EpisodicMemory, Episode, RecallResult | Mixed, local file |

---

## Table 3: All Method Calls on Memory Exports

| Calling File | Export | Method | Full Call | Line Range |
|---|---|---|---|---|
| [cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts) | EpisodicMemory | recall() | `episodicMemory.recall(topic)` | 122 |
| [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts) | EpisodicMemory | constructor() | `new EpisodicMemory()` | 478 |
| [gray-room/orchestrator](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts) | ExperienceBank | recordTurn() | `globalExperienceBank.recordTurn(...)` | (likely, not shown) |
| [gray-room/orchestrator](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts) | ExperienceBank | getRelevantExperiences() | `globalExperienceBank.getRelevantExperiences(...)` | (likely, not shown) |
| [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) | EpisodicMemory | recall() | `this.episodic.recall(currentQuery, 5)` | 78 |
| [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) | EpisodicMemory | recall() | `await this.episodic.recall('', 1000)` | 169 |
| [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) | EpisodicMemory | constructor() | `new EpisodicMemory()` | 59 |

---

## Table 4: Environment Variables

| Variable Name | Module | Default Value | Type | Purpose |
|---|---|---|---|---|
| `EPISODIC_MEMORY_PATH` | episodic-memory.ts | `{cwd}/storage/episodic.json` | string | File path for JSON episodic memory backend |
| `DATABASE_URL` | episodic-memory.ts | none | string | Postgres connection string; if set, overrides JSON backend |
| `EXPERIENCE_BANK_PATH` | experience-bank.ts | `{cwd}/storage/experience_bank.json` | string | File path for experience bank persistence |
| `COGNITION_INJECTION_ENABLED` | dialog-request-processor.ts | none | "0"/"1"/"true"/"false" | Feature flag to enable episodic memory injection |

---

## Table 5: Feature Flags

| Feature | Control Variable | Source File | Condition | Effect |
|---|---|---|---|---|
| Cognition Injection | `COGNITION_INJECTION_ENABLED` | dialog-request-processor.ts line 472 | `=== "1" \|\| === "true"` | Enables EpisodicMemory instantiation and prior injection into LLM context |

---

## Table 6: Storage Files

| File | Created By | Purpose | Environment Variable | Default Path |
|---|---|---|---|---|
| episodic.json | EpisodicMemory (JSON backend) | Stores Episode records | `EPISODIC_MEMORY_PATH` | `{cwd}/storage/episodic.json` |
| experience_bank.json | ExperienceBank | Stores StateActionPair records | `EXPERIENCE_BANK_PATH` | `{cwd}/storage/experience_bank.json` |
| cognition_priors.json | CognitionBase | Stores learned priors | `COGNITION_PRIORS_PATH` | `{cwd}/storage/cognition_priors.json` |

---

## Table 7: Type Cross-Reference

| Type | Defined In | Used In | Fields/Properties |
|---|---|---|---|
| Episode | episodic-memory.ts | cognition-base.ts, temporal-memory.ts | id, session_id, task_description, task_embedding, outcome, lessons, artifacts_produced, confidence_final, duration_ms, loop_count, strategies_used, strategies_that_worked, strategies_that_failed, created_at |
| RecallResult | episodic-memory.ts | cognition-base.ts, temporal-memory.ts | episode, similarity_score, applicable_lessons, risk_warnings |
| EpisodeOutcome | episodic-memory.ts | episodic-memory.ts | 'success' \| 'partial' \| 'failure' |
| StateActionPair | experience-bank.ts | experience-bank.ts | state_hash, context_summary, action_type, action_payload, quality_score, timestamp |
| TemporalHop | temporal-memory.ts | temporal-memory.ts | episode_id, similarity, temporal_distance_days, bridge_concept, lessons_transferred |
| TemporalChain | temporal-memory.ts | temporal-memory.ts | query, hops, synthesized_insight, confidence, contradictions_found |
| TemporalPattern | temporal-memory.ts | temporal-memory.ts | description, occurrences, first_seen, last_seen, sessions_affected, confidence |
| KnowledgeNode | temporal-memory.ts | temporal-memory.ts | concept, episode_ids, related_concepts, co_occurrence_count |

---

## Table 8: Data Flow Mapping

| Source → Sink | Data Type | File Locations | Flow Description |
|---|---|---|---|
| EpisodicMemory.recall() → CognitionBase.injectPriors() | RecallResult[] | episodic-memory.ts → cognition-base.ts | Episodes recalled for topic, converted to priors for LLM context |
| CognitionBase.injectPriors() → DialogRequestProcessor | InjectedPriors | cognition-base.ts → dialog-request-processor.ts | Priors injected into LLM message context |
| DialogRequestProcessor → globalExperienceBank.recordTurn() | StateActionPair | dialog-request-processor.ts → experience-bank.ts | Action outcomes recorded (implicit, not shown in code) |
| GrayRoomOrchestrator → globalExperienceBank | StateActionPair | gray-room-orchestrator.ts → experience-bank.ts | Interrupt outcomes recorded during gray room loop |
| EpisodicMemory.recall() → TemporalMemory.multiHopRecall() | RecallResult[] | episodic-memory.ts → temporal-memory.ts | Multi-hop traversal through semantic similarity |

---

## Table 9: Configuration Issues Checklist

| Issue | Status | Severity | Location | Fix |
|---|---|---|---|---|
| package.json missing for memory | ❌ MISSING | HIGH | `packages/memory/` | Create package.json with exports field |
| index.ts entry point | ❌ MISSING | MEDIUM | `packages/memory/src/` | Create index.ts re-exporting all symbols |
| Nested src/src structure | ✓ EXISTS | MEDIUM | `packages/memory/src/src/` | Flatten or document reasoning |
| @a2a/server-memory workspace resolution | ✓ WORKING | NONE | workspace config | Implicit via root package.json glob |
| Path aliases for imports | ❌ MISSING | LOW | tsconfig.json | Add path mapping for @memory → packages/memory/src |
| Storage directory auto-creation | ✓ WORKING | NONE | episodic-memory.ts, experience-bank.ts | Files create dirs recursively |

---

## Table 10: Code Statistics

| Metric | Count |
|---|---|
| Total files in memory package | 3 |
| Total exported classes | 3 (EpisodicMemory, ExperienceBank, TemporalMemory) |
| Total exported types/interfaces | 8 |
| Total exported singletons | 1 (globalExperienceBank) |
| Files importing from memory | 8 |
| Import patterns (unique) | 3 (@a2a/server-memory, ../../memory/*, ./%) |
| Methods called on exports | 4 (recall, constructor, recordTurn, getRelevantExperiences) |
| Environment variables consumed | 4 |
| Feature flags for memory | 1 |
| Storage files | 3 |

---

## Table 11: Import Pattern Summary

| Pattern | Usage | Files | Import Type |
|---|---|---|---|
| `@a2a/server-memory` | Scoped package import | dialog-request-processor.ts | runtime import |
| `../../memory/episodic-memory.js` | Type-only relative import | cognition-base.ts | type import |
| `../../../memory/experience-bank.js` | Relative singleton import | gray-room/orchestrator, features/orchestrator | runtime import |
| `../../memory/experience-bank.js` | Relative singleton import | gray-room/request-processor, features/request-processor | runtime import |
| `./episodic-memory.js` | Local sibling import | memory/temporal, daemon/temporal | runtime import (mixed) |

---

## Table 12: ADR References

| ADR | Topic | Module | File | Line |
|---|---|---|---|---|
| ADR-0062 | Persistent episodic memory with semantic recall | episodic-memory.ts | episodic-memory.ts | 2 (comment) |
| ADR-0064 | Multi-hop episodic recall with temporal reasoning | temporal-memory.ts | temporal-memory.ts | 2 (comment) |

---

## Table 13: Build & Compile Configuration

| Config File | Memory References | Details |
|---|---|---|
| Root package.json | `"workspaces": ["packages/*"]` | Glob includes memory package |
| tsconfig.json | `"include": [..., "features/gray-room/.../memory", ...]` | Memory paths included (some oddly nested) |
| memory/package.json | ❌ DOES NOT EXIST | Major issue: no formal package definition |
| memory/src/tsconfig.json | ❌ DOES NOT EXIST | No build script for memory package |
| memory/tests/ | Exists | Test files present but not analyzed |

---

## Summary Statistics

```
Total Exports: 12 symbols
  - Classes: 3
  - Interfaces: 8
  - Singletons: 1

Total Imports: 8 locations
  - Type imports: 1
  - Runtime imports: 7
  - Unique patterns: 3

File Dependencies:
  - Direct: 4 files
  - Indirect: 4 files
  - Internal: 2 files

Configuration Issues: 4
  - Critical (HIGH): 1
  - Important (MEDIUM): 2
  - Nice-to-have (LOW): 1

Storage:
  - Backend types: 2 (JSON, PostgreSQL)
  - Default files: 3
  - Env overrides: 3
```
