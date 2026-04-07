# Mama — Gray room (horizontal interrupt chain)

**Meaning:** inside one server turn, the **gray room** runs a chain of response transforms and **interrupt handlers** (`compress_history`, `thinking`, `auto_read_file`, `auto_rag_page`, `clarify`, `algorithm_invoke` — see `gray-room-orchestrator.ts`). **Horizontal** = ordered list of those handlers, not the session step column.

**Mama** = validate a **saved** `context.workbench.slots.interruptTrace` (UA-S-01 in `interrupt-trace-contract.ts`) against an expected sequence. No Local LLM upstream.

## Validator

```bash
node tests/indirect-tests/gray-room/validate-gray-room-horizontal.mjs \
  --snapshot path/to/context-or-response.json \
  --spec path/to/mama-gray-horizontal.spec.json
```

Snapshot must expose `context` (or top-level `workbench` for `extractContext`).

## Spec

```json
{
  "expectedHandlerReasons": ["thinking", "auto_read_file"],
  "match": "exact"
}
```

- `match`: `exact` — handler reasons (only `interrupt_trace` entries with `kind === "interrupt_handler"`) must match 1:1 in order.
- `subsequence` — expected list appears in order, extra handlers allowed.

## Related

- Existing workbench/sequence checks: `npm run verify:gray-room -- <file>` (`tests/direct-tests/validators/verify-gray-room-state.mjs`) — focuses on **sequence** / predictions / `operationHistory`, not the interrupt handler column.

## Example

`fixtures/example-horizontal-snapshot.json` + `example-horizontal.spec.json` — run via `npm run test:indirect`.
