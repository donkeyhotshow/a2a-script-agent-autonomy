# Code Duplication: isAgentSchemaName function

The function `isAgentSchemaName` is duplicated exactly in two files.

**Locations:**
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`: Lines 84-86
- `a2a-server/src/services/core/request-processor/agent-spurious-request-normalize.ts`: Lines 11-13

**Recommendation:** Extract to a shared utility module to eliminate duplication.