# Architecture Improvements and Capability Extensions

Systematic proposals for A2A system evolution.

---

## Category A: Core Architecture

### A1. Multi-Agent Orchestrator (Planned - ADR-0038)
**Status:** Backlog  
**Current:** Single orchestrator with `dialog`/`agent`/`task-decomposition`  
**Proposal:** Native multi-agent delegation

**Implementation:**
```typescript
// context.workbench.sections.agents
type AgentDelegation = {
  agents: Array<{
    id: string;           // "researcher", "coder", "reviewer"
    role: string;         // Human-readable role
    model: string;        // "gpt-4", "qwen3:8b"
    capabilities: string[]; // ["read-file", "rag-search"]
    state: "idle" | "working" | "blocked";
  }>;
  delegations: Array<{
    from: string;
    to: string;
    task: string;
    status: "pending" | "active" | "complete";
  }>;
};
```

**Use Case:** Research agent gathers context → delegates to coder → reviewer validates.

---

### A2. Black Room / Gray Room Split (ADR-0058)
**Status:** Proposed  
**Current:** All Gray Room substeps use paid LLM  
**Proposal:** Algorithm Mode for deterministic tasks

| Mode | LLM | Use Case | Cost |
|------|-----|----------|------|
| Prompt Mode | Paid API (Z.AI, GPT-4) | Strategy, reasoning | $$ |
| Algorithm Mode | Local Ollama | Pattern match, edits | $ (free) |

**Trigger:** `interrupt.reason: "algorithm_invoke"`

**Algorithm Numbers:**
- `ctx-gather-*` — Context gathering
- `edit-apply-*` — File edits
- `pattern-match-*` — Code detection
- `validate-*` — Post-action validation

**Benefits:** 70% cost reduction for algorithmic workloads.

---

## Category B: Gray Room Evolution

### B1. Sequence Workbench (In Progress)
**Status:** Partial implementation  
**Proposal:** Task queue with look-ahead

**Schema:** `docs/references/sequence-schema.json`

```json
{
  "context": {
    "workbench": {
      "sections": {
        "sequence": {
          "steps": [
            {"id": "s1", "title": "Analyze imports", "status": "complete"},
            {"id": "s2", "title": "Fix vue imports", "status": "active"},
            {"id": "s3", "title": "Validate changes", "status": "pending"}
          ],
          "headIndex": 1,
          "predictions": [
            {"trigger": "backlog<=2", "predicted": "final-validation"}
          ]
        }
      }
    }
  }
}
```

**UI:** SequenceInspector.vue with drag-drop reordering.

---

### B2. Predictive Step Generation
**Status:** Proposal  
**Current:** Fixed queue  
**Proposal:** Auto-generate steps when backlog < 3

```typescript
// When context.workbench.sections.sequence.steps.length <= 2
// Trigger prediction spin in Gray Room

interface PredictedStep {
  title: string;
  goal: string;
  confidence: number;  // 0.0 - 1.0
  rationale: string; // Why this step
  exitCriteria: string[];
}
```

**Benefits:** Self-adjusting task plans.

---

### B3. Gray Room Visualization
**Status:** Proposal  
**Current:** Hidden server-side processing  
**Proposal:** Expose Gray Room chain to UI

```json
{
  "execute": {
    "form": {
      "type": "gray-room-trace",
      "spins": [
        {"handler": "compress_history", "duration": 120, "status": "done"},
        {"handler": "thinking", "duration": 890, "status": "done"},
        {"handler": "auto_rag_page", "duration": 340, "status": "active"}
      ]
    }
  }
}
```

**UI:** Progress bar with spin details, cancel button per spin.

---

### B4. Interrupt Recovery Patterns
**Status:** Proposal  
**Current:** `clarify` only  
**Proposal:** Multiple interrupt types

```typescript
type InterruptReason =
  | "clarify"           // Ask user (current)
  | "confirm_dangerous" // Confirm destructive action
  | "missing_context"   // Need more files/info
  | "algorithm_invoke"  // ADR-0058
  | "escalate_to_human"; // Operator takeover

interface InterruptDirective {
  reason: InterruptReason;
  severity: "info" | "warning" | "critical";
  autoResume: boolean;  // Can resume without user?
  timeout: number;      // Seconds until auto-action
}
```

---

## Category C: Developer Experience

### C1. Schema-First Contract Testing
**Status:** Proposal  
**Current:** Simulations as goldens  
**Proposal:** JSON Schema validation at runtime

```typescript
// request.schema.ts
const RequestSchema = z.object({
  context: z.object({
    execution: z.object({
      action: z.enum(["dialog", "agent", "script", "router"]),
      step: z.string(),
      status: z.enum(["pending", "active", "complete", "failed"])
    })
  })
});

// Runtime validation on every request/response
validateSchema(request, RequestSchema);
```

**Benefits:** Fail fast on contract violations.

---