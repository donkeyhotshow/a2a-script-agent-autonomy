# agent-workspace-tools

Protocol goldens for workspace tools implemented in **`a2a-server/src/actions/handlers/`** (`grep-search.ts`, `file-operations.ts` `executeFileExists`, `edit-patch.ts`, `run-script.ts`) and surfaced as single-key **`execute`** on invoke responses.

`received.json` matches **`buildWebExecute`** (`web-execute-dto.js` / `web-execute-dto.ts`): client-only keys stripped; `message` + `attachments` for the Web UI.
