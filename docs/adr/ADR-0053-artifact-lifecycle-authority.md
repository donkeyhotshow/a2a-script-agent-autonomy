# ADR-0053: Artifact Lifecycle Authority

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** High | **Complexity:** Medium | **Risk:** Low
- **Estimated Effort:** 1 week | **Priority:** P0
- **Deciders:** Backend team lead

---

## Context

Artifacts were being created in multiple places with inconsistent naming, no lifecycle tracking, and no validation. This caused:

1. UI referencing artifact IDs that didn't exist (stale references).
2. Duplicate artifacts for the same event (two CONFIDENCE_TRACEs for one routing point).
3. No TTL policy — ArtifactStore grew unbounded.
4. No authority model — any component could write any artifact type.

## Decision

Establish a **canonical authority model** for artifacts:

### Rules

1. **Single writer per type**: Each artifact type has exactly one canonical writer (see Canonical_Artifacts_v2.md).
2. **Append-only store**: No mutations after creation. Superseded artifacts get a `superseded_by` field.
3. **Mandatory base fields**: `artifact_id`, `artifact_type`, `session_id`, `turn_id`, `created_at`, `schema_version` — enforced by `ArtifactValidator`.
4. **TTL policy**: Every artifact type has a declared retention period. `ArtifactStore` runs nightly cleanup.
5. **Consumption tracking**: Downstream artifacts record `consumed_by[]` on the source artifact.

### ArtifactStore API

```typescript
class ArtifactStore {
  // Write — validates schema, rejects if writer is not canonical owner
  async write<T extends ArtifactBase>(artifact: T, writer: ComponentId): Promise<void>

  // Read — by artifact_id (exact)
  async get(artifact_id: string): Promise<ArtifactBase | null>

  // Query — by dimensions
  async query(params: ArtifactQuery): Promise<ArtifactBase[]>

  // Mark consumed
  async markConsumed(source_id: string, by_id: string): Promise<void>

  // Archive — called on session end
  async archiveSession(session_id: string): Promise<void>
}
```

## Consequences

### Positive
- Eliminates orphaned UI claims
- Provides full audit trail
- Enables cross-session pattern analysis via QUERYABLE artifacts

### Negative
- Requires registering component ID as part of write call
- Schema validation adds ~1ms per write

---
