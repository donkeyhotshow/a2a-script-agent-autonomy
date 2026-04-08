# Session storage audit: sess_1775611280997

## Why
Session JSON structure has contract violations or suspicious shape drift; needs normalization and root-cause fix in client storage pipeline.

## Findings
- [ ] session-index step 2 has no directory
- [ ] session-index step 3 has no directory
- [ ] step 2: hasClientResult=true but client-result.json missing
- [ ] step 2: hasServerResponse=true but server-response.json missing
- [ ] step 3: hasClientResult=true but client-result.json missing
- [ ] step 3: hasServerResponse=true but server-response.json missing

## Evidence paths
- (no direct file evidence captured)

## Acceptance
- [ ] Reproduce each issue from live step artifacts.
- [ ] Fix write/projection path so new sessions do not produce the same issue.
- [ ] Validate by running `npm run audit:session-storage` until this file is removed automatically.
