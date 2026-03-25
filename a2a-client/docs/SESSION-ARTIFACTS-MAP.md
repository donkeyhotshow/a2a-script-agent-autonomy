# Simulation filenames vs runtime session files

| Golden (per step) | Runtime (`a2a-client/storage/sessions/...`) | Role |
|-------------------|-----------------------------------------------|------|
| `request.json` | `request-to-server.json` | Payload sent to A2A `POST /api/v1/invoke` |
| `response.json` | `server-response.json` | Final server `execute` / `context` / `result` for the step |
| `client.json` | `client-result.json` | User input or choice before the step is sent upstream |
| `received.json` | (derived in tests / Web DTO) | What the Web UI sees after `buildWebExecute` (not a separate runtime file) |

See also `simulations/SCHEMA.md` (eight-file pipeline) and `AGENTS.md` (Session Storage Format).
