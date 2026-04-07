# Cross-system parameter / shape hunt (backlog)

**Purpose:** Central list of **inter-system** contract issues (return payloads, headers, execute/result shape, async vs sync assumptions). Evidence is in each module’s storage — see [`cross-system-contracts/README.md`](../../cross-system-contracts/README.md).

## How to add a row

| ID | Symptom | Systems | Evidence path / validator | Status |
|----|---------|---------|---------------------------|--------|
| — | Example: top-level `message` + tool in LLM JSON | hub + server | `scan-promise-bodies`, `proxy_logs/.../body.md` | open |

Replace `—` with a short slug when you add a **fixtures/** entry.

## Rules

- Prefer **validator name + one path** over prose alone.
- Do not paste secrets or full API keys.
- When fixed: move row to `tasks/done/` or mark status `fixed` and link PR/commit.
