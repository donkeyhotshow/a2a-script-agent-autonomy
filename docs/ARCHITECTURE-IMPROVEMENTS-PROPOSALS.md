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
| Algorithm Mode | Local Local LLM upstream | Pattern match, edits | $ (free) |

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

**Implementation checklist** (plans: `prompts/system-collection/gray-room-implementation-plan.md`, `sequence-control.md`, `gray-room-overview.md`):

1. **Sequence schema** — [`docs/references/sequence-schema.json`](../references/sequence-schema.json); queue persistence belongs in **Client API** session storage / `context`, not a stateful `POST /api/v1/sequence` on a2a-server.
2. **step_complete** — `action-request-processor.ts` + `sequence-workbench.ts`: validate head, advance `headIndex`, history / `operationHistory`, `final_prediction` when pending ≤ 2 (UI + Client API persistence remain).
3. **Client UI** — Agent form + queue from `context.workbench.sections.sequence` (view/edit/reorder/blocked; optional `sequence_edits` until confirm).
4. **Client API** — `GET/PUT /api/a2a/sessions/:id/sequence` → `sequence.json` under session storage (`sessionRoutes.js`).
5. **Goldens** — `simulations/gray-room/` (queue init, step completion, look-ahead edits, final prediction); extend `simulations/SCHEMA.md` for sequence rules when ready.
6. **Validation** — `tests/direct-tests/validators/verify-gray-room-state.mjs`; root `npm run verify:gray-room -- <file.json>` (optional stdin).
7. **Prompts vs queue** — `step_prompts.md` templates are guidance; **`context.workbench.sections.sequence` is source of truth** for execution state.

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

## Category D: Technical debt, backlog notes, and doc links

### D1. Legacy payloads, sim gaps, Gray Room surface
**Status:** Partial (see tests and module docs)

- **Gray Room triggers:** resolution order and policy matrix — [`a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md); tests: `a2a-server/tests/gray-room-trigger.test.ts`.
- **Legacy result blobs:** `validateResultShape` in `transform-execute-validator.ts` — locked by `a2a-server/tests/unit/transform-execute-validator.test.ts`.
- **Async goldens:** `simulations/async/README.md` documents what sync goldens exclude (retries, loader timing); `promise-lifecycle` is the async shape baseline.
- **Still open:** narrow or remove `ActionRequest` legacy export where safe; full E2E for polling retries / `execute.wait`.

### D2. Process normalization — follow-ups
Cross-cutting items after gray-room + response transform `interrupt` passthrough:

- **Per-schema overrides:** if a schema adds its own `server-transforms-response.json` beside `*-request.md`, mirror the `interrupt` `copy` step there (today one root [`server-transforms-response.json`](../../a2a-server/prompts/transforms/server-transforms-response.json)).
- **compress_history:** gray-room may dual-write root `history` and `context.history`; `resolveHistoryLength` prefers root — see `a2a-server/tests/normalization-history-length.test.ts`.

A longer prioritized improvement table (P1–P4) lived in task history; key themes overlap **A2**, **B1**, **C1**, and ADR-0058 / multi-provider work.

### D3. Test coverage — vitest exclusions cleared
Previously excluded suites (`neurons-v2`, `rag-entity-integration`, `auth.middleware`, etc.) were reviewed; exclusions removed from `a2a-server/vitest.config.ts` where tests were restored, updated, or deleted. Full `npm run test` in `a2a-server` is the gate.

### D4. RAG package tests
`a2a-client/packages/rag/tests/rag.test.js` exercises indexer/searcher/chunk/BM25/hybrid/reranker/query-understanding (no placeholder `expect(true)` stubs).

### D5. Canonical methodology path
Indexed task methodology lives under [`archive/methodology/`](../../archive/methodology/) (not a root `methodology/` folder). Links from [`AGENTS.md`](../../AGENTS.md) point there.

### D6. NodeNext vs bundled UI imports
**Norm:** [`.cursor/rules/code-hierarchy.mdc`](../../.cursor/rules/code-hierarchy.mdc) — `a2a-server` / Node packages use **`.js` on relative imports**; `premium-ui` may use **`@/`** as resolved by Vite; `@a2a/execution` barrel + file-scanner chain uses `.js` relatives. [`AGENTS.md`](../../AGENTS.md) *Imports* row matches.

---