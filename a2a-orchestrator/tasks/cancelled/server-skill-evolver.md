# Cancelled Task: SkillEvolver on Server

**Status:** CANCELLED  
**Cancellation date:** 2026-04-18  
**Reason:** Self-evolution of skills is an orchestrator/plugin-runtime concern, not a
server concern.

---

## What was built

`a2a-server/packages/server/src/skill-evolver.ts`

- `class SkillEvolver` — detects failure patterns from recent error logs, generates an
  `EvolutionProposal { skill_name, failure_pattern, proposed_fix, confidence }`, and writes
  results as artifacts via `globalArtifactStore`.
- Uses a pattern-matching heuristic (`detectFailurePattern`) and produces a proposal struct.
- Constructor registers itself as an artifact writer (`'SKILL_EVOLUTION'`).

## Why this is wrong

1. **Skill evolution is a plugin runtime concern**, not a server transport concern. The
   server should not contain logic that analyzes its own skills and proposes code changes.
2. Coupling skill self-improvement to the HTTP server means every server restart loses
   accumulated failure pattern knowledge (unless externalized — which it isn't).
3. `EvolutionProposal` is consumed by nothing in the server — it writes artifacts that are
   never read back. The loop is incomplete.
4. The confidence calculation (`Math.min(0.9, occurrences / 3)`) is a heuristic that
   belongs in an agent reasoning layer, not in transport code.

## Where this should live

| Concern | Correct layer |
|---------|--------------|
| Failure pattern detection | `a2a-orchestrator/src/plugin-runtime/plugin-health-monitor.ts` |
| Evolution proposal generation | Agent tool / LLM-assisted, orchestrator post-turn hook |
| Proposal storage | Session memory or `a2a-client/storage/` via client, not server artifacts |
| Applying the proposal | Plugin manager hot-reload after human review |

## Files affected

- `a2a-server/packages/server/src/skill-evolver.ts`
- `a2a-server/packages/server/src/skill-evolver.d.ts` (compiled)
- `a2a-server/packages/server/src/skill-evolver.js` (compiled)

## What can be reused

- `detectFailurePattern()` heuristic and the `EvolutionProposal` type are good ideas —
  port them to `a2a-orchestrator/src/plugin-runtime/plugin-health-monitor.ts`.
- The confidence scoring formula is a reasonable starting point.

## Correct future implementation

```typescript
// a2a-orchestrator/src/plugin-runtime/plugin-health-monitor.ts
export interface EvolutionProposal { ... }

export class PluginHealthMonitor {
  recordFailure(pluginId: string, error: string): void { ... }
  getProposals(): EvolutionProposal[] { ... }
}
```

Proposals are surfaced in the operator dashboard (client-side) and applied manually or
via the plugin manager after review — never auto-deployed through a server HTTP route.
