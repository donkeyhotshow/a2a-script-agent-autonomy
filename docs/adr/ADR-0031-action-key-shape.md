# ADR-0031: Action-Key Shape as Protocol Contract

Status: accepted
Date: 2026-03-29

## Context

The A2A protocol and simulation contract require a strict shape for tool interaction payloads.
- xecute must be a single-key object in the wire protocol (e.g. { \ form\: {...} }, { \read-file\: {...} }).
- esult must also be a single-key object (or {} when no action result is available).

This is enforced in alidator.js and in request/response adapters for both real runtime and golden simulation validator checks.

## Problem

Some sources have been polluted with ANSI escape/control characters, causing invalid rendered text such as:
- xecute rendered as \x1bexecute, ead-file rendered as \x1bead-file.
- orm rendered as \x0corm.
- references to alidator.js being split/truncated by hidden characters.

This breaking artifact makes the ADR unreadable and undermines the contract description.

## Decision

1. Maintain action-key shape as a protocol invariant:
   - xecute must contain exactly one top-level action key.
   - esult must contain at most one action key ({} allowed for no result) and the same key set as allowed by xecute actions.
2. Refuse inbound/outbound execute/result objects that contain hidden control characters (ASCII < 0x20) in key names or values that represent action keys.
3. Synchronize validator logic in alidator.js (and any alias helpers) with this ADR.
4. Keep documentation and ADR sources clean of ANSI sequences and non-printable control characters.

## Consequences

- Simulations and production paths will detect and reject invalid action-key shapes early.
- Golden simulation test files and module docs must be updated to match exactly and remain machine-readable, including xecute, esult, orm, ead-file, and alidator spelled correctly.
- This ADR helps the team avoid subtle serialization/parsing bugs in WebUI and server components.

## Notes

- This ADR is consistent with the existing AGENTS.md and GLOSSARY.md requirement: Action-Key Shape (ONE action per execute/result).
- The fix for this issue also includes checking text formatting in docs and running a line-ending sanitizer.
