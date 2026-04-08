# Code Duplication: getActiveAsyncWork function

The function `getActiveAsyncWork` is duplicated with similar logic but different implementations.

**Locations:**
- `a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js`: Lines 45-59 (more complex, checks recoverable failed states)
- `a2a-client/packages/vite-plugin/routes/handlers/step-handlers.js`: Lines 110-124 (simpler, only checks pending statuses)

**Recommendation:** Refactor to use a shared utility function or unify the logic.