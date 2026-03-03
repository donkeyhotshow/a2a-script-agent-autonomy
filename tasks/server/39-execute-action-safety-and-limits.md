# Task 39: execute-action safety and limits (client-side)

## Goal

Define and enforce **safety and resource limits** for client-executed actions (`execute.<action>`) such as:

- `read-file`, `write-file`, `list-directory`, `execute-command`, `rag-search`, `script`, etc.

So that simulations and AI-Actions have a clear, configurable sandbox on the client side.

## Background

Simulations (especially `auto-ai`, `coder-smart`, `task-decomposition`) assume rich capabilities on the client:

- Running shell commands.
- Reading/writing many files.
- Running RAG queries.

But in real environments we need:

- Per-project / per-session policies (what is allowed).
- Hard resource limits (how much is allowed).

## Requirements

- **1. Policy model for client actions**
  - Define a configuration structure (e.g. `client-actions.policy.json` or env-driven) that controls:
    - which action types are allowed (`read-file`, `write-file`, `execute-command`, etc.),
    - per-action restrictions (e.g. allowed directories, allowed commands, max file size).
  - Integrate this with:
    - Client API (which executes actions),
    - `@a2a/api-client` or a small policy helper used by the execute engine.

- **2. Resource limits**
  - Add per-session and global limits such as:
    - max number of `read-file` / `write-file` operations,
    - max bytes read/written per session,
    - max `execute-command` invocations and maximum runtime per command,
    - max RAG results / tokens built into context.
  - Enforce limits in the relevant handlers (file-ops, command-execution, RAG, script runner) and surface structured errors back to server/LLM.

- **3. Safe defaults**
  - Provide a conservative default policy for development:
    - restrict `execute-command` to a vetted whitelist (already partially in place on server; mirror/extend client-side).
    - restrict file access to the current workspace root and safe temp dirs.
    - prevent modifications outside project tree and selected `.carrier/*` locations.

- **4. Protocol integration**
  - When a client action is blocked by policy or limits:
    - return a clear `result` object (action-key shape) describing:
      - `success: false`,
      - `error: 'policy_violation' | 'limit_exceeded'`,
      - brief `message`.
  - This allows LLM to understand constraints and adjust behavior instead of failing silently.

- **5. Logging and telemetry**
  - Log all **denied** or limited actions with:
    - action type,
    - reason (policy / limit),
    - session/project id.
  - Optionally expose a small debug endpoint or CLI report summarizing:
    - how often actions hit policy/limits,
    - which simulations or flows tend to abuse resources.

## Acceptance Criteria

- Client execute engine refuses disallowed or excessive actions with clear, structured `result` errors.
- Polices and limits are configurable per environment, with safe defaults checked into the repo.
- Simulations that overuse resources can be used to validate limit behavior (e.g. a test sim that intentionally hits caps).

## References

- `simulations/auto-ai/description.md`
- `simulations/coder-smart/description.md`
- `docs/new-request-flow/PROTOCOL.md` (action-key result format)
- `a2a-server/src/actions/handlers/command-execution.ts` (server-side command safety, as reference)
- Client API execute engine implementation (to be inspected during implementation)

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 39) and captured the policies, limits, safe defaults, protocol handling, and telemetry requirements for client-side `execute.<action>` safety.
- 📌 Notes recorded so the policy/config model, limit enforcement, and structured denial responses can be aligned when that implementation window opens.
- 📝 Next steps: define the policy schema + limit counters, wire enforcement into the client action handlers, and document the protocol-level errors for LLM awareness.
