# Session storage cluster: session-index-step-drift

## Why
This task groups the same storage defect class across multiple sessions to fix root cause once.

## Sessions (1)
- `sess_1775611280997`

## Representative findings
- [ ] session-index step 2 has no directory
- [ ] session-index step 3 has no directory
- [ ] step 2: hasServerResponse=true but server-response.json missing
- [ ] step 3: hasServerResponse=true but server-response.json missing

## Acceptance
- [ ] Identify root cause in write/projection pipeline.
- [ ] Add/adjust sanitizer/normalizer/tests for this defect class.
- [ ] Re-run `npm run audit:session-storage` until this file is removed automatically.
