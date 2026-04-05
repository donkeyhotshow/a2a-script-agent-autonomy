# types.js: DEBUG `console.warn` on session fallbacks

**File:** `a2a-client/packages/types/src/types.js`

**Problem:** Multiple `[Session] DEBUG:` `console.warn` paths when context/history/workbench use fallbacks — noisy in production and may indicate contract drift.

**Done when:** Gate behind dev flag, structured logger, or remove once data path is stable.
