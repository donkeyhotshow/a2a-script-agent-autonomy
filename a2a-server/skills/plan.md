---
name: plan
description: Design an implementation plan before coding
---

# Plan Skill

## When to use

Use when the user asks to implement a new feature, refactor something, or the task is complex enough to need a design phase before writing code.

## Workflow

1. **Understand requirements** — What is the desired behavior? What are the constraints?
2. **Explore the codebase** — Find relevant files, understand existing patterns. Read before writing.
3. **Identify affected components** — Which files/modules will change? What are the boundaries?
4. **Design the solution** — Describe the approach. Consider ≥2 alternatives if the problem is non-trivial.
5. **Write the plan** — Document: files to create/modify, interfaces, key logic, test scenarios.
6. **Estimate risk** — What could go wrong? Are there breaking changes?

## Plan document format

```markdown
# Plan: <feature name>

## Goal
<One sentence description of what this achieves>

## Approach
<Chosen approach and brief rationale>

## Files
### [NEW] path/to/new-file.ts
- Purpose: ...
- Key exports: ...

### [MODIFY] path/to/existing.ts
- Changes: ...

## Key decisions
- Why X over Y: ...

## Test plan
- Unit: ...
- Integration: ...

## Risks
- Risk: ... Mitigation: ...
```

## Key principles

- **Read before writing** — never propose changes without reading the affected code first
- **Propose, don't implement** — in plan mode, output the plan only; no code changes
- **One change at a time** — if the scope is large, split into phases
- **Consider rollback** — for risky changes, include a rollback strategy
