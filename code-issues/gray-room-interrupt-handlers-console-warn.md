# Gray room interrupt handlers: `console.warn` instead of logger

**Files:** `a2a-server/src/services/core/request-processor/gray-room-interrupt-handlers/thinking.ts`, `compress-history.ts`

**Problem:** Errors use `console.warn('[GrayRoom:…]')` while the rest of the server uses the `logger` module — inconsistent levels, no correlation fields, harder to filter in production.

**Done when:** `logger.warn` with structured metadata; same pattern for other gray-room handlers if any remain.
