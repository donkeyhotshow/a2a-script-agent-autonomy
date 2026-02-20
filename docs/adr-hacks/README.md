# ADR Hacks — dev project + direct API + index search

**Index:** [docs/README.md](../README.md) | **Dev project:** [DEV_PROJECT.json](../../DEV_PROJECT.json) | **Protocol:** [a2a-client/docs/requirements.md](../../a2a-client/docs/requirements.md)

Hacks use data from the client (when dev project is added) and/or direct `POST /api/v1/requests`. Legacy etalon A/B/D/E: [archive/](archive/).

---

## New hacks

| # | Title | Data source | Purpose |
|---|-------|-------------|---------|
| [H1](dev-project-data-sources.md) | Dev-project data sources | Client (projects, index, files) | What the client can provide when websitestore is added |
| [H2](direct-request-websitestore.md) | Direct request — websitestore | DEV_PROJECT.json + manual payload | POST /requests with real project_path and tasks |
| [H3](double-hack-project-and-direct.md) | Double hack: project + direct | Client API + POST /requests | Get project/data from client, then fire direct request with that context |
| [H4](index-search-checks.md) | Index / codebase search checks | Client index or server queryIndex | Verify search over codebase index (fulltext, RAG, hybrid) |

---

## Client data (when project added)

- **Projects:** `.a2a-client/projects.json` or `GET /api/a2a/projects` (Vite plugin). Gives `id`, `name`, `path`.
- **Project data:** `GET /api/a2a/projects/:id/data` → `{ index, files }` (from project `.a2a/index`, e.g. rag-files.json).
- **File content:** `GET /api/a2a/projects/:id/files/:path` — file body for codeBlocks.
- **Architectural features:** From client agent: `detectArchitecturalFeaturesLight(projectPath, fs)` (packages/agent). Not exposed by plugin; can be run in CLI or baked into payload.

---

## process-input (etalon in archive)

```bash
npx tsx a2a-server/scripts/process-input.ts [input.md] [output.md]
# default: docs/adr-hacks/archive/raw/etalon-D-request.md → output/etalon-D-result.md
```
