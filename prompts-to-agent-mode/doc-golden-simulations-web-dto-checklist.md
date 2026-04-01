# Golden simulations: Web DTO checklist (per step)

## Sources

- [`a2a-client/docs/GOLDEN-SIMULATIONS-CHECKLIST.md`](../a2a-client/docs/GOLDEN-SIMULATIONS-CHECKLIST.md) — all 7 bullets + rg commands
- [`simulations/SCHEMA.md`](../simulations/SCHEMA.md)

## Agent prompt (copy)

For new or changed `response.json` + `received.json` pairs, verify each item in the checklist (action-key in `response`, no raw tool keys in `received.execute`, attachments rules, form parity, async metadata). Run suggested `rg` and `sim:lint`/`sim:validate`.

## Sub-items (tick in source doc or here)

- [ ] §1 canonical `response.json.execute` action-key
- [ ] §2–3 `received.json.execute` web-safe only
- [ ] §4 `attachments` UI hints only
- [ ] §5 `received.json.result` safe
- [ ] §6 `form` matches UI intent
- [ ] §7 async fields intact

## Completion

- [ ] Done (batch / sim reviewed)
