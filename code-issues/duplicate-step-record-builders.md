# Code Duplication: Step record building functions

Functions for building step records have similar logic for constructing payloads from server responses.

**Locations:**
- `buildStepRecord` in `a2a-client/packages/vite-plugin/routes/utils/builders.js`: Lines 45-54
- `buildStepRecordFromPromise` in `a2a-client/packages/vite-plugin/routes/handlers/step-handlers.js`: Lines 72-99

Both handle merging context and execute/result data, but with different parameter handling.

**Recommendation:** Extract common logic to a shared utility.