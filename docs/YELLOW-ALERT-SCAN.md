# Yellow alert — code quality scan (AI command)

**Purpose:** A repeatable **instruction block** for an IDE agent or session LLM to **hunt technical debt**: shortcuts, half-finished work, fragile hacks, and contract smells — without mixing this up with subsystem triage alerts (Red/Gray/Black).

**When to use:** Paste the [Invocation](#invocation) into chat, optionally narrow `PATH` or topic. Use after refactors, before release, or when onboarding.

**Not the same as:** **[Yellow alert (operator)](../GLOSSARY.md#yellow-alert-operator--жёлтая-тревога-оператор)** in the glossary — that label means *the assistant keeps insisting wrong code is fine*; escalate with evidence. This document is the **proactive scan** command.

---

## Invocation

Copy one of these (edit path/topic as needed):

```text
Yellow alert scan: follow docs/YELLOW-ALERT-SCAN.md. Scope: repo root (or PATH: …). Output: findings table + suggested follow-up tasks. Do not refactor yet unless trivial and clearly safe.
```

```text
Жёлтая тревога — скан: по docs/YELLOW-ALERT-SCAN.md. Область: … Результат: таблица находок + задачи в tasks/pending при необходимости. Пока без крупного рефакторинга.
```

---

## What the agent must do

1. **Scope** — Agree path(s): single package (`a2a-server/`, `a2a-client/`, `ai-integration/`) or whole repo; exclude `node_modules/`, `dist/`, build artifacts, large generated trees unless relevant.
2. **Mechanical pass** — Use repo search tools (`rg`/grep) for markers and risky patterns from [Pattern hints](#pattern-hints). Note hits with file + line.
3. **Semantic pass** — Read hot paths (request processor, Client API routes, transforms) for: duplicated logic, error swallowing, inconsistent async, schema drift vs [`AGENTS.md`](../AGENTS.md) action-key rules.
4. **Cross-check** — If findings touch contracts, point to [`tests/direct-tests/validators/README.md`](../tests/direct-tests/validators/README.md) scripts that could **verify** (not replace) the issue.
5. **Output** — Use [Report format](#report-format). Prefer **actionable** rows; skip style nits unless they hide bugs.

---

## Pattern hints

| Category | Examples to search / look for |
|----------|-------------------------------|
| **Deferred work** | `TODO`, `FIXME`, `HACK`, `XXX`, `WIP`, `@ts-ignore`, `eslint-disable` (with no ticket ref) |
| **Fragile control flow** | Empty `catch`, `catch {`, `.catch(() => {})`, `// no-op`, swallowed errors, `any` in public API |
| **Sync/async smell** | `*Sync(` in request paths where async exists; `setTimeout`/`sleep` as “fix”; busy-wait loops |
| **Contract** | Multiple shapes for same concept; `execute`/`result` not single-key; client vs server DTO mismatch |
| **Security / env** | Hardcoded secrets, `SKIP_AUTH` assumptions in wrong layer, missing validation on external input |
| **Tests** | `.skip`, `.only`, disabled CI cases, missing assertion, flaky timing-only tests |
| **Docs lying** | README claims vs code in default dev path (see Amber alert in [`GLOSSARY.md`](../GLOSSARY.md)) |

Adjust patterns per language (TS/JS in this repo). **Presence of `TODO` alone is not always bad** — classify: blocker vs tech debt vs intentional note.

---

## Report format

Use a table (markdown or plain):

| Severity | File:line | Category | Summary | Suggested next step |
|----------|-----------|----------|---------|---------------------|
| high / med / low | `path:42` | e.g. error swallow | one line | e.g. add logging + rethrow; or task file |

End with:

- **Optional:** 1–3 bullet **tasks/** candidates (`tasks/pending/…`) if work is multi-step.
- **Do not** mark the scan “done” in `DEV_STATE` unless the team agreed these findings are tracked.

---

## Relation to other alerts

- **Purple** (dedupe), **Amber** (doc/code mismatch), **Teal** (API contract), **Magenta** (deps) — findings from this scan may **map** to those labels when you open real work items.
- **Offline validators** — automation for known contract mistakes; this scan catches **broader** human-judgment smells.
