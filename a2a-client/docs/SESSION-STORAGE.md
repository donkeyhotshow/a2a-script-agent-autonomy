# Session Storage (Current Contract)

Sessions are step-based filesystem artifacts under:

`a2a-client/storage/sessions/{sessionId}/{step}/`

## Step Files

- `client-result.json` — user/tool result captured for the step
- `request-to-server.json` — payload sent to A2A server
- `server-promise.json` — temporary async state (`promiseId`, status)
- `server-response.json` — finalized execute/context/result
- `messages.json` — step message slice

## Source Of Truth

- The highest step containing `server-response.json` is the effective current state.
- Session state is rebuilt from step files, not a root session file.

## Async Rule

- If invoke returns async, write `server-promise.json` first.
- On completion, write `server-response.json` in the same step folder.

## Red-Room Rule

- Auto tool execution still follows the same artifact contract.
- Tool output must be persisted as `client-result.json` before the next invoke.

## Validation Targets

- No missing files for finalized steps
- No stale `server-promise.json` after completion
- Reconstructed session matches latest finalized step
