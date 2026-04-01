# ADR-0055: Evidence-First UI Architecture

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Low | **Risk:** Low
- **Estimated Effort:** 1 week | **Priority:** P1
- **Deciders:** Frontend team lead

---

## Context

Chat messages and Task Flow steps displayed claims ("Confidence: 0.82", "Loop detected") without linking to the backing evidence. Operators had no way to verify or inspect these claims.

## Decision

Enforce **Evidence-First architecture** in all UI components:

### Rules

1. **No orphaned claims**: Any UI assertion about system state MUST link to an `artifact_id`.
2. **Evidence Chips**: Inline `<EvidenceChip artifact_id="..." />` components render next to claims.
3. **Stale detection**: If `artifact.created_at + staleness_ttl < now`, chip renders as `[stale]`.
4. **Decision context**: Every HumanLayer approval dialog renders the triggering artifact(s) before the approve/reject button.

### Component Contract

```typescript
interface EvidenceChip {
  artifact_id: string;
  artifact_type: ArtifactType;
  label: string;               // human-readable summary
  severity?: 'info' | 'warning' | 'critical';
  is_stale: boolean;           // derived from created_at + type TTL
}
```

### Staleness TTLs by artifact type

| Artifact | Stale After |
|---|---|
| `CONFIDENCE_TRACE` | Next routing point for same task_run |
| `WAITING_STATE` | `expires_at` |
| `LOOP_SIGNAL` | Session end |
| `DRYRUN_DELTA` | Next task run start |
| `MEMORY_INFLUENCE` | Next enrichment cycle |
| `VALIDATION_SUMMARY` | Next validation cycle |

## Consequences

### Positive
- Operators can trace every claim to source evidence
- Reduces trust deficit common in autonomous systems
- Enables async audit: replay any decision from artifacts alone

### Negative
- Adds artifact_id linking requirement to all new UI components
- EvidenceChip needs ArtifactStore query on render (mitigated by cache)

---
