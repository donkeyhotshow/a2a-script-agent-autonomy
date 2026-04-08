# Code Duplication: lastAssistantMessageFromContext function

The function `lastAssistantMessageFromContext` is duplicated exactly in two files.

**Locations:**
- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`: Lines 166-179
- `a2a-server/src/services/core/request-processor/agent-spurious-request-normalize.ts`: Lines 15-30

**Recommendation:** Extract to a shared utility module to eliminate duplication.