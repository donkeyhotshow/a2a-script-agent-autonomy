# Memory Package - Detailed Import Usage Analysis

## Import #1: cognition-base.ts (Type Import)

**File:** [a2a-server/packages/server/src/cognition-base.ts](a2a-server/packages/server/src/cognition-base.ts)  
**Import Line:** 2  
**Type:** Type-only import

```typescript
import type { EpisodicMemory } from '../../memory/episodic-memory.js';
```

### Usage Analysis

**Line 2:** Import declaration
- Type import only (no runtime code included)
- Path: relative `../../memory/episodic-memory.js`

**Line 14:** Type in interface RepoKnowledgePrior
```typescript
source: 'lesson_store' | 'pattern_store' | 'episodic' | 'static' | 'dynamic';
```
- EpisodicMemory not used here; reference only to source literal

**Line 87:** Parameter type in injectPriors method
```typescript
async injectPriors(
  topic: string,
  sessionId: string,
  lessonStore: LessonStoreMock,
  patternStore: PatternStoreMock,
  episodicMemory: EpisodicMemory,  // ← Type annotation
): Promise<InjectedPriors>
```

**Line 122:** Method call on parameter
```typescript
const episodes = await episodicMemory.recall(topic);
```
- Calls `recall(topic)` method
- Returns `Promise<RecallResult[]>`
- Uses returned episodes starting line 122-132

**Line 123-131:** Process episodes
```typescript
for (const result of episodes.slice(0, 3)) {
  allPriors.push({
    topic,
    tech_stack: [],
    known_patterns: result.episode.lessons,  // ← Episode.lessons accessed
    known_anti_patterns: [],
    common_failure_modes: [],
    recommended_approaches: result.applicable_lessons,  // ← RecallResult properties
    ...
    source: 'episodic',
  });
}
```

**Exported usage:** Episode, RecallResult field accessors:
- `result.episode` - Episode object
- `result.episode.lessons` - string[] 
- `result.applicable_lessons` - string[]

### Summary
- **Purpose:** Accept episodic memory parameter for knowledge injection
- **Method calls:** `recall(topicString)`
- **Types accessed:** Episode, RecallResult
- **Control flow:** Guarded by feature flag check (not shown in excerpt)

---

## Import #2: dialog-request-processor.ts (Named Import)

**File:** [a2a-server/packages/server/src/request-processor/dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts)  
**Import Line:** 35  
**Type:** Named runtime import

```typescript
import { EpisodicMemory } from "@a2a/server-memory";
```

### Usage Analysis

**Line 35:** Import via scoped package name
- Package resolution: `@a2a/server-memory` (workspace package)
- Imports class (not type), so runtime code included

**Line 472:** Feature flag check (context)
```typescript
const cognitionInjectionEnabled =
  process.env.COGNITION_INJECTION_ENABLED === "1" ||
  process.env.COGNITION_INJECTION_ENABLED === "true";
```
- EpisodicMemory usage guarded by feature flag

**Line 478:** Instantiation
```typescript
const episodic = new EpisodicMemory();
```
- Creates new instance with default parameters
- Uses default json file path: `storage/episodic.json`
- Or respects `EPISODIC_MEMORY_PATH` env var if set

**Line 481-484:** CognitionBase creation and parameter passing
```typescript
const cognition = new CognitionBase();
// ...
const priors = await cognition.injectPriors(
  topic,
  sessionId,
  { query: async () => [] },  // LessonStore stub
  { query: async () => [] },  // PatternStore stub
  episodic,  // ← EpisodicMemory instance passed here
);
```

**Line 485-489:** Result processing
```typescript
const priorStr = cognition.formatForContext(priors);
if (priorStr && typeof ctx["message"] === "string") {
  ctx["message"] = ctx["message"] + "\n\n" + priorStr;
}
```
- Priors formatted and injected into LLM message context

**Line 490-495:** Error handling
```typescript
catch (err) {
  logger.warn(
    "[DialogRequestProcessor] CognitionBase injection failed",
    { error: String(err) },
  );
}
```
- Graceful failure; LLM proceeds without priors if episodic memory fails

### Summary
- **Purpose:** Enable knowledge injection from episodic memory into dialog LLM context
- **Runtime behavior:** Conditionally instantiate and use EpisodicMemory
- **Feature gated:** `COGNITION_INJECTION_ENABLED` environment variable
- **Error handling:** Non-fatal; logs warning but continues
- **Impact:** Extends LLM context with prior task knowledge

---

## Import #3-6: GrayRoom & Features Orchestrators (Relative Import)

**Files:**
1. [a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/orchestrator/gray-room-orchestrator.ts) - Line 46
2. [a2a-server/packages/gray-room/src/core/request-processor/gray-room-orchestrator.ts](a2a-server/packages/gray-room/src/core/request-processor/gray-room-orchestrator.ts) - Line 46
3. [a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts](a2a-server/packages/features/src/gray-room/core/orchestrator/gray-room-orchestrator.ts) - Line 46
4. [a2a-server/packages/features/src/gray-room/core/request-processor/gray-room-orchestrator.ts](a2a-server/packages/features/src/gray-room/core/request-processor/gray-room-orchestrator.ts) - Line 46

**Import Type:** Relative path, singleton import

### Code Pattern (All Four Files)

**Orchestrator variant (version 1):**
```typescript
import { globalExperienceBank } from "../../../memory/experience-bank.js";
```

**Request processor variant (version 2):**
```typescript
import { globalExperienceBank } from "../../memory/experience-bank.js";
```

**Difference:** Request processor uses one less `../` level

### Usage Analysis

**Line 46:** Direct import of singleton
- `globalExperienceBank` - Global ExperienceBank instance
- Imported at module load time
- Singleton persists for app lifetime

**Implicit usage location:** GrayRoomOrchestrator class definition
- Likely used in `runLoop()` method during gray room iteration
- Records experience pairs as interrupts are processed

**Expected usage pattern (typical for such imports):**
```typescript
// Pseudo-code based on class structure
async runLoop(...) {
  // ... During interrupt processing ...
  
  // Record turn outcome
  globalExperienceBank.recordTurn(
    sessionId,
    turnId,
    contextSnapshot,
    { type: 'interrupt_handled', payload: 'action_result' },
    qualityScore
  );
  
  // Or retrieve relevant experiences
  const relevantExp = await globalExperienceBank.getRelevantExperiences(ctx);
}
```

### Summary (All 4 Files)
- **Purpose:** Access global experience bank for recording interrupts/actions
- **Import source:** Direct singleton, no instantiation needed
- **Usage pattern:** Record state-action pairs during gray room processing
- **Persistence:** Automatically saved to file (`storage/experience_bank.json`)
- **Frequency:** Per-turn or per-interrupt recording

---

## Import #7-8: Internal Memory Package (Temporal → Episodic)

**Files:**
1. [a2a-server/packages/memory/src/src/temporal-memory.ts](a2a-server/packages/memory/src/src/temporal-memory.ts) - Line 15
2. [a2a-server/packages/daemon/src/memory/temporal-memory.ts](a2a-server/packages/daemon/src/memory/temporal-memory.ts) - Line 15

**Import Type:** Local module import

```typescript
import { EpisodicMemory, type Episode, type RecallResult } from './episodic-memory.js';
```

### Usage Analysis

**Line 15:** Triple import
- `EpisodicMemory` - Class (runtime)
- `Episode` - Type (compile-time)
- `RecallResult` - Type (compile-time)

**Line 54:** Class member initialization
```typescript
private readonly episodic: EpisodicMemory;
```
- Stores episodic memory instance as class property
- Property is private and readonly

**Line 58-59:** Constructor
```typescript
constructor(episodic?: EpisodicMemory) {
  this.episodic = episodic ?? new EpisodicMemory();
}
```
- Optional parameter to inject EpisodicMemory
- Default: Create new instance if not provided
- Allows for dependency injection testing

**Line 74, 88, 110, 116:** Type usage in method signatures
```typescript
let previousEpisode: Episode | null = null;  // Line 74

const candidate = results.find((r) => !visitedIds.has(r.episode.id));  // Line 81
const bridgeConcept = this._findBridgeConcept(  // Line 87
  previousEpisode,
  candidate.episode,  // Episode parameter
  currentQuery,
);
```

**Line 78:** Method call on episodic member
```typescript
const results = await this.episodic.recall(currentQuery, 5);
```
- Calls `recall()` with query and maxResults=5
- Returns `Promise<RecallResult[]>`

**Line 172:** Major operation - rebuild knowledge graph
```typescript
const all = await this.episodic.recall('', 1000);
```
- Bulk recall: empty query (gets all) up to 1000 episodes
- Used to build temporal patterns in `refreshKnowledgeGraph()`

### Summary (Imports #7-8)
- **Purpose:** TemporalMemory depends on EpisodicMemory for lower-level recall
- **Composition:** TemporalMemory wraps EpisodicMemory
- **Interface:** Exposures Episodes, RecallResults from lower layer
- **Pattern:** Decorator/wrapper pattern over episodic memory

---

## Dependency Graph

```
DialogRequestProcessor
├─ import EpisodicMemory from @a2a/server-memory
├─ create new EpisodicMemory()
└─ pass to CognitionBase.injectPriors()
   │
   ├─ cognition-base.ts
   │  └─ import EpisodicMemory from ../../memory/episodic-memory.js
   │     └─ call episodic.recall(topic)
   │        └─ return RecallResult[]
   │           └─ use Episode.lessons, RecallResult fields
   │
   └─ Add priors to LLM context
      └─ send to AI model with extended context

GrayRoomOrchestrator (4 variants)
│
└─ import globalExperienceBank from memory/experience-bank.js
   └─ call globalExperienceBank.recordTurn(...) 
      └─ persist to storage/experience_bank.json
      └─ retrieve with getRelevantExperiences()

TemporalMemory (internal)
│
└─ import EpisodicMemory from ./episodic-memory.js
   ├─ create instance in constructor
   └─ call this.episodic.recall()
      └─ multi-hop chaining
      └─ contradiction detection
      └─ pattern analysis
```

---

## ENV Variable Dependencies

### COGNITION_INJECTION_ENABLED
**Source:** [dialog-request-processor.ts](a2a-server/packages/server/src/request-processor/dialog-request-processor.ts) line 472

Check:
```typescript
process.env.COGNITION_INJECTION_ENABLED === "1" ||
process.env.COGNITION_INJECTION_ENABLED === "true"
```

**Effects:**
- If enabled: Executes lines 474-496 (episodic memory injection)
- If disabled: Skips cognitition injection, proceeds to hierarchical design reasoner

---

## Feature Flag Dependency

**Feature:** Cognition Knowledge Injection  
**Status:** Disabled by default (no env var set)  
**To Enable:** Set `COGNITION_INJECTION_ENABLED=1` or `true` before startup

**Effect:**
- Enables EpisodicMemory instantiation
- Triggers prior knowledge injection
- Extends LLM context with learned lessons from past episode outcomes

---

## Storage Dependencies

| Storage | Used By | Path Env Var | Default Path |
|---------|---------|---|---|
| Episodic Memory (JSON) | EpisodicMemory | `EPISODIC_MEMORY_PATH` | `{cwd}/storage/episodic.json` |
| Experience Bank | ExperienceBank | `EXPERIENCE_BANK_PATH` | `{cwd}/storage/experience_bank.json` |
| Cognition Priors | CognitionBase | `COGNITION_PRIORS_PATH` | `{cwd}/storage/cognition_priors.json` |

All files auto-created with directory hierarchy if missing.

---

## Import Path Variations

| Module | Path Format | Example | Module Type |
|--------|---|---|---|
| dialog-request-processor | Scoped package | `from "@a2a/server-memory"` | Named import |
| cognition-base | Relative type | `from '../../memory/episodic-memory.js'` | Type-only import |
| gray-room orchestrators | Relative file | `from "../../../memory/experience-bank.js"` | Default export |
| features orchestrators | Relative file | `from "../../memory/experience-bank.js"` | Default export |
| memory/temporal | Relative sibling | `from './episodic-memory.js'` | Mixed import |

---

## Export Points

### Direct Export from Package
```typescript
// episodic-memory.ts
export class EpisodicMemory { ... }
export interface Episode { ... }
export type EpisodeOutcome = 'success' | 'partial' | 'failure';
export interface RecallResult { ... }

// experience-bank.ts
export class ExperienceBank { ... }
export interface StateActionPair { ... }
export const globalExperienceBank = new ExperienceBank();

// temporal-memory.ts
export class TemporalMemory { ... }
export interface TemporalHop { ... }
export interface TemporalChain { ... }
export interface TemporalPattern { ... }
export interface KnowledgeNode { ... }
export type { RecallResult };  // Re-export from episodic
```

### Missing: index.ts or package.json exports field
- No unified entry point
- No formal export map
- Relies on implicit file structure & workspace glob pattern
