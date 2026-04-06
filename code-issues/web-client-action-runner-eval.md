# Web client action runner: `eval` / `new Function`

**Files:** `a2a-client/packages/web/js/client-action-runner.js` and `a2a-client/packages/web/web/js/client-action-runner.js` (duplicated paths — keep in sync)

**Problem:** Dynamic `eval('(' + e.data.code + ')')(input)` and `new Function('return ' + script.code)()` execute server-supplied strings. Comments mention Web Worker isolation, but risk depends on message origin and DTO trust.

**Done when:** Document threat model; restrict sources; or replace with a safe interpreter / allowlist-only scripts.
