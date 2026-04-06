# Dialog flow: CognitionBase uses empty LessonStore / PatternStore

**File:** `a2a-server/src/services/core/request-processor/dialog-request-processor.ts` (around `injectPriors` call)

**Problem:** `LessonStore` and `PatternStore` are passed as `{ query: async () => [] }` — priors never load from real stores.

**Done when:** Wire real implementations or feature-flag off injection until stores exist.
