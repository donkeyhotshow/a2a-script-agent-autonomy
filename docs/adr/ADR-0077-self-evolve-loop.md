# ADR-0077: Self-Evolve Loop (ANUS Meta-Goal)

## Status
Approved

## Context
Tools occasionally fail due to model versioning or environment changes. A manual fix cycle is reactive and slow.

## Decision
Implement a autonomous "Self-Evolve" loop. When a tool's `failRate` exceeds a threshold (e.g., 30%), the system triggers a meta-task to analyze the failure root cause and propose a code change to the tool handler itself.

## Implementation
- `ToolTracker` monitors tool success/failure.
- `SkillEvolver` triggers a Gray Room session targeting the tool's implementation.

## Consequences
- Adaptive agent capabilities.
- Reduction in manual tool maintenance.
