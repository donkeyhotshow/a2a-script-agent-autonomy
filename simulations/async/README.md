# Async simulations

Goldens under `simulations/async/` use the **same step bundle** as sync (`client.json` → `request.json` → … → `response.json` → `received.json`). See [`../SCHEMA.md`](../SCHEMA.md): transport-only fields such as top-level `promiseId` are stripped during `sim:validate` normalization, so fixtures document **invoke-shaped** snapshots merged into session state, not the raw `{ promiseId }` ack.

**Intentionally not modeled in async goldens:** HTTP retry backoff, duplicate `/async` polls, and UI `execute.wait` / loader timing — cover those with Client API or web integration tests if needed (`a2a-client/docs/LOADER-BEHAVIOR.md`).

## Available

| Simulation | Purpose |
|------------|---------|
| `promise-lifecycle` | Step 1: in-flight / poll semantics (`execution.step: processing`, `execute.message`). Step 2: terminal completed snapshot (`execution.status: completed`). Step 3: terminal **failed** snapshot (`execution.step` / `execution.status`: `failed`) after processing. |

## Structure

```
{simulation-name}/
├── description.md
├── {step}/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json   # recommended (no-LLM: copy pipeline)
│   ├── request.md                       # optional mirror of request.json (prompt audit / sim:check-md); see promise-lifecycle
│   ├── response.md                      # optional mirror of response.json
│   ├── server-transforms-response.json  # optional, with response.md
│   ├── response.json
│   └── received.json
```

Optional extra JSON in a step (e.g. documenting poll payloads) is allowed if valid JSON; only canonical names are validated by `sim:validate`.

## Running

Same as sync — scope by **step path** (from repo root):

```bash
npm run sim:lint -- --sim async/promise-lifecycle/1
npm run sim:validate -- --sim async/promise-lifecycle/1
npm run sim:validate -- --all
```
