# agent

Minimal **sync** golden for the **router** step: user task in Ukrainian, `context.execution` at `task` / `router`, `execute.form` with static pipeline choices (dialog / agent / task-decomposition and scripted tails when present in the fixture).

Single step folder `1/`. No LLM call in this step — `server-transforms-request.json` is a passthrough pipeline marker per [`SCHEMA.md`](../../SCHEMA.md) (no-LLM steps).

See also: [`shared/router-static-choices.json`](../../../shared/router-static-choices.json) for canonical choice ids used in production routing.
