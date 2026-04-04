# Mama — Red room (vertical dialog flow)

**Meaning here:** user-visible **session column** — step 1 → step 2 → … Each step is validated **offline** against captured JSON (e.g. `a2a-client/storage/sessions/sess_*/N/server-response.json`) and a manifest. This is **Mama** because the **production** is Papa (live Client API); Mama only **checks** shapes and the ordered story.

**Note:** `tests/direct-tests/e2e-dialog-test.js` also uses the string `red-room` for **client-side tool stub** (`read-file` /next) — a narrower meaning. This folder is the **methodology** sense: full dialog vertical.

## Validator

```bash
node tests/indirect-tests/red-room/validate-red-room-dialog-vertical.mjs \
  --base path/to/session/or/fixture-root \
  --spec path/to/mama-red-vertical.spec.json
```

## Spec (`steps[]`)

Each step may set `readFrom` (path relative to `--base`) or `stepFolder` defaulting to `1`, `2`, … with `server-response.json`.

`expect`:

| Field | Meaning |
|--------|--------|
| `executeSingleKey` | `execute` has exactly one action key |
| `executeAction` | that key equals value (e.g. `form`) |
| `formChoicesMin` | `execute.form.choices.length` ≥ N |
| `executionAction` | `context.execution.action` |
| `executionStep` | `context.execution.step` |

## Fixtures

| Spec | Base | Purpose |
|------|------|---------|
| `example-vertical.spec.json` | `fixtures/example-vertical/` | Self-check: toy router → form |
| `sim-agent-vertical.spec.json` | repo root | **Realistic:** simulations/sync/agent golden (router → agent dialog) |

All run via `npm run test:indirect` (`run-all.mjs`).
