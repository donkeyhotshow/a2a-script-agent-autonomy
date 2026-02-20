# H1: Dev-project data sources

**Index:** [README.md](README.md) | **Dev project:** [DEV_PROJECT.json](../../DEV_PROJECT.json) | **Challenges:** [websitestore-challenges.md](../websitestore-challenges.md)

Data obtainable through the client when the dev project (websitestore) is added to the workspace. Use for building request payloads and for the double hack.

---

## 1. Project list

| Source | How | Data |
|--------|-----|------|
| **.a2a-client/projects.json** | File in repo root (where client runs) | `{ "projects": [ { "id", "name", "path" } ] }` |
| **GET /api/a2a/projects** | Vite dev server (plugin) | Same. CWD = workspace root. |

**Dev project path:** From [DEV_PROJECT.json](../../DEV_PROJECT.json): `path` = `C:\workspace\domain-platform\websitestore.com.ua` (or local equivalent). Add as project in client so `path` is available for context.

---

## 2. Project data (index, files)

| Endpoint | Method | Returns |
|----------|--------|---------|
| **GET /api/a2a/projects/:id/data** | GET | `{ index: {}, files: [] }`. Index from project `/.a2a/index/rag-files.json` if present. |

Requires project to be in `projects.json` with `id`. Index is built by client (RAG/fulltext indexer) in project's `.a2a/index`. If not indexed yet, `index` is `{}`, `files` `[]`.

---

## 3. File content

| Endpoint | Method | Returns |
|----------|--------|---------|
| **GET /api/a2a/projects/:id/files/:filePath** | GET | Raw file content. `filePath` = relative path (e.g. `app/Models/User.php`). |

Use to build `codeBlocks` for POST /requests without reading from disk in the hack script. Path must be within project (safePath check in plugin).

---

## 4. Architectural features

Not exposed by Vite plugin. Available in client **agent**:

- **Package:** `a2a-client/packages/agent`
- **Function:** `detectArchitecturalFeaturesLight(projectPath, fsApi)` in `architectural-features.js`
- **Returns:** `string[]` (e.g. "Laravel", "FormRequest", "Services расположены в app/Domain/…").

To use in hacks: run from Node (e.g. small script in a2a-client or repo root) that reads project path from DEV_PROJECT.json, calls detector, outputs JSON. Or set `architectural_features` manually from [websitestore-challenges.md](../websitestore-challenges.md).

---

## 5. Sessions (optional)

- **GET /api/a2a/projects/:id/sessions** — list sessions
- **GET/PUT/DELETE /api/a2a/projects/:id/sessions/:sessionId** — load/update/delete session

Sessions live in `projectPath/.a2a/sessions/*.json`. Can be used to replay or extend a conversation in a hack.

---

## Summary for hacks

| Need | Source |
|------|--------|
| project_path | DEV_PROJECT.json or GET /api/a2a/projects |
| architectural_features | Agent detector (script) or manual from challenges doc |
| codeBlocks | GET /api/a2a/projects/:id/files/:path for each path |
| index (file list / search) | GET /api/a2a/projects/:id/data → index |
