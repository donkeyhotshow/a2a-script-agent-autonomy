# Black Room (Algorithm Mode)

**Black Room** is the execution container for **algorithmic tasks** in the A2A workflow — deterministic operations that run on **local Local LLM upstream** instead of the paid API used by Gray Room's Prompt Mode.

| Room | Who Acts | LLM Type | Cost | Speed |
|------|----------|----------|------|-------|
| **Red Room** | Client auto-replies to tools | None | Free | Fastest |
| **Gray Room (Prompt Mode)** | Server runs strategy/reasoning | Paid API (GPT-4, Claude) | $$ | Medium |
| **Gray Room (Algorithm Mode)** | Server runs deterministic ops | Local Local LLM upstream | Free | Fast |
| **Black Room** | Dedicated algorithm executor | Local Local LLM upstream (specialized) | Free | Fast |

**Status:** Proposed per [ADR-0058](../../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md). Not yet implemented.

**Location:** `a2a-ai-hub` proxy layer (this document). Gray Room lives in `a2a-server`.

## Concept

Black Room solves the **cost/latency problem** of running all Gray Room interrupts through expensive LLM calls. When the task is algorithmic (pattern matching, context gathering, structured edits), it should run on **local infrastructure** using pre-defined or fine-tuned models.

### Key Principle: Algorithm by Number

Instead of prompting "please find all imports in these files," the system calls:

```json
{
  "interrupt": {
    "reason": "algorithm_invoke",
    "algorithmId": "ctx-gather-v2",
    "data": { "targetFiles": ["src/**/*.ts"] }
  }
}
```

The `algorithmId` maps to a **known execution pattern** in Black Room — no natural language parsing required.

## Architecture

### Data Flow

```
┌─────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│   Client    │────►│  Gray Room Orchestrator │────►│   Prompt Mode   │
└─────────────┘     │    (in a2a-server)        │     │  (Paid API)     │
                    └───────────┬─────────────┘     └─────────────────┘
                                │
                    algorithm_invoke trigger
                                │
                                ▼
                    ┌─────────────────────────┐     ┌─────────────────┐
                    │   Black Room Entry      │────►│ Algorithm Mode  │
                    │    (in a2a-ai-hub)  │     │  (Local Local LLM upstream) │
                    └───────────┬─────────────┘     └─────────────────┘
                                │
                                │ result
                                ▼
                    ┌─────────────────────────┐
                    │  Return to Client       │
                    │  (via a2a-server)       │
                    └─────────────────────────┘
```

### Boundary: a2a-ai-hub vs a2a-server

| Component | Module | Responsibility |
|-----------|--------|--------------|
| **Gray Room Orchestrator** | `a2a-server` | Detects `algorithm_invoke`, routes to Black Room |
| **Black Room Orchestrator** | `a2a-ai-hub` | Executes algorithms on local Local LLM upstream |
| **Algorithm Registry** | `a2a-ai-hub` | Stores and serves algorithm definitions |
| **Local LLM upstream Client** | `a2a-ai-hub` | Direct communication with Local LLM upstream (port 11435) |

### Components

#### 1. BlackRoomOrchestrator (in a2a-ai-hub)

Entry point for algorithm mode. Resides in `a2a-ai-hub` as it directly manages Local LLM upstream communication.

```typescript
// a2a-ai-hub/src/black-room/black-room-orchestrator.ts (proposed)
class BlackRoomOrchestrator {
  async executeAlgorithm(
    algorithmId: string,
    context: AlgorithmContext,
    data: AlgorithmData
  ): Promise<AlgorithmResult>
}
```

#### 2. Algorithm Registry (in a2a-ai-hub)

Maps `algorithmId` to execution definition:

```typescript
// a2a-ai-hub/src/black-room/algorithm-registry.ts (proposed)
interface AlgorithmDefinition {
  id: string;
  version: string;
  model: string;                    // Local LLM upstream model name
  promptTemplate: string;           // Path to template
  outputSchema: JSONSchema;         // Expected output shape
  contextRequirements: string[];    // Required context slots
  maxTokens: number;
  temperature: number;              // Usually 0.0 for deterministic
}
```

#### 3. Context Management

Black Room maintains **session context** passed to Local LLM upstream via system prompt:

```json
{
  "context.workbench.slots.blackRoom": {
    "sessionId": "sess_abc123",
    "algorithmHistory": [
      {
        "algorithmId": "ctx-gather-v2",
        "executedAt": "2026-04-03T10:00:00Z",
        "resultHash": "sha256:abc...",
        "durationMs": 1500
      }
    ],
    "sharedState": {
      "gatheredFiles": ["src/main.ts"],
      "detectedPatterns": [],
      "editQueue": []
    }
  }
}
```

### Algorithm Categories

| Prefix | Purpose | Example |
|--------|---------|---------|
| `ctx-gather-*` | Context gathering | `ctx-gather-v2` — collect files matching pattern |
| `edit-apply-*` | Apply edits | `edit-apply-ts-imports` — fix TypeScript imports |
| `pattern-match-*` | Code detection | `pattern-match-dead-code` — find unused exports |
| `validate-*` | Post-action checks | `validate-imports` — verify imports resolve |
| `compress-*` | Data compression | `compress-history-ctx` — condense for prompt |

## Interrupt Protocol

### Entry from Gray Room (a2a-server)

When `interrupt.reason === "algorithm_invoke"`, Gray Room calls Black Room via internal API:

```typescript
// In a2a-server gray-room-orchestrator.ts
const blackRoomResult = await fetch('http://localhost:11434/api/black-room/execute', {
  method: 'POST',
  body: JSON.stringify({
    algorithmId: interrupt.algorithmId,
    context: currentContext,
    data: interrupt.data
  })
});
```

### Request Shape

```json
{
  "interrupt": {
    "reason": "algorithm_invoke",
    "algorithmId": "ctx-gather-v2",
    "contextProfile": "compress_then_search",
    "maxTurns": 3,
    "data": {
      "targetFiles": ["src/**/*.ts"],
      "operation": "gather-imports",
      "excludeTests": true
    },
    "when": {
      "historyMinLength": 1
    }
  }
}
```

### Black Room Response

Algorithm result merges into context:

```json
{
  "result": {
    "algorithm_invoke": {
      "algorithmId": "ctx-gather-v2",
      "status": "completed",
      "output": {
        "files": ["src/main.ts", "src/lib.ts"],
        "imports": [...]
      },
      "metrics": {
        "durationMs": 1500,
        "tokensIn": 500,
        "tokensOut": 200
      }
    }
  }
}
```

## Pre-Invocation Spins

For complex transformations, Gray Room may run **analysis spins** before algorithm selection:

```
Primary invoke (Prompt Mode in a2a-server)
    │
    ├──► Pre-Spin 1: context_analysis
    │    Input: task description + available files
    │    Output: complexity_score, suggested_algorithms
    │
    ├──► Pre-Spin 2: algorithm_selection  
    │    Input: suggestions + cost constraints
    │    Output: final algorithm_id, context_profile
    │
    └──► Algorithm invoke → Black Room (a2a-ai-hub)
```

Pre-spins are tracked in `context.workbench.slots.grayRoomPreSpins[]`.

## Configuration

### Environment Variables (in a2a-ai-hub)

```bash
# Enable Black Room
A2A_BLACK_ROOM_ENABLED=1

# Local LLM upstream connection (a2a-ai-hub already connects here)
A2A_BLACK_ROOM_COMPAT_LLM_URL=http://localhost:11435
A2A_BLACK_ROOM_DEFAULT_MODEL=llama3.1:8b

# Algorithm registry path (relative to a2a-ai-hub/)
A2A_ALGORITHM_REGISTRY_PATH=./algorithms/
A2A_ALGORITHM_AUTO_RELOAD=1  # Reload on file change (dev)

# Execution limits
A2A_BLACK_ROOM_MAX_TURNS=10
A2A_BLACK_ROOM_TIMEOUT_MS=30000
```

### Algorithm Template Structure (in a2a-ai-hub/algorithms/)

```
a2a-ai-hub/algorithms/
├── ctx-gather-v2/
│   ├── algorithm.json          # AlgorithmDefinition
│   ├── system.md              # System prompt template
│   ├── user.md                # User prompt template  
│   └── output.schema.json     # Output validation schema
├── edit-apply-ts-imports/
│   └── ...
└── registry.json              # Master registry index
```

## Fallback Policy

When Black Room fails, escalate to Gray Room Prompt Mode:

| Failure | Fallback Action |
|---------|-----------------|
| Algorithm not found | Log error, escalate to Prompt Mode |
| Local LLM upstream unavailable | Retry once, then escalate |
| Output validation fails | Retry with temperature=0.2, then escalate |
| Timeout | Escalate immediately |
| Max turns exceeded | Return partial result with `truncated: true` |

## Comparison: Gray Room vs Black Room

| Aspect | Gray Room (a2a-server) | Black Room (a2a-ai-hub) |
|--------|------------------------|------------------------------|
| **Location** | `a2a-server` | `a2a-ai-hub` |
| **Input** | Natural language | Structured algorithmId + data |
| **Model** | Paid API (GPT-4/Claude) | Local Local LLM upstream |
| **Cost** | Per-token | Free (local compute) |
| **Speed** | Network latency | Local inference |
| **Output** | Free-form | Schema-validated |
| **Use case** | Strategy, reasoning | Execution, pattern matching |
| **Interrupts** | compress, thinking, clarify | algorithm_invoke |

## Integration with Existing Systems

### a2a-server Gray Room Orchestrator

Add `algorithm_invoke` handler to `applyInterrupt()`:

```typescript
// In a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts
 case 'algorithm_invoke': {
   // Call Black Room in a2a-ai-hub
   const blackRoomUrl = process.env.AI_INTEGRATION_URL || 'http://localhost:11434';
   const result = await fetch(`${blackRoomUrl}/api/black-room/execute`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       algorithmId: interrupt.algorithmId,
       context: ctx,
       data: interrupt.data
     })
   }).then(r => r.json());
   
   return {
     continueLoop: result.continueLoop,
     context: mergeAlgorithmResult(ctx, result)
   };
 }
```

### a2a-ai-hub API Endpoint (proposed)

Black Room runs as dedicated endpoint in `a2a-ai-hub`:

```
POST /api/black-room/execute
Content-Type: application/json

Body: { 
  "algorithmId": "ctx-gather-v2",
  "context": { ... },
  "data": { ... }
}
```

Implementation location: `a2a-ai-hub/proxy/black_room_handler.py` or `a2a-ai-hub/src/black-room/` for Node.js.

## Observability

### Trace Events

Black Room adds events to `interruptTrace` (stored in a2a-server, displayed in client):

```json
{
  "type": "black_room_start",
  "algorithmId": "ctx-gather-v2",
  "timestamp": "2026-04-03T10:00:00Z"
}
```

```json
{
  "type": "black_room_complete",
  "algorithmId": "ctx-gather-v2",
  "durationMs": 1500,
  "tokenCount": 700,
  "status": "completed"
}
```

### Metrics (in a2a-ai-hub)

- `black_room_executions_total` — Counter by algorithmId
- `black_room_duration_seconds` — Histogram of execution time
- `black_room_fallbacks_total` — Counter of Prompt Mode fallbacks

## Future Work

1. **Algorithm fine-tuning** — LoRA adapters per algorithm family
2. **Algorithm chaining** — Output of algo-1 feeds input to algo-2
3. **Cache layer** — Hash-based result caching for deterministic algorithms
4. **Algorithm marketplace** — Shared registry of community algorithms

## See Also

- [ADR-0058](../../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md) — Decision record
- [a2a-server/docs/GRAY-ROOM.md](../../a2a-server/docs/GRAY-ROOM.md) — Gray Room implementation (in a2a-server)
- [a2a-ai-hub/README.md](../README.md) — AI Integration module overview
- [a2a-ai-hub/docs/api-reference/PROXY_API.md](./api-reference/PROXY_API.md) — Proxy API details
