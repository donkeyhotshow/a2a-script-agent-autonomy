# Golden Simulations Checklist (Client Web DTO)

Use this checklist for every simulation step that has both `response.json` and `received.json`.

## Goal

Keep Web DTO `execute` sanitized and web-safe while preserving canonical server contract in `response.json`.

## Checklist

- [ ] `response.json.execute` keeps canonical single action-key shape (`read-file`, `rag-search`, `form`, etc.).
- [ ] `received.json.execute` does not expose raw tool-action keys (`read-file`, `write-file`, `rag-search`, `execute-command`, `script`, `list-directory`, `grep-search`, `file-exists`, `edit-patch`, `run-script`).
- [ ] `received.json.execute` contains only web-safe fields: `message`, optional `llmMessage`, optional `form`, optional `attachments`.
- [ ] If tool actions were present in `response.json`, `received.json.execute.attachments` mirrors only UI hints (`readFiles`, `writtenFiles`, `ragQuery`, `shellCommand`, `pendingClientAction`, and related fields).
- [ ] `received.json.result` (if present) remains action-key shaped and does not leak unsanitized execute payloads.
- [ ] Any `form` shown in `received.json.execute.form` matches intended UI step (routing choice/input/completion gate).
- [ ] If async metadata exists, `asyncPending`/`promiseStatus` semantics stay intact (no regression while sanitizing `execute`).

## Quick Verification Commands

Run from repo root:

```bash
npm run sim:lint -- --all --json
npm run sim:validate -- --all --json
```

Targeted checks:

```bash
rg -n "\"execute\"\\s*:\\s*\\{[^}]*\"(read-file|write-file|rag-search|execute-command|script|list-directory|grep-search|file-exists|edit-patch|run-script)\"" -g "**/received.json" simulations
rg -n "\"execute\"\\s*:\\s*\\{[^}]*\"(message|llmMessage|form|attachments)\"" -g "**/received.json" simulations
```

First command should return no unsafe `received.json` hits.
