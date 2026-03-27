# Simulations

Golden fixtures for the Web ↔ Client API ↔ Server ↔ LLM contract.

- **Layout and rules:** [`SCHEMA.md`](./SCHEMA.md) — canonical eight files per step, `sim-lint` / `sim:validate`.
- **Audit sessions:** [`SIM-AUDIT-WORKBOOK.md`](./SIM-AUDIT-WORKBOOK.md) — save scan state, grep checklist, server redundancy notes.
- **Evolving LLM flows / new tools:** [
  `../a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](../a2a-server/docs/EXTENDING-LLM-ACTIONS.md).
- **SDK / Web shapes:** [`CLIENT-SDK-IDEAL.md`](./CLIENT-SDK-IDEAL.md).
- **Dialog file workflow:** [`dialog/WORKFLOW.md`](./dialog/WORKFLOW.md).

## Supplementary files

- **`interrupt.md`** (optional, any step) — Markdown-only notes for
  the [**gray room**](../a2a-server/docs/GRAY-ROOM.md). Example: [
  `agent-auto-ai/6/interrupt.md`](./agent-auto-ai/6/interrupt.md).
- **`N-sub-M/`** (optional folder next to step `N/`, `M` = 1,2,…) — e.g. [
  `agent-auto-ai/6-sub-1/`](./agent-auto-ai/6-sub-1/) … [`6-sub-4/`](./agent-auto-ai/6-sub-4/); **gray room**
  only (no `client.json` / `received.json`); trace in **`response.json`** → `interruptTrace`. See [
  `SCHEMA.md`](./SCHEMA.md#supplementary-server-interrupt-loop-optional).
