# Task 8: JSON Schemas maintenance & extension (`new-request-flow/json-schemas`)

## Goal

Keep all JSON Schemas in `new-request-flow/json-schemas/` aligned with the actual protocol and simulations, and extend them where needed (new execute types, new flows, Web ↔ Client API contracts, etc.).

## Scope

Current schemas:

- Server invoke (Client API ↔ Server):
  - `server-invoke-request.schema.json`
  - `server-invoke-response-first-form.schema.json`
  - `server-invoke-response-execute.schema.json`
  - `server-invoke-response-pending.schema.json`
- Transform DSL:
  - `server-transform.schema.json`

This task covers:

- Reviewing and tightening these schemas based on real data in `simulations/`.
- Adding missing schemas for other important JSON contracts (e.g. Web ↔ Client API).

## References

- Docs:
  - `new-request-flow/PROTOCOL.md`
  - `new-request-flow/SCHEMAS.md`
  - `new-request-flow/SESSION-FLOW.md`
  - `new-request-flow/SIMULATION-FORMAT.md`
- Simulations:
  - `simulations/SCHEMA.md`
  - `simulations/REFERENCE.md`
  - All concrete simulations under `simulations/`
- Existing schemas:
  - `new-request-flow/json-schemas/*`
- Validation CLI task:
  - `tasks/07-simulation-validator-and-ci.md`

## Work to perform

1. **Review & align existing schemas**
   - For each existing schema, cross-check against:
     - Real `request.json` / `response.json` files in `simulations/**`.
     - Shapes described in `PROTOCOL.md` and `SCHEMAS.md`.
   - Adjust schemas where they are:
     - Too strict (reject valid simulation JSON).
     - Too loose (allow shapes we explicitly decided to forbid).
   - Ensure:
     - `server-invoke-request` correctly models first vs subsequent requests.
     - Response schemas correctly capture:
       - `execute.form.choices` (first-form).
       - All supported `execute` keys for execute steps (form, message, script, rag-search, read-file, write-file, execute-command, etc.).
       - `promiseId` flows for async responses.
2. **Extend schemas for new execute/result types (if needed)**
   - From simulations and action definitions, list any execute/result shapes not yet covered explicitly (e.g. `list-directory`, `grep-search` if used).
   - Decide:
     - Whether to make them first-class in `server-invoke-response-execute.schema.json` (explicit properties).
     - Or keep them under `additionalProperties` with only minimal constraints.
   - Update `SCHEMAS.md` to reflect any new execute/result shapes.
3. **Add schemas for Web ↔ Client API (optional but recommended)**
   - Based on `SESSION-FLOW.md` and `PROTOCOL.md`, define JSON Schemas for:
     - `POST /api/sessions` request/response.
     - `GET /api/sessions`, `GET /api/sessions/:id`.
     - `POST /api/sessions/:id/action`.
     - `POST /api/sessions/:id/next`.
     - `POST /api/sessions/:id/cancel`.
   - Place them under `new-request-flow/json-schemas/` (e.g. `client-api-session-*.schema.json`).
4. **Document schema usage**
   - In `new-request-flow/SCHEMAS.md`, add:
     - Section that lists all JSON Schemas by filename and explains where they are used (Server, Client API, Web, simulations).
     - Guidelines for updating schemas when protocol changes (order of operations: update docs → update schemas → update simulations → run validator).

## Acceptance criteria

- All existing schemas in `new-request-flow/json-schemas/` are:
  - In sync with `PROTOCOL.md`, `SCHEMAS.md`, and real `simulations/**`.
  - Ready to be used by the validator from Task 7 without large amounts of false positives/negatives.
- New schemas (if added) document Web ↔ Client API contracts where it brings clear value.
- `SCHEMAS.md` clearly references and explains each schema file.

