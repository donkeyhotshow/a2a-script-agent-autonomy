# Offline LLM / invoke shape codes

**Source:** [`tests/direct-tests/validators/lib/check-llm-execute-shape.mjs`](../../tests/direct-tests/validators/lib/check-llm-execute-shape.mjs)

Used by:

- [`scan-promise-bodies.mjs`](../../tests/direct-tests/validators/scan-promise-bodies.mjs) — `ai-integration/proxy_logs/promises/*/body.md`
- [`scan-session-responses.mjs`](../../tests/direct-tests/validators/scan-session-responses.mjs) — `a2a-client/storage/sessions/**/server-response.json`

Flags: `--skip-if-missing`, `--strict` (exit 1 on any issue).

## Codes

| Code | Detail (summary) |
|------|------------------|
| `TOP_LEVEL_MESSAGE_WITH_TOOL` | Assistant line at top level while `execute` has tool keys — move to `execute.message` |
| `DUPLICATE_TOP_AND_EXECUTE_MESSAGE` | Same string in `message` and `execute.message` |
| `TOP_AND_EXECUTE_MESSAGE_MISMATCH` | Different strings with tools present |
| `EXECUTE_MESSAGE_ONLY` | `execute` only has `message` — need `form` or tool |

**Tool keys set:** `TOOL_KEYS` in the same module (`rag-search`, `read-file`, `script`, `dialog`, …).
