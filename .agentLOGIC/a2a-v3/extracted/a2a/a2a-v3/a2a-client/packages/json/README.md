# @a2a/json

VueFlow mapper for the legacy JSON/Vue progress UI.

## `result.actionId` vs A2A protocol

- **Protocol `result` / `execute`** use **action keys** (`read-file`, `rag-search`, `result.choice`, …) per `simulations/SCHEMA.md`.
- **`actionId` in this package** is an **internal correlation id** for VueFlow node wiring (progress → completed edges). It is **not** the same as `result.choice` or the single key under `execute`.

Rename to a protocol-aligned name would be a breaking change; treat `actionId` as UI-only when reading traces.
