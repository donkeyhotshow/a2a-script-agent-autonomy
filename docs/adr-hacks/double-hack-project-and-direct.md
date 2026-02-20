# H3: Double hack — project data + direct request

**Index:** [README.md](README.md) | **Data sources:** [dev-project-data-sources.md](dev-project-data-sources.md) | **Direct:** [direct-request-websitestore.md](direct-request-websitestore.md)

Combine: (1) get project path and optionally file content from the **client** (projects API, file API), (2) send a **direct** POST to `/api/v1/requests` with that context. Validates that data obtained via client is valid for the server.

---

## Flow

1. **Resolve project**
   - Read `.a2a-client/projects.json` or `GET /api/a2a/projects`, find project whose `path` matches DEV_PROJECT (websitestore). Get `id` and `path`.
2. **Optional: load files for codeBlocks**
   - For 2–3 paths (e.g. a controller, a FormRequest), call `GET /api/a2a/projects/:id/files/:path`. Build `codeBlocks: [{ path, content }]`.
3. **Optional: architectural_features**
   - Run agent detector script for `path` or set manually (e.g. `["Laravel", "FormRequest", "Inertia"]`).
4. **Build context**
   - `context.version`, `context.project_path` = resolved path, `context.new_task` = e.g. `["Add validation"]`, `context.architectural_features` if available.
5. **POST /api/v1/requests**
   - Body: `{ context, codeBlocks }` (codeBlocks optional). Same as [H2](direct-request-websitestore.md).
6. **Poll result**
   - `GET /api/v1/requests/:promiseId/result`. Check `result.context.request_files`, `activated_neuron_ids`, status.

---

## Script sketch (Node or PowerShell)

- Read projects from `GET http://localhost:5173/api/a2a/projects` (Vite must be running with project in workspace).
- Pick project by path containing `websitestore`.
- Fetch 1–2 files via `GET /api/a2a/projects/:id/files/app/Http/Requests/SomeRequest.php`.
- POST to `http://localhost:3000/api/v1/requests` with `context.project_path` = that path, `codeBlocks` = fetched files.
- Poll server for result; log `request_files` and `activated_neuron_ids`.

---

## Pass criteria

- Client project path and server `project_path` match; server accepts and processes.
- If codeBlocks from client file API are sent, neurons that match content (e.g. FormRequest) fire and `request_files` appear in result.
