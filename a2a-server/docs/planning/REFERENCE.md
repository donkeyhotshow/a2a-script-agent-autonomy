# Reference

## Simulation as the golden standard

Canonical simulations live at the **repository root**: [`simulations/`](../../../simulations/) (for example [`dialog`](../../../simulations/dialog/description.md), [`fix-vue-imports`](../../../simulations/fix-vue-imports/description.md), [`agent-auto-ai`](../../../simulations/agent-auto-ai/description.md), [`agent-coder`](../../../simulations/agent-coder/description.md)). Superseded fixtures may be moved under `archive/simulations/` at the repo root when maintainers archive them; that directory is optional and may be absent on a fresh checkout.

**Do not** duplicate simulation fixtures under `docs/`; always link to `simulations/` at the repo root.

- Before changing the code, run the matching step via `npx tsx a2a-server/scripts/run-simulation.ts simulations/<sim>/<step>` (repo root; argument = step directory containing `request.json`) and make the file-backed `response.json` / `request.json` match the observed output.
- Workflows that mention "simulation = golden standard" (see the "Simulation workflow" section of [`WORKFLOW.md`](WORKFLOW.md)) should be followed when deciding whether to update the simulation or the code.
- Any divergence between a simulation step and the real request/response should be captured in the appropriate issue (for example [`issues/07-simulations-golden-standard.md`](issues/07-simulations-golden-standard.md)).
