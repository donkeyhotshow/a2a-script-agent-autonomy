# Simulation: phpunit-deprecations-v2

## Description

Test action "Search for deprecated PHPUnit methods" - detecting deprecated methods in PHPUnit tests.

## Workflow (NEW FORMAT)

```
1. Client → Server: { "task": "знайти застарілі PHPUnit методи" }
           ↓
2. Server → Client: { "context": {...}, "execute": { "form": { "choices": [...] } } }
           ↓
3. Client → Server: { "context": {...}, "result": { "choice": "phpunit-deprecations" } }
           ↓
4. Server → Client: { "context": {...}, "execute": { "script": {...} } }
           ↓
5. Client → Server: { "context": {...}, "result": { "scan-phpunit": {...} } }
           ↓
6. Server → Client: { "context": {...}, "execute": { "script": {...} } }
           ↓
... (repeat for detect-deprecations, generate-deprecations-report)
           ↓
Final: Server → Client: { "context": {...}, "result": {...} }
```

## Sub-actions (steps)

1. **scan-phpunit** - scanning PHPUnit tests
2. **detect-deprecations** - detecting deprecated methods
3. **generate-deprecations-report** - generating report

## Expected results

- Server returns `execute.form` with choices for action selection
- Client responds with `result.choice`
- Each step returns `execute.script` for execution
- Client responds with action-key result format (e.g., `result: { "scan-phpunit": {...} }`)
- Final step returns `result` with the report

## Format Notes

- Uses canonical format from `simulations/SCHEMA.md`
- Request: `{ "task": "..." }` → `{ "context": {...}, "result": { "choice": "..." } }` →
  `{ "context": {...}, "result": { "action-key": {...} } }`
- Response: `execute.form` for choices → `execute.script` for steps → `result` for final
- Uses action-key shape for results (e.g., `"scan-phpunit": { "files": [...] }`)
