## QA “Golden Standard” Alignment Tasks

This `tasks/` folder tracks small, incremental code changes (server + client) to keep runtime payload shapes aligned with the **golden simulation contract** in `simulations/`.

### How tasks are meant to be used
1. Pick the next `TASK-xxxx-*` item.
2. Implement the minimal code change(s) described in that file.
3. Verify with at least:
   - `npm run sim:lint -- --all`
   - `npm --prefix a2a-server run sim:validate -- --all`
4. If you change any protocol-related helpers/DTOs, also add/adjust unit tests under `a2a-client/tests`.

### Conventions
- Each task file targets one invariant and one narrow change area.
- Tasks prefer runtime guards / mapping fixes over “fixing the fixtures” (fixtures are the source of truth).

