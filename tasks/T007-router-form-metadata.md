# T007 — Router `execute.form.choices` metadata

**Golden:** [`AGENTS.md`](../AGENTS.md) legacy golden rules — each `choices[]` item should have `description`; [`CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md) § `execute.form`.

**Code:** Server transforms or static router responses that emit `execute.form.choices`.

**Goal:** Every choice in router goldens has a non-empty `description` where the UI shows subtitles; server production payloads match that quality bar.

**Acceptance:**
- Audit router-related sims (`agent/`, `agent-coder/`, etc.): fill missing `description` in **goldens first**, then align server strings.
- `sim:lint` / `sim:validate` for touched sims pass.
