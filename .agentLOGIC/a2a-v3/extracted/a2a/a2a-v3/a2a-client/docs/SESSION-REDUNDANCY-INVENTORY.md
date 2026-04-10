# Session Redundancy Inventory (RF-C-01)

Date: 2026-03-27
Owner: a2a-client code cleanup
Scope: session-related modules in `vite-plugin-a2a/routes/utils`, route flows, and web session runtime

## Module Inventory

| Area | Module | Responsibility | Current role |
|---|---|---|---|
| Session DTO projection | `vite-plugin-a2a/routes/utils/session-projection-dto.js` | Public session shape, async meta attach, stage derivation | Keep as boundary owner |
| Session stage classification | `vite-plugin-a2a/routes/utils/session-stage-machine.js` | Coarse stage (`routing`, `dialog-input`, `agent-tool-loop`, `awaiting-async`, `completed`) | Keep |
| Session UI view model | `vite-plugin-a2a/routes/utils/session-view-model.js` | UI kind classification (`choice-form`, `input-form`, `message+form`, `message-only`, `completed`) | Keep |
| Timeline from step artifacts | `vite-plugin-a2a/routes/utils/message-timeline.js` | Build deterministic merged timeline from persisted step files | Keep |
| Timeline from canonical history | `vite-plugin-a2a/routes/utils/history-projection.js` | Normalize `context.history` to deterministic timeline records | Keep |
| Session runtime state | `web/js/session-data.js` | Browser store core and runtime message normalization | Keep |

## Overlap Map (same/near-same responsibility in 2+ places)

1) System-role detection overlap
- `message-timeline.js` contains `detectSystemRole(item)` based on metadata.
- `history-projection.js` contains `detectSystemRole(entry)` with near-identical metadata checks.
- `session-data.js` has extra role fallback logic (`metadata.source === 'system'`).
- Candidate: move to one shared helper (`normalize-message-role`) and consume in all three modules.

2) Session state classification overlap
- `session-stage-machine.js` classifies coarse execution stage.
- `session-view-model.js` independently classifies UI state kind from similar signals (`execute.form`, completion markers).
- Candidate: keep both layers, but remove duplicated heuristics by using stage machine output as one input to view-model classification.

3) Async pending detection overlap
- `session-projection-dto.js` computes active async metadata through step promise scan.
- Async flow route also performs active-promise lookup for polling path.
- Candidate: expose one canonical `findActiveSessionPromise()` helper and reuse in DTO + async routes.

4) Message projection overlap
- `history-projection.js` projects canonical `context.history`.
- `message-timeline.js` projects merged timeline from step artifacts (`history`, `execute`, `messages`, `client-result`).
- Candidate: keep both (different inputs), but align shared normalization primitives (`toText`, role normalization, dedupe key strategy).

## Marked Removal/Consolidation Candidates

| Candidate | Why overlap | Safe action |
|---|---|---|
| Duplicate `detectSystemRole` implementations | Same metadata-to-role normalization is re-implemented | Extract one helper and delete local copies |
| Duplicate text coercion helpers (`toText` variants) | Same value-to-string fallback appears in multiple files | Extract one helper and delete local copies |
| Parallel async active-work scanners | Similar scan logic exists in multiple session paths | Use single helper; keep route-specific response shaping only |
| Independent completion heuristics in view-model and stage machine | Two classifiers infer completion/state from overlapping signals | Stage machine as source for stage; view-model only maps stage to UI kind |

## Keep Decisions (not removal)

- `session-view-model.js` and `session-stage-machine.js` both stay: they serve different abstraction levels (UI kind vs transport stage).
- `history-projection.js` and `message-timeline.js` both stay: they consume different source contracts (canonical context vs persisted step artifacts).
- `session-projection-dto.js` remains the public DTO boundary for routes.

## Verification Notes

- Inventory created for all session-related utility modules and runtime session store.
- Overlap points identified with explicit module-level evidence.
- Consolidation candidates marked with safe, behavior-preserving actions.
