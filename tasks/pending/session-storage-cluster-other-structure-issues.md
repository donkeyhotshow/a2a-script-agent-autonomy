# Session storage cluster: other-structure-issues

## Why
This task groups the same storage defect class across multiple sessions to fix root cause once.

## Sessions (1)
- `sess_1775611280997`

## Representative findings
- [ ] step 2: hasClientResult=true but client-result.json missing
- [ ] step 3: hasClientResult=true but client-result.json missing

## Acceptance
- [ ] Identify root cause in write/projection pipeline.
- [ ] Add/adjust sanitizer/normalizer/tests for this defect class.
- [ ] Re-run `npm run audit:session-storage` until this file is removed automatically.
