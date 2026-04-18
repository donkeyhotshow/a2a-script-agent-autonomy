# Cancelled Task: FrontendAssembler on Server

**Status:** CANCELLED  
**Cancellation date:** 2026-04-18  
**Reason:** Presentation and UI planning logic does not belong on the server.

---

## What was built

`a2a-server/packages/server/src/frontend-assembler.ts`

- `class FrontendAssembler` — takes a `Graph` (entity dependency graph) and produces an
  `AssemblyPlan { order: string[], recommendations: string[] }` using topological sort.
- Imported by `cognitive-engine.ts` for agent planning purposes.

## Why this is wrong

1. **"Frontend" assembly planning is a presentation concern** — deciding which components
   to implement and in what order is a view-level or orchestrator-level concern, not a
   server transport concern.
2. The server's job is to accept requests, route them to LLM/execution, and return results.
   Generating implementation recommendations belongs in the orchestrator or agent reasoning
   layer, not in the HTTP server package.
3. Having a class named `FrontendAssembler` inside the server package sends a confusing
   signal to future developers about what the server is responsible for.

## Where this should live

| Concern | Correct layer |
|---------|--------------|
| Topological sort of component dependencies | `a2a-orchestrator/src/planning/dependency-sorter.ts` |
| Assembly plan for agent turns | Orchestrator pre-processing, injected into LLM context |
| UI rendering order | Client-side (`a2a-client`), driven by data from orchestrator |

## Files affected

- `a2a-server/packages/server/src/frontend-assembler.ts`
- `a2a-server/packages/server/src/cognitive-engine.ts` (imports FrontendAssembler)

## What can be reused

The topological sort algorithm (`visit()` DFS with visited-set) is correct and can be
ported directly to `a2a-orchestrator/src/planning/dependency-sorter.ts`.

## Correct future implementation

```typescript
// a2a-orchestrator/src/planning/dependency-sorter.ts
export interface AssemblyPlan {
  order: string[];           // entity IDs in dependency order
  recommendations: string[];
}

export function sortByDependency(graph: Graph): AssemblyPlan { ... }
```

Called by the orchestrator before constructing the agent's context, not by the server.
