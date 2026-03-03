# Task 40: Protocol versioning and transform governance

## Goal

Introduce a light **versioning and governance layer** for:

- the A2A protocol shapes (request/response schemas), and
- transform/prompt configurations (`server-transforms-*.json`, templates),

to allow safe evolution while keeping simulations as the golden source of truth.

## Background

From:
- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/SCHEMAS.md`
- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `simulations/SCHEMA.md`

we have:

- Canonical JSON Schemas for protocol objects.
- Simulation schemas for per-step files.

But there is no explicit:

- version tag in messages / configs, or
- process for updating transforms/templates while maintaining backward compatibility with existing simulations.

## Requirements

- **1. Protocol version tagging**
  - Introduce a simple `protocolVersion` field (e.g. `"1.0"`) in:
    - server request/response schemas (optional but recommended),
    - Client API / API client configuration or metadata.
  - Use this version primarily for:
    - validation (ensuring client & server agree),
    - debugging (logs, metrics).

- **2. Transform / template versioning**
  - Add optional `version` or `meta` fields to `server-transforms-*.json` and prompt templates:
    - helps track when a pipeline/template was changed,
    - can be used to select different variants if needed (e.g. v1 vs v2 behavior).
  - Provide a small utility or script to list transform versions and detect mismatches versus simulations.

- **3. Change governance rules**
  - Document basic rules for changing:
    - protocol schemas,
    - transform pipelines,
    - prompt templates.
  - Examples:
    - no breaking changes without bumping protocol version,
    - transforms affecting simulations must be covered by tests that compare runtime vs `simulations/*`.

- **4. CI checks**
  - Wire existing JSON Schema validators so that:
    - all `server-transforms-*.json` validate against `server-transform.schema.json`,
    - all `request.json` / `response.json` examples under `simulations/` validate against protocol schemas.
  - Add a CI job that:
    - runs transform-runtime tests (Task 26/31),
    - reports any drift between protocol/schema versions and simulations.

- **5. Developer tooling**
  - Provide a brief “playbook” doc for contributors:
    - how to add/change transforms/templates,
    - how to bump protocol/transform versions,
    - how to run validation + simulation tests before merging.

## Acceptance Criteria

- Protocol and transforms carry explicit, documented versions.
- CI fails when:
  - a transform/template change breaks simulations,
  - a protocol change is made without version update or schema alignment.
- Contributors have a clear, lightweight process for evolving the engine and keeping it in sync with simulations.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/SCHEMAS.md`
- `docs/new-request-flow/SIMULATION-FORMAT.md`
- `simulations/SCHEMA.md`
- `docs/new-request-flow/SIMULATION-VALIDATION.md`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 40) and recorded the protocol/transform version tagging, governance guidance, and CI validation requirements.
- 📌 Governance notes captured so schema updates, transform changes, and prompt versions can be governed once this scheduling window opens.
- 📝 Next steps: add version metadata to protocol/transform files, document the change process, and surface CI checks/golden tests that detect drift before implementation.
