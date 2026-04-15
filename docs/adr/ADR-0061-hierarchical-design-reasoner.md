# ADR-0061: Hierarchical Design Reasoner (Two-Phase UI Generation)

- **Status:** Accepted
- **Date:** 2026-04-04
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Medium | **Risk:** Low
- **Estimated Effort:** 3 days | **Priority:** P1
- **Deciders:** Autonomy team

---

## Context

Single-pass LLM prompts generate functionally correct Vue/React code but produce
"dry", generic, bootstrap-level aesthetics.  To achieve premium design quality
(glassmorphism, tailored typography, harmonious HSL palettes, fluid micro-
interactions), the agent needs a dedicated aesthetic-reasoning step before any
DOM nodes are written.

## Decision

Implement the **Hierarchical Design Reasoner** as a two-phase pipeline:

### Phase 1 — `DesignReasoner` (Lead Designer LLM)

A new service at `a2a-server/src/services/evaluation/design-reasoner.ts` that:

1. Accepts the original UI requirement as input.
2. Calls the AI Hub with a *design-focused* system prompt that instructs the
   model to produce a `DESIGN_MANIFEST` JSON document covering:
   - `colorPalette` — HSL tokens (primary, secondary, accent, neutral, surface, text)
   - `typography` — font families, sizes, weights, line heights
   - `spacing` — base unit and scale multipliers
   - `shadows` — shadow tokens (sm / md / lg / xl)
   - `radii` — border-radius tokens
   - `animations` — named motion curves and durations
   - `glassmorphism` — backdrop-blur and frosted-glass opacity values
   - `rationale` — paragraph explaining the aesthetic intent
3. Stores the manifest as a `DESIGN_MANIFEST` artifact (single writer:
   `design-reasoner`).
4. Returns `DesignManifest` (the manifest JSON + artifact id) to the caller.

### Phase 2 — Coder LLM (existing)

The existing Coder agent is unchanged.  Callers concatenate the `DESIGN_MANIFEST`
content (CSS variables block) to the Coder prompt as immutable context before
generating component code.

### Graceful degradation

If the AI Hub is unavailable or returns an unstructured response,
`DesignReasoner` falls back to a deterministic `DEFAULT_MANIFEST` so the Coder
phase always receives a valid design token set.

## Consequences

### Pros
- Drastically elevates generated aesthetic quality without changing the Coder
  contract.
- Separates design reasoning from logic programming; each LLM call focuses on
  one domain.
- `DESIGN_MANIFEST` artifacts are reusable across sessions (same project → same
  design language).

### Cons
- Doubles the LLM request count for UI tasks (one design call + one code call).
- Increases token usage; callers should cache `DESIGN_MANIFEST` when the
  requirement is unchanged.

## Implementation Notes

| Concern | Decision |
|---------|----------|
| Single-writer rule | `design-reasoner` is the sole writer for `DESIGN_MANIFEST` |
| AI Hub endpoint | `DESIGN_AI_HUB_URL` env (default: `AI_HUB_URL ?? 'http://localhost:11434'`) |
| Design model | `DESIGN_MODEL` env (default: same as general model) |
| Fallback | Deterministic `DEFAULT_MANIFEST` — neutral greys + Inter font + 4-pt scale |
| Artifact TTL | 30 days — reused across sessions for same project |

## References

- ADR-0060 — Sight-Driven Verification (VisionTester validates Phase 2 output)
- ADR-0065 — LLM-as-Judge (same AI Hub proxy pattern)
- `a2a-server/src/services/evaluation/design-reasoner.ts`
