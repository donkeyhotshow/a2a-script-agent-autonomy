# Code Duplication Issue 1

**File:** a2a-client/packages/web/js/daemons/dialog-promise-poll.js

**Lines:** 69-83 and 84-90

**Description:** Duplicated conditional logic for promise status checks. Both blocks use similar ternary operators to evaluate promise resolution/failure based on result properties (e.g., result.completed, result.status), with nearly identical condition structures for determining completion or error states.

**Action Required:** Extract the duplicated logic into a helper function to avoid redundancy.