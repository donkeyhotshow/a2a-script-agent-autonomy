# Reference

## Simulation as the golden standard

Canonical simulations live at the **repository root**: [`simulations/`](../../../simulations/) (for example [`dialog`](../../../simulations/dialog/description.md), [`fix-vue-imports`](../../../simulations/fix-vue-imports/description.md), [`auto-ai-v2`](../../../simulations/auto-ai-v2/description.md)). Superseded full fixtures live under [`archive/simulations/`](../../../archive/simulations/).

**Do not** duplicate simulation fixtures under `docs/`; always link to `simulations/` at the repo root.

- Before changing the code, run the matching simulation via `node a2a-server/scripts/run-simulation.ts <name>` and make the file-backed `response.json` / `request.json` match the observed output.
- Workflows that mention "simulation = golden standard" (see the "Simulation workflow" section of [`WORKFLOW.md`](WORKFLOW.md)) should be followed when deciding whether to update the simulation or the code.
- Any divergence between a simulation step and the real request/response should be captured in the appropriate issue (for example [`issues/07-simulations-golden-standard.md`](issues/07-simulations-golden-standard.md)).
