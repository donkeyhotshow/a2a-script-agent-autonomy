# Code Duplication: LLM Response Transform Pipeline

Server-side transform pipelines repeat the same initial operations (parse-json-from-md, copy context) across simulations.

**Locations:**
- `simulations/sync/dialog/3/server-transforms-response.json`
- `simulations/sync/task-decomposition/8/server-transforms-response.json`
- And many others (30+ files)

**Recommendation:** Extract boilerplate pipeline steps to templates.