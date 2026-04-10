# A2A Server Memory Package Analysis

**Date:** April 10, 2026  
**Project:** a2a-server  
**Scope:** Complete analysis of the `packages/memory` directory and all its dependencies

---

## 1. MEMORY PACKAGE CONTENTS

### Location
```
a2a-server/packages/memory/
├── src/
│   └── src/  (nested structure)
│       ├── episodic-memory.ts
│       ├── experience-bank.ts
│       └── temporal-memory.ts
├── dist/
├── docs/
└── tests/
```

### Files and Exports

#### **episodic-memory.ts**
**Path:** [episodic-memory.ts](a2a-server/packages/memory/src/src/episodic-memory.ts)

**Exports:**
- **Types:**
  - `EpisodeOutcome` - Union type: `'success' | 'partial' | 'failure'`
  - `Episode` - Interface with fields:
    - `id: string`
    - `session_id: string`
    - `task_description: string`
    - `task_embedding: number[]` (384-dimensional vector)
    - `outcome: EpisodeOutcome`
    - `failure_reason?: string`
    - `lessons: string[]`
    - `artifacts_produced: string[]`
    - `confidence_final: number`
    - `duration_ms: number`
    - `loop_count: number`
    - `strategies_used: string[]`
    - `strategies_that_worked: string[]`
    - `strategies_that_failed: string[]`
    - `created_at: number` (Unix ms timestamp)

  - `RecallResult` - Interface with fields:
    - `episode: Episode`
    - `similarity_score: number` (cosine similarity 0.0–1.0)
    - `applicable_lessons: string[]`
    - `risk_warnings: string[]`

- **Classes:**
  - `EpisodicMemory` - Main class for persistent episodic memory
    - **Methods:**
      - `constructor(jsonFilePath?: string)` - Initializes with JSON backend or Postgres if DATABASE_URL set
      - `save(episode: Omit<Episode, 'id'> & { id?: string }): Promise<Episode>` - Persist episode, auto-generates ID
      - `recall(taskDescription: string, topK = 5): Promise<RecallResult[]>` - Return topK nearest episodes by cosine similarity

**Key Features:**
- Dual storage backend: Postgres (priority) or JSON file
- 384-dimensional task embeddings with cosine similarity matching
- Fallback to lexical bigram overlap when embeddings unavailable
- ADR-0062 specification: Persistent episodic memory with semantic recall
- Default storage: `storage/episodic.json`
- Environment variable: `EPISODIC_MEMORY_PATH` (overrides default)
- Optional dependency: `pg` package (falls back to JSON if unavailable)

---

#### **experience-bank.ts**
**Path:** [experience-bank.ts](a2a-server/packages/memory/src/src/experience-bank.ts)

**Exports:**
- **Types:**
  - `StateActionPair` - Interface with fields:
    - `state_hash: string`
    - `context_summary: string`
    - `action_type: string`
    - `action_payload: string`
    - `quality_score: number` (0..1)
    - `timestamp: string`

- **Classes:**
  - `ExperienceBank` - Manages state-action pairs for reinforcement learning
    - **Constructor:** `constructor(filePath?: string)`
    - **Methods:**
      - `recordTurn(sessionId: string, turnId: string, context: string, action: { type: string; payload: string }, score: number): Promise<void>`
      - `getRelevantExperiences(context: string): Promise<StateActionPair[]>` - Returns top 3 experiences sorted by quality_score

- **Singleton Export:**
  - `globalExperienceBank: ExperienceBank` - Global instance, instantiated on module load

**Key Features:**
- In-memory store with async file persistence
- Default storage: `storage/experience_bank.json`
- Environment variable: `EXPERIENCE_BANK_PATH` (overrides default)
- Auto-loads on construction
- State-action pair quality scoring

---

#### **temporal-memory.ts**
**Path:** [temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts)

**Exports:**
- **Types:**
  - `TemporalHop` - Interface with fields:
    - `episode_id: string`
    - `similarity: number`
    - `temporal_distance_days: number`
    - `bridge_concept: string`
    - `lessons_transferred: string[]`

  - `TemporalChain` - Interface with fields:
    - `query: string`
    - `hops: TemporalHop[]`
    - `synthesized_insight: string`
    - `confidence: number`
    - `contradictions_found: string[]`

  - `TemporalPattern` - Interface with fields:
    - `description: string`
    - `occurrences: number`
    - `first_seen: number`
    - `last_seen: number`
    - `sessions_affected: string[]`
    - `confidence: number`

  - `KnowledgeNode` - Interface with fields:
    - `concept: string`
    - `episode_ids: string[]`
    - `related_concepts: string[]`
    - `co_occurrence_count: number`

- **Classes:**
  - `TemporalMemory` - Multi-hop episodic recall with temporal reasoning
    - **Constructor:** `constructor(episodic?: EpisodicMemory)`
    - **Methods:**
      - `multiHopRecall(query: string, maxHops = 3): Promise<TemporalChain>` - Multi-hop temporal recall
      - `temporalReasoning(episodes: Episode[]): Promise<TemporalPattern[]>` - Analyze temporal patterns
      - `refreshKnowledgeGraph(): Promise<void>` - Build/refresh knowledge graph from episodes
      - `_detectContradiction(ep1: Episode, ep2: Episode): string | null` - Detect contradictions
      - `_findBridgeConcept(ep1: Episode | null, ep2: Episode, query: string): string` - Find bridging concepts
      - `_detectToolFailurePattern(sorted: Episode[]): TemporalPattern[]` - Pattern detection
      - `_detectLoopConfidenceDrop(sorted: Episode[]): TemporalPattern | null` - Confidence tracking
      - `_detectDurationFailurePattern(sorted: Episode[]): TemporalPattern | null` - Duration analysis

- **Type Re-exports:**
  - `RecallResult` - Re-exported from EpisodicMemory for convenience

**Key Features:**
- ADR-0064: Multi-hop episodic recall with temporal reasoning
- In-memory knowledge graph (adjacency list)
- Multi-hop chaining: each hop uses previous context to guide next search
- Contradiction detection across temporal hops
- Redis fallback for knowledge graph (not yet implemented in code)
- Pattern recognition across episodes
- Temporal distance calculation

---

## 2. ALL FILES IMPORTING FROM MEMORY PACKAGE

### Direct Imports by Path

#### **[cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts)** (Type Import)
**Line:** 2  
**Import:** `import type { EpisodicMemory } from '../../memory/episodic-memory.js';`
**Usage Context:**
- Type import only
- Used in method signature: `injectPriors(..., episodicMemory: EpisodicMemory)`
- Calls `episodicMemory.recall(topic)` to get top episodes for context injection
- Storage: `storage/cognition_priors.json`

#### **[dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts)** (Named Import)
**Line:** 35  
**Import:** `import { EpisodicMemory } from "@a2a/server-memory";`
**Usage Context:**
- Line 478: `const episodic = new EpisodicMemory();`
- Instantiation inside cognition injection block (guarded by `COGNITION_INJECTION_ENABLED` feature flag)
- Passed to `CognitionBase.injectPriors()` for prior knowledge injection
- Conditional feature: enabled when `process.env.COGNITION_INJECTION_ENABLED === "1"` or `"true"`

---

### Relative Path Imports (Via packages/gray-room and packages/features)

#### **[gray-room/src/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts)**
**Line:** 46  
**Import:** `import { globalExperienceBank } from "../../../memory/experience-bank.js";`
**Usage Context:**
- Imports singleton instance of ExperienceBank
- Reference for experience management in gray room interrupt processing

#### **[gray-room/src/core/request-processor/gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/request-processor/gray-room-orchestrator.ts)**
**Line:** 46  
**Import:** `import { globalExperienceBank } from "../../memory/experience-bank.js";`
**Usage Context:**
- Same as above (duplicate path, different package structure)

#### **[features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts)**
**Line:** 46  
**Import:** `import { globalExperienceBank } from "../../../memory/experience-bank.js";`
**Usage Context:**
- Features package variant of gray-room orchestrator
- Imports singleton for request-level experience recording

#### **[features/src/gray-room/core/request-processor/gray-room-orchestrator.ts](a2a-server/packages/features/src/gray-room/core/request-processor/gray-room-orchestrator.ts)**
**Line:** 46  
**Import:** `import { globalExperienceBank } from "../../memory/experience-bank.js";`
**Usage Context:**
- Request processor variant

---

### Internal Memory Package Imports

#### **[memory/src/src/temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts)**
**Line:** 15  
**Import:** `import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';`
**Usage Context:**
- TemporalMemory depends on EpisodicMemory
- Stores episodic instance: `private readonly episodic: EpisodicMemory;`
- Calls `this.episodic.recall()` for multi-hop reasoning

#### **[daemon/src/memory/temporal-memory.ts](a2a-server/packages/daemon/src/memory/temporal-memory.ts)** (Duplicate)
**Line:** 15  
**Import:** `import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';`
**Usage Context:**
- Appears to be a copy/mirror of the main temporal-memory
- Same import pattern

---

## 3. REFERENCES IN CONFIGURATION FILES

### Package Workspace References

**Root package.json:** [a2a-server/package.json](a2a-server/package.json)
- **Workspaces:** Includes `packages/*` glob pattern
- **Memory package:** NOT explicitly listed in dependencies (no package.json in memory/)
- **Import pattern:** `@a2a/server-memory` suggests it should be a workspace package but lacks package.json

**Key observation:** The memory package does NOT have its own `package.json` file. It exists in the workspace via the glob pattern `packages/*`, but without:
- Named exports configuration
- Dependency declarations
- Build scripts
- Version information
- Main entry point definition

---

### TypeScript Configuration References

**[a2a-server/tsconfig.json](a2a-server/tsconfig.json)**
- **Line 39:** Includes memory-related path in compile includes:
  ```
  "include": [
    "packages/**/src/**/*",
    "packages/**/src/*",
    "features/gray-room/components/features/gray-room/components/memoryroom/memory",
    ...
  ]
  ```
- Contains oddly nested path: `features/gray-room/components/features/gray-room/components/memoryroom/memory` (appears to be a build artifact or typo)
- No path aliases for `@a2a/server-memory` defined

---

### Missing Configuration
- **No package.json for memory package** - This explains why `@a2a/server-memory` import works via workspace resolution but appears unresolved
- **No explicit exports field** - No export map configuration
- **No build configuration** - No tsconfig.json in memory package directory

---

## 4. CODE DEPENDING ON MEMORY PACKAGE EXPORTS

### Direct Code Dependencies

#### **CognitionBase (Depends on EpisodicMemory)**
**File:** [cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts)  
**Usage:**
```typescript
// Line 87: Method signature
async injectPriors(
  topic: string,
  sessionId: string,
  lessonStore: LessonStoreMock,
  patternStore: PatternStoreMock,
  episodicMemory: EpisodicMemory,  // Received parameter
): Promise<InjectedPriors>

// Line 122: Method call
const episodes = await episodicMemory.recall(topic);
```

#### **DialogRequestProcessor (Instantiates EpisodicMemory)**
**File:** [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts)  
**Usage:**
```typescript
// Line 478: Instantiation
const episodic = new EpisodicMemory();

// Line 490: Passed to cognition
priors = await cognition.injectPriors(
  topic,
  sessionId,
  { query: async () => [] },
  { query: async () => [] },
  episodic,  // Instance passed here
);
```

#### **GrayRoomOrchestrator (Uses globalExperienceBank)**
**Files:** 
- [packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts)
- [packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts)

**Usage:**
```typescript
import { globalExperienceBank } from "../../../memory/experience-bank.js";
// (or relative path variant)
// Used for recording state-action pairs during gray room processing
```

---

### Runtime Dependencies

#### **Environment Variables Read**
1. **EPISODIC_MEMORY_PATH** - [episodic-memory.ts](a2a-server/packages/memory/src/src/episodic-memory.ts)
   - Default: `{cwd}/storage/episodic.json`
   - Type: File path string

2. **DATABASE_URL** - [episodic-memory.ts](a2a-server/packages/memory/src/src/episodic-memory.ts)
   - Postgres connection string
   - When set: Uses PostgresBackend instead of JSON
   - Optional dependency: `pg` package

3. **EXPERIENCE_BANK_PATH** - [experience-bank.ts](a2a-server/packages/memory/src/src/experience-bank.ts)
   - Default: `{cwd}/storage/experience_bank.json`
   - Type: File path string

4. **COGNITION_INJECTION_ENABLED** - [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts)
   - Line 472: `process.env.COGNITION_INJECTION_ENABLED === "1"`
   - Type: Boolean feature flag
   - When enabled: Injects prior knowledge from episodic memory

#### **File I/O**
- **Episodic memory store:** `storage/episodic.json` (JSON backend)
- **Experience bank store:** `storage/experience_bank.json`
- **Cognition priors store:** `storage/cognition_priors.json`

---

## 5. PACKAGE STRUCTURE ISSUES & ANOMALIES

### Critical Issue: Missing package.json
**Problem:** No `a2a-server/packages/memory/package.json` file exists.

**Impact:**
- The import `import { EpisodicMemory } from "@a2a/server-memory";` works only because:
  - Root `package.json` contains `"workspaces": ["packages/*"]`
  - TypeScript compiler resolves via workspace glob pattern
  - But the package has no formal entry point definition

**Risk:** This makes the package fragile:
- No explicit exports configuration
- No version pinning
- No build script declaration
- Export paths are implicit via file structure

### Nested src/src Structure
**Observed:** `packages/memory/src/src/*` (double-nested)

**Normal pattern:** Should be `packages/memory/src/*`

**Possible explanations:**
- Build artifact from previous compilation
- Repository migration artifact
- Intentional separation (unclear)

**Risk:** Confusing for maintenance and imports

---

## 6. SUMMARY TABLE

| Aspect | Finding |
|--------|---------|
| **Memory Package Location** | `a2a-server/packages/memory/src/src/` |
| **Files in Package** | 3 core files (episodic, experience, temporal) |
| **Exported Classes** | 2 main: `EpisodicMemory`, `ExperienceBank` |
| **Exported Singleton** | 1: `globalExperienceBank` |
| **Exported Types** | 7+: Episode, RecallResult, StateActionPair, TemporalHop, TemporalChain, TemporalPattern, KnowledgeNode |
| **Direct Package Dependencies** | 2: dialog-request-processor, cognition-base |
| **Indirect Dependencies** | 4: gray-room orchestrators (2x), features orchestrators (2x) |
| **Storage Backends** | 2: PostgreSQL (optional), JSON file (fallback) |
| **configuration Files** | Root tsconfig.json only; no package.json for memory |
| **Feature Flags** | 1: COGNITION_INJECTION_ENABLED |
| **Environment Variables** | 3: EPISODIC_MEMORY_PATH, DATABASE_URL, EXPERIENCE_BANK_PATH, COGNITION_INJECTION_ENABLED |
| **Status** | **RISK: Missing package.json** |

---

## 7. USAGE PATTERNS

### Pattern 1: Cognition Knowledge Injection (Dialog)
**Flow:**
1. DialogRequestProcessor checks `COGNITION_INJECTION_ENABLED` flag
2. If enabled, instantiates `EpisodicMemory()`
3. Creates `CognitionBase()` instance
4. Calls `cognition.injectPriors()` passing episodic memory
5. Episodic memory recalls relevant episodes by task description
6. Prior knowledge injected into LLM prompt

**Code path:** [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts#L472) lines 472-490

### Pattern 2: Experience Bank Global Singleton
**Flow:**
1. GrayRoomOrchestrator imports `globalExperienceBank` (singleton)
2. During gray room processing, records state-action pairs
3. ExperienceBank maintains in-memory store with file persistence
4. Relevant experiences retrieved for future context

**Code path:** [gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts#L46) line 46

---

## 8. RECOMMENDATIONS

### Critical
1. **Create a proper package.json for memory package**
   - Add name: `@a2a/server-memory`
   - Define exports field with entry points
   - Declare dependencies (logger, pg as optional)
   - Add build and test scripts

2. **Fix nested src/src structure**
   - Flatten to packages/memory/src/
   - Update all import paths

### Important
3. **Add index.ts to memory package**
   - Re-export all public symbols
   - Single entry point for consumers

4. **Document storage backend selection**
   - Add comments explaining DATABASE_URL precedence
   - Document pg optional dependency handling

### Nice-to-Have
5. **Add path alias in tsconfig**
   - Alias `@memory` → `packages/memory/src`
   - Cleaner imports

6. **Consider splitting into multiple packages**
   - `@a2a/server-memory-episodic` - episodic memory only
   - `@a2a/server-memory-temporal` - temporal reasoning
   - Reduces interdependencies

---

## Appendix: File Count Summary

**Total files importing memory:** 7
- 2 direct scoped imports via `@a2a/server-memory`
- 5 relative path imports via gray-room/features packages
- 2 internal memory package imports

**Total distinct import patterns:** 3
- `@a2a/server-memory` (package scope)
- `../../memory/episodic-memory.js` (type import)
- `../../../memory/experience-bank.js` or `../../memory/experience-bank.js` (relative)
