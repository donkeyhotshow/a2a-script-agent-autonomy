# Black Room (Algorithm Mode)

**Black Room** is the execution container for **algorithmic tasks** in the A2A workflow — deterministic operations that run on **local Ollama** instead of the paid API used by Gray Room's Prompt Mode.

| Room | Who Acts | LLM Type | Cost | Speed |
|------|----------|----------|------|-------|
| **Red Room** | Client auto-replies to tools | None | Free | Fastest |
| **Gray Room (Prompt Mode)** | Server runs strategy/reasoning | Paid API (GPT-4, Claude) | $$ | Medium |
| **Gray Room (Algorithm Mode)** | Server runs deterministic ops | Local Ollama | Free | Fast |
| **Black Room** | Dedicated algorithm executor | Local Ollama (specialized) | Free | Fast |

**Status:** Proposed per [ADR-0058](../../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md). Not yet implemented.

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
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Client    │────►│  Gray Room Orchestrator│────►│   Prompt Mode   │
└─────────────┘     │  (gray-room-orchestrator)│     │  (Paid API)     │
                    └───────────┬─────────────┘     └─────────────────┘
                                │
                    algorithm_invoke trigger
                                │
                                ▼
                    ┌─────────────────────┐     ┌─────────────────┐
                    │   Black Room Entry  │────►│ Algorithm Mode  │
                    │  (black-room-orchestrator)│  (Local Ollama) │
                    └───────────┬─────────────┘     └─────────────────┘
                                │
                                │ result
                                ▼
                    ┌─────────────────────┐
                    │  Return to Client   │
                    └─────────────────────┘
```

### Components

#### 1. BlackRoomOrchestrator

Entry point for algorithm mode. Mirrors `GrayRoomOrchestrator` interface but specialized for local execution.

```typescript
// a2a-server/src/services/core/black-room/black-room-orchestrator.ts
class BlackRoomOrchestrator {
  async executeAlgorithm(
    algorithmId: string,
    context: AlgorithmContext,
    data: AlgorithmData
  ): Promise<AlgorithmResult>
}
```

#### 2. Algorithm Registry

Maps `algorithmId` to execution definition:

```typescript
// a2a-server/src/services/core/black-room/algorithm-registry.ts
interface AlgorithmDefinition {
  id: string;
  version: string;
  model: string;                    // Ollama model name
  promptTemplate: string;         // Path to template
  outputSchema: JSONSchema;       // Expected output shape
  contextRequirements: string[];    // Required context slots
  maxTokens: number;
  temperature: number;            // Usually 0.0 for deterministic
}
```

#### 3. Context Management

Black Room maintains **session context** passed to Ollama via system prompt:

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

### Entry from Gray Room

When `interrupt.reason === "algorithm_invoke"`:

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
Primary invoke (Prompt Mode)
    │
    ├──► Pre-Spin 1: context_analysis
    │    Input: task description + available files
    │    Output: complexity_score, suggested_algorithms
    │
    ├──► Pre-Spin 2: algorithm_selection  
    │    Input: suggestions + cost constraints
    │    Output: final algorithm_id, context_profile
    │
    └──► Algorithm invoke → Black Room
```

Pre-spins are tracked in `context.workbench.slots.grayRoomPreSpins[]`.

## Configuration

### Environment Variables

```bash
# Enable Black Room
A2A_BLACK_ROOM_ENABLED=1

# Ollama connection
A2A_BLACK_ROOM_OLLAMA_URL=http://localhost:11435
A2A_BLACK_ROOM_DEFAULT_MODEL=llama3.1:8b

# Algorithm registry
A2A_ALGORITHM_REGISTRY_PATH=./prompts/algorithms/
A2A_ALGORITHM_AUTO_RELOAD=1  # Reload on file change (dev)

# Execution limits
A2A_BLACK_ROOM_MAX_TURNS=10
A2A_BLACK_ROOM_TIMEOUT_MS=30000
```

### Algorithm Template Structure

```
prompts/algorithms/
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
| Ollama unavailable | Retry once, then escalate |
| Output validation fails | Retry with temperature=0.2, then escalate |
| Timeout | Escalate immediately |
| Max turns exceeded | Return partial result with `truncated: true` |

## Comparison: Gray Room vs Black Room

| Aspect | Gray Room (Prompt) | Black Room (Algorithm) |
|--------|-------------------|------------------------|
| **Input** | Natural language | Structured algorithmId + data |
| **Model** | Paid API (GPT-4/Claude) | Local Ollama |
| **Cost** | Per-token | Free (local compute) |
| **Speed** | Network latency | Local inference |
| **Output** | Free-form | Schema-validated |
| **Use case** | Strategy, reasoning | Execution, pattern matching |
| **Interrupts** | compress, thinking, clarify | algorithm_invoke |

## Integration with Existing Systems

### Gray Room Orchestrator

Add `algorithm_invoke` handler to `applyInterrupt()`:

```typescript
// In gray-room-orchestrator.ts
 case 'algorithm_invoke': {
   const blackRoom = new BlackRoomOrchestrator();
   const result = await blackRoom.executeAlgorithm(
     interrupt.algorithmId,
     context,
     interrupt.data
   );
   return {
     continueLoop: result.continueLoop,
     context: mergeAlgorithmResult(context, result)
   };
 }
```

### AI Integration Proxy

Black Room may run as dedicated endpoint in `ai-integration`:

```
POST /api/black-room/execute
Body: { algorithmId, context, data }
```

Or directly via Ollama client in `a2a-server`.

## Observability

### Trace Events

Black Room adds events to `interruptTrace`:

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

### Metrics

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
- [GRAY-ROOM.md](./GRAY-ROOM.md) — Current Gray Room implementation
- [ai-integration/README.md](../../ai-integration/README.md) — Ollama integration
