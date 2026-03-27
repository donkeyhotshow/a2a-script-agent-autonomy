# RF-C-04: Compatibility Window for Legacy Bridges

## Problem
Need to keep temporary bridges max 1 release cycle, then remove legacy aliases/wrappers.

## Solution
1. Audit all legacy bridges/aliases
2. Set deprecation dates
3. Remove after 1 release cycle
4. Document in DEV_STATE.md

## Where
- Files: Various in a2a-client/

## Verification
Check for deprecated markers in code and remove after review.
