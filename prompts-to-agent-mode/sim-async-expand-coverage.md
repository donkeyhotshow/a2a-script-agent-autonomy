# Async simulations: expand beyond `promise-lifecycle`

## Sources

- [`simulations/async/README.md`](../../simulations/async/README.md) — currently only `promise-lifecycle` listed
- [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) — async bundle contract
- [`AGENTS.md`](../../AGENTS.md) — async / `promiseId` narrative

## Agent prompt (copy)

Add goldens for additional async paths (retry, cancel, multi-poll, error surfaces) if product supports them; each sim gets `description.md` + steps matching SCHEMA. Run `npm run sim:lint` / `sim:validate` from repo root. Update `simulations/async/README.md` table.

## Completion

- [ ] Done (new sim(s) or explicit “not needed” note in README)
