# agent-workspace-tools

Protocol goldens for workspace tools implemented in **`a2a-server/src/actions/handlers/`** (`grep-search.ts`, `file-operations.ts` `executeFileExists`, `edit-patch.ts`, `run-script.ts`) and surfaced as single-key **`execute`** on invoke responses.

`received.json` matches **`buildWebExecute`** (`web-execute-dto.js` / `web-execute-dto.ts`): client-only keys stripped; `message` + `attachments` for the Web UI.

## Execute key → golden step mapping

Canonical allowlist: `VALID_EXECUTE_KEYS` in [`a2a-server/src/actions/action-validator.ts`](../../../a2a-server/src/actions/action-validator.ts) (`form`, `script`, `read-file`, `write-file`, `execute-command`, `message`, `rag-search`, `list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`, `dialog`).

| Execute key | Sync golden step(s) | Notes |
|-------------|---------------------|-------|
| `form` | `agent/1`, `dialog/*`, `script/*`, … | Router / gates |
| `script` | `script/3+`, `fix-vue-imports/*`, domain actions | Client `result.script` |
| `grep-search` | `agent-workspace-tools/1` | No LLM |
| `file-exists` | `agent-workspace-tools/2` | No LLM |
| `edit-patch` | `agent-workspace-tools/3` | No LLM |
| `run-script` | `agent-workspace-tools/4`, `script/5` | No LLM / scripted |
| `list-directory` | `agent-coder/4`, `agent/8` | Often + LLM |
| `read-file` | `agent-coder/4`, `agent-auto-ai/*`, `agent/9` | Often + LLM |
| `write-file` | `agent-coder/7`, `agent-coder-smart/6`, `agent-analyze/7-8`, `task-decomposition/6,8`, `agent/10` | Often + LLM |
| `execute-command` | `fix-laravel-namespaces-and-uses/5`, `script/8` | Shell |
| `message` | `script/9`, summaries | Auto text |
| `rag-search` | `agent-coder/4`, `agent/5` | RAG |
| `dialog` | Reserved / registry | Rare in sync goldens |
