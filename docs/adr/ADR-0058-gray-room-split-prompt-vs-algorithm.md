# ADR-0058: Gray Room Split — Prompt Mode vs Algorithm Mode (Black Room Integration)

- **Status:** proposed
- **Date:** 2026-04-03

## Context

Current Gray Room (`a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts`) runs all substeps through the **same** LLM path — whether the task requires high-level reasoning (natural language instructions) or deterministic algorithmic execution (context gathering, file edits, pattern matching).

This creates inefficiencies:
1. **Cost:** Every interrupt handler calls the main LLM, even for simple algorithmic tasks
2. **Latency:** Pattern-matching and file operations wait for full LLM round-trip
3. **Consistency:** Same model handles both "what to do" (strategy) and "how to do it" (execution)

## Decision

Introduce **two-mode Gray Room** with explicit split between:

| Mode | Purpose | LLM Type | Entry Trigger |
|------|---------|----------|---------------|
| **Prompt Mode** | Natural language instructions, strategy, reasoning | Paid API (high capability) | Primary agent request |
| **Algorithm Mode** | Deterministic execution, pattern matching, edits | Local Local LLM upstream (fast/cheap) | `interrupt.reason: "algorithm_invoke"` |

The **Black Room** (previously planned as `ai-integration` proxy loop) becomes the **execution container** for Algorithm Mode — a local Local LLM upstream instance with pre-loaded "algorithm numbers" (fine-tuned or prompted models for specific tasks).

## Architecture

### 1. Entry Flow

```
Client → Primary invoke (agent mode)
         │
         ▼
    ┌─────────────────┐
    │  Prompt Mode    │ ← Paid API (GPT-4, Claude, etc.)
    │  (Gray Room)    │   Natural language instructions
    │                 │   Output: algorithm_id + context_hash
    └────────┬────────┘
             │
             │ interrupt.reason: "algorithm_invoke"
             │ data: { algorithmId: "ctx-gather-v2", contextKey: "..." }
             ▼
    ┌─────────────────┐
    │ Algorithm Mode  │ ← Local Local LLM upstream (Black Room)
    │  (Black Room)   │   Deterministic execution
    │                 │   Historical context from slots
    └────────┬────────┘
             │
             ▼
    Return to client with final execute
```

### 2. Black Room (Algorithm Mode) Details

**Location:** `ai-integration` proxy layer or dedicated `black-room-orchestrator.ts`

**Algorithm Invocation Protocol:**
```json
{
  "interrupt": {
    "reason": "algorithm_invoke",
    "algorithmId": "ctx-gather-v2",
    "contextProfile": "compress_then_search",
    "maxTurns": 5,
    "data": {
      "targetFiles": ["src/**/*.ts"],
      "operation": "gather-imports"
    }
  }
}
```

**Algorithm Number System:**
- `ctx-gather-*` — Context gathering algorithms
- `edit-apply-*` — File edit algorithms  
- `pattern-match-*` — Code pattern detection
- `validate-*` — Post-action validation

Each algorithm is either:
- **Fine-tuned model** (LoRA adapter on Local LLM upstream)
- **Structured prompt template** with deterministic output schema
- **Hybrid:** Pattern regex + LLM for edge cases

### 3. Historical Context in Local LLM upstream

Black Room maintains **session-scoped context slots** passed to Local LLM upstream via system prompt:

```typescript
// context.workbench.slots.blackRoomContext
{
  "sessionId": "sess_xxx",
  "algorithmHistory": [
    { "algorithmId": "ctx-gather-v2", "timestamp": "...", "resultHash": "abc123" }
  ],
  "sharedContext": {
    "gatheredFiles": ["src/main.ts", "src/lib.ts"],
    "detectedPatterns": ["import-cycle", "unused-export"]
  }
}
```

Local LLM upstream receives this as structured system prompt, enabling **stateful algorithms** without round-trips to paid API.

### 4. Pre-Invocation Gray Room Spins

For complex transformations, Gray Room may run **multiple pre-processing spins** before main request:

```
Primary invoke
    │
    ├──► Spin 1: context_analysis (Prompt Mode)
    │    Output: complexity_score, suggested_algorithms[]
    │
    ├──► Spin 2: algorithm_selection (Prompt Mode)  
    │    Output: algorithm_id, context_profile
    │
    └──► Final: algorithm_invoke → Black Room
```

Each spin updates `context.workbench.slots.grayRoomPreSpins[]` with trace.

## Consequences

### Positive
- **Cost reduction:** Algorithmic tasks use local Local LLM upstream (~free) vs paid API
- **Speed:** Local inference for deterministic operations
- **Reliability:** Algorithms produce consistent, testable outputs
- **Separation of concerns:** Strategy (Prompt) vs Execution (Algorithm)

### Negative
- **Complexity:** Two orchestrators (Gray Room + Black Room)
- **Context sync:** Must maintain shared state between modes
- **Algorithm maintenance:** Need to version and test algorithm templates
- **Fallback required:** Black Room failures must escalate to Prompt Mode

## Implementation Notes

### New Files
- `a2a-server/src/services/core/black-room/black-room-orchestrator.ts`
- `a2a-server/src/services/core/black-room/algorithm-registry.ts`
- `prompts/algorithms/` — Algorithm prompt templates

### Modified Files
- `gray-room-orchestrator.ts` — Add `algorithm_invoke` handler
- `dialog-request-processor.ts` — Route to Black Room when triggered
- `types.ts` — Add `BlackRoomInterruptDirective`

### Environment Variables
```bash
# Black Room (Algorithm Mode)
A2A_BLACK_ROOM_ENABLED=1          # Enable algorithm mode
A2A_BLACK_ROOM_COMPAT_LLM_URL=http://localhost:11435
A2A_BLACK_ROOM_DEFAULT_MODEL=llama3.1:8b

# Algorithm registry
A2A_ALGORITHM_REGISTRY_PATH=./prompts/algorithms/
```

## Related

- [ADR-0029-server-interrupt-loop.md](./ADR-0029-server-interrupt-loop.md) — Original Gray Room
- [a2a-server/docs/GRAY-ROOM.md](../../a2a-server/docs/GRAY-ROOM.md) — Current implementation
- [ai-integration/docs/BLACK-ROOM.md](../../ai-integration/docs/BLACK-ROOM.md) — Algorithm mode details (in ai-integration)

## Open Questions

1. Should Black Room support `interrupt` recursion (algorithms calling other algorithms)?
2. How to version algorithm templates — git tags or runtime registry?
3. Fallback policy: always retry in Prompt Mode or fail fast?
