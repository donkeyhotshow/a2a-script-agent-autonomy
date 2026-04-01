# Client API: Red-room cycle (tool execute → next → artifacts)

## Sources

- [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) — §5 table (all 5 stages) + checklist item 5
- [`AGENTS.md`](../AGENTS.md) — Gray room / tool flow narrative

## Agent prompt (copy)

Drive an **agent** session until server returns a tool-shaped `execute`; complete client tool result, `/next`, async poll; verify linear step numbering and full artifact set per §5. If no tool after N turns, document N and task text used.

## Completion

- [ ] Done
