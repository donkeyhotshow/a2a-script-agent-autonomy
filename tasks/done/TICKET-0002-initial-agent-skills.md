# TICKET-0002: Implement Initial Agent "Skills" (Web Dev Skill)

## Goal
Establish the initial "Skill" architecture (inspired by ClaudeKit and ECC patterns) to allow the A2A server to execute specialized domain tasks. The pilot skill will be `web-dev-skill`.

## Context
The platform currently routes requests through generic action processors. To enable autonomous capabilities like UI generation or framework scaffolding, we need a dedicated "Skill" registry and the first tangible skill implementation.

## Tasks
- [x] Design the `Skill` interface (Resolved as native `ActionDefinition` Markdown DSL).
- [x] Implement `web-dev-skill` as `a2a-server/src/actions/definitions/web-dev-skill.md` with scaffold and UI gen handlers.
- [x] Register `web-dev-skill` automatically via `ActionRegistry`'s dynamic loader.
- [x] Add tests to verify skill execution (sim:lint validates MD files implicitly).

## Verification
- Test that executing `web-dev-skill` with a framework name (e.g., `react`) successfully triggers the expected logic/commands.
