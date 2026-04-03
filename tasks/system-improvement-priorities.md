# SYS — System improvement priorities (Self-Upgrade)

**Status:** backlog  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row SYS)  
**Self-Upgrade process:** Run the daemon script `monitor-and-process-tasks.js` or manually conduct dialog via API with the agent for system analysis and improvement. See [GLOSSARY.md](../GLOSSARY.md) for full definition.  
**How to run the full prompt index + API loop:** [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md) · [`prompts-to-agent-mode/ONE-PIPELINE.md`](../prompts-to-agent-mode/ONE-PIPELINE.md)

## Priorities (ordered)

1. **Contract clarity** — Keep `sim:quality` green; substeps included in validate; SCHEMA / SERVER-CONTRACT match tooling.
2. **One HTTP story for sessions** — Client API (`/api/a2a/sessions`, `/next`, `/async`) as normative driver; document server `:3000` invoke as implementation detail ([`AGENTS.md`](../AGENTS.md)).
3. **Script ↔ agent parity** — S14 matrix + `sync/script` goldens + optional live replay ([`tasks/script-dialog-agent-response-parity.md`](script-dialog-agent-response-parity.md)). **Multi-provider model:** invoke `llmModel` / `context.llmModel` + Client API session `llmModel` + proxy `/api/tags` (`provider` per row) — ADR-0059.
4. **Markdown drift** — More `request.md` / `response.md` in sync (S11); optional strict CI check later.
5. **Gray room** — Interrupt substeps documented and validated; thinking / trace slots remain separate from user workbench sections.

## Module touchpoints

| Module | Focus |
|--------|--------|
| `a2a-server` | Transforms, execute handlers, `VALID_EXECUTE_KEYS` |
| `a2a-client` | Web DTO, session storage, Vite plugin routes |
| `simulations/sync` | Goldens, `sim-lint` / `sim-validate` |
