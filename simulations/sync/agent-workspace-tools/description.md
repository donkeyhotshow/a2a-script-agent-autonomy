# agent-workspace-tools

Protocol goldens for workspace tools implemented in **`a2a-server/src/actions/handlers/`** (`grep-search.ts`, `file-operations.ts` `executeFileExists`, `edit-patch.ts`, `run-script.ts`) and surfaced as single-key **`execute`** on invoke responses.

`received.json` matches **`buildWebExecute`** (`web-execute-dto.js` / `web-execute-dto.ts`): client-only keys stripped; `message` + `attachments` for the Web UI.

## Execute key → golden step mapping

| Execute key | Sync golden step(s) | Notes |
|-------------|---------------------|-------|
| `grep-search` | `agent-workspace-tools/1` | No LLM |
| `file-exists` | `agent-workspace-tools/2` | No LLM |
| `edit-patch` | `agent-workspace-tools/3` | No LLM |
| `run-script` | `agent-workspace-tools/4` | No LLM |
| `list-directory` | `agent-coder/4` | Has LLM snapshot |
| `read-file` | `agent-coder/4`, `agent-auto-ai/*` paths | Has LLM snapshot |
| `write-file` | `agent-coder/7`, `agent-coder-smart/6`, `agent-analyze/7-8`, `task-decomposition/6,8` | Has LLM snapshot |
| `execute-command` | `fix-laravel-namespaces-and-uses/5` | Has LLM snapshot |
