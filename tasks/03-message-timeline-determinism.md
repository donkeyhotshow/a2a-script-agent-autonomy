# Task 03: Deterministic Message Timeline

## Atomic update action
Introduce one deterministic timeline builder with explicit source order: `history -> execute -> step-messages -> client-result`.

## Reason
Message reconstruction relied on implicit heuristics and mixed ordering, causing inconsistent UI chronology.

## Affected files
- `a2a-client/vite-plugin-a2a/routes/utils/message-timeline.js`
- `a2a-client/vite-plugin-a2a/routes/utils/session-projection-dto.js`

## Validation checklist
- Duplicate entries are deduplicated by `step + role + content`.
- Output includes stable `seq` numbering.
- Timeline source is visible (`source`) for debugging and tests.
