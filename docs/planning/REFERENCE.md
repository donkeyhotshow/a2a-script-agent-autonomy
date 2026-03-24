# Reference

## Simulation as the golden standard

The simulations in `docs/planning/simulations/` (for example `dialog`, `fix-vue-imports`, `auto-ai`) are the authoritative source describing how the system must behave.

- Before changing the code, run the matching simulation via `node a2a-server/scripts/run-simulation.ts <name>` and make the file-backed `response.json` / `request.json` match the observed output.
- Workflows that mention "simulation = golden standard" (see the "Simulation workflow" section of `WORKFLOW.md`) should be followed when deciding whether to update the simulation or the code.
- Any divergence between a simulation step and the real request/response should be captured in the appropriate issue (for example `issues/07-simulations-golden-standard.md`).
