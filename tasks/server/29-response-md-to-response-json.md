# 29 – Response.md parser and response.json builder

## Context

Simulations encode server postprocessing via `server-transforms-response.json`, which:
- Parses `response.md`.
- Updates `context.history`.
- Builds `execute` (action-key shape).
- Produces final `response.json`.

Runtime server must mirror this behavior using the **same DSL executor** and configuration files, keeping all action-specific logic in JSON pipelines instead of TypeScript.

## Goal

Implement end-to-end transformation from `response.md` to protocol-compliant `response.json` for AI-Actions using the pipeline executor and per-action response pipelines.

## Requirements

- **Parsing**
  - Use `parse-json-from-md` op to extract the LLM JSON payload from `response.md` into `$llm`.
  - Support LLM outputs that match the declared `Response Format` in `request.md` for each AI-Action.

- **Context updates**
  - Append assistant messages to `context.history`, as in `simulations/dialog/3/server-transforms-response.json`:
    - `role: "assistant"`.
    - `message` (and other fields when present) taken from `$llm`.
  - Preserve all other context fields unchanged (stateless server, but context passes through).

- **Execute construction (action-key shape)**
  - For `dialog`:
    - Build `execute.form` with a single text input to continue the conversation (mirroring current sim):
      - `name: "message"`, `type: "text"`, suitable label and `required: true`.
  - For more advanced AI-Actions (`coder`, `auto-ai`, `analyze`):
    - Map `$llm` fields into `execute` commands:
      - `message`, `form`, `read-file`, `write-file`, `rag-search`, `execute-command`, `script`, etc.
    - Always follow action-key shape (no flat `"action"` with sibling params).
  - All of the above mappings must be described in `server-transforms-response.json` files, not hardcoded in code.

- **Dispatcher (configuration-driven)**
  - Select the correct response pipeline based on `context.execution.action` and `step` via a small registry/config:
    - For example, `actions/dialog.json` could list which transform files to use for each step.
  - Code must not branch on action names; it should look up config and run the corresponding pipeline.

- **Protocol compliance**
  - Final `response.json` must conform to protocol schemas:
    - `context` required.
    - Optional `execute` for non-final steps.
    - Optional top-level `result` only for final step (per `simulations/SCHEMA.md` and `PROTOCOL.md`).
  - Use existing JSON Schema validators where available to enforce shape.

## Acceptance criteria

- For `dialog`:
  - Given `request.json`, `request.md`, `response.md`, `server-transforms-response.json`, the runtime pipeline produces the exact `response.json` from `simulations/dialog/3/response.json` (allowing only agreed normalization if needed).
- For at least one other AI-Action (for example `analyze`):
  - Same parity between simulation `response.json` and runtime pipeline output.
- All generated responses for tested actions pass protocol JSON Schema validation.
- No action-specific `if (action === "dialog")` style code in the builder; everything is driven by pipeline + registry files.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`
- `simulations/dialog/3/server-transforms-response.json`
- `simulations/dialog/3/response.json`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 29) and recorded the pipeline parity requirements.
- 📌 Implementation work is still pending; this captures the expectations for later execution.
- 📝 Next steps: leverage this log to guide the runtime builder implementation once the corresponding code sprint starts (`tasks/EXECUTION-LOG.md`).
