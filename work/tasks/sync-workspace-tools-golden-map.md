# Sync simulations: `agent-workspace-tools` vs handler surface

## Fact

`simulations/sync/agent-workspace-tools/` has **4** steps covering:

| Step | `execute` key   |
|------|-----------------|
| 1    | `grep-search`   |
| 2    | `file-exists`   |
| 3    | `edit-patch`    |
| 4    | `run-script`    |

Other workspace-style keys appear **elsewhere** in sync (not in this sim), e.g. `list-directory` (`agent-auto-ai/4`), `read-file` / `write-file` (many agent-coder paths), `execute-command` (`fix-laravel-namespaces-and-uses/5`).

There is **no** single golden suite that maps 1:1 to all handlers under `a2a-server/src/actions/handlers/` for **Web DTO** projection (`received.json`).

## Done when

- [ ] Add steps (or extend this sim) for **`list-directory`** + **`read-file`** at minimum with correct `received.json` attachments, **or** publish a short matrix in `agent-workspace-tools/description.md`: which sync step is canonical for each execute key + DTO field.
- [ ] Re-run `npm run sim:lint -- --all` after fixture changes.
