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

1. **Scope** — Agree path(s): single package (`a2a-server/`, `a2a-client/`, `a2a-ai-hub/`) or whole repo; exclude `node_modules/`, `dist/`, build artifacts, large generated trees unless relevant.
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


# Purple alert — temporary harmful-pattern hunt (AI command)

**Status:** **Temporary** working note. In [`GLOSSARY.md`](../GLOSSARY.md), **Purple alert** normally means **deduplication** of code/docs/routes; this file is an **operator shortcut** for **in-repo security / abuse-pattern search**. Supply-chain and package risk → **Magenta alert** (`npm audit`, lockfiles). Routine tech debt → [`YELLOW-ALERT-SCAN.md`](YELLOW-ALERT-SCAN.md).

**Purpose:** Repeatable instruction block to **find likely harmful or exploitable patterns** (accidental backdoors, unsafe dynamic execution, secret leakage), not to refactor in the same pass.

---

## Invocation

```text
Purple alert harmful hunt: follow docs/PURPLE-ALERT-HARMFUL-HUNT.md. Scope: … (repo root or path). Output: findings table with severity + file:line + remediation hint. Do not change code until reviewed.
```

```text
Фиолетовая тревога — поиск вредного: по docs/PURPLE-ALERT-HUNT.md. Область: … Таблица находок, без правок кода до ревью.
```

---

## What the agent must do

1. **Scope** — Agree paths; exclude `node_modules/`, `dist/`, `.git/`, huge generated trees unless investigating an incident.
2. **Mechanical pass** — Ripgrep patterns in [Pattern hints](#pattern-hints); record path, line, short context.
3. **Semantic pass** — Read hits: is input **external** (HTTP, file path from user, env)? Distinguish **test-only** / **dev-only** (`SKIP_AUTH`, fixtures) from production paths.
4. **Output** — Table: severity, file:line, category, summary, next step (fix, ticket, or false positive).

---

## Pattern hints

| Category | Examples (adapt per language) |
|----------|-------------------------------|
| **Dynamic code** | `eval(`, `new Function(`, `vm.runIn`, `child_process.exec` / `execSync` with **interpolated** strings |
| **Injection / traversal** | SQL string concat with user input; `fs.*` with unsanitized path; `path.join` then bypass (`..`); template in shell |
| **Secrets** | High-entropy tokens, `password`/`api_key`/`private_key` in source; real URLs with embedded credentials |
| **Deserialization** | `pickle`, unsafe YAML, `JSON.parse` on untrusted **with** revival/prototype tricks |
| **Network exfil** | Hardcoded unknown domains; `fetch`/`axios` to non-canonical hosts in server paths |
| **Dependency red flags** | Obscure install scripts, `postinstall` that curls bash — cross-check **Magenta** / lockfile |

False positives are common (tests, docs, commented examples). Mark **context: test / doc / prod**.

---

## Report format

| Severity | File:line | Category | Summary | Next step |
|----------|-----------|----------|---------|-----------|
| critical / high / med / low | `path:12` | e.g. exec injection | one line | patch / issue / ignore + why |

End with optional `tasks/pending/…` if tracking multi-step fixes.

---

## When this doc should retire

Merge into a single **security scan** ADR or operator doc, or fold high-signal rows into [`YELLOW-ALERT-SCAN.md`](YELLOW-ALERT-SCAN.md) *Security / env* and delete this file; update any links.

---

## Last run log (2026-04-07)

Mechanical scan: repo root excluding `node_modules` / build dirs. Semantic spot-check on hits.

| Severity | File:line | Category | Summary | Next step |
|----------|-----------|----------|---------|-----------|
| **high** (mitigated) | `a2a-server/src/services/llm/bug-fixer.ts` | shell injection | `execSync` interpolated `filePath` into a shell string | **Fixed:** `spawnSync('git', ['diff','--no-color','--', filePath], …)` |
| med (mitigated) | `a2a-server/src/sandbox/SkillLite.ts` | `execSync` | Stub had shell-equivalent RCE if wired | **Fixed:** `execute()` throws; no subprocess |
| low | `a2a-client/packages/web/js/client-action-runner.js` | `new Function` | Allowlisted scripts | **Hardened:** strict `scriptId` regex + `hasOwnProperty` |
| low (mitigated) | `a2a-client/packages/web/js/template-loader.js` | `innerHTML` + `{{key}}` | Unescaped `data` values → XSS if ever server-driven | **Fixed:** `escapeHtml` on substitutions; regex-safe keys |
| low | `tests/cross-system-validate.mjs` | `spawnSync` | Was `` `npm run ${script}` `` | **Fixed:** `spawnSync('npm',['run',script],{ shell: win32 })` |
| low | `a2a-client/…/run-human-review.mjs` | `spawnSync` | `npx` / shell issues on Windows | **Fixed:** `node …/vitest.mjs` + argv |
| low | `a2a-client/packages/execution` | `vm` fallback | Weaker than vm2 | **Dependency:** `vm2` in package `dependencies` |
| low | `a2a-client/…/render-layout.js` | `innerHTML` | Some branches skipped `escapeHtml` on store errors | **Fixed:** `escapeHtml(storeResult.error)` |
| low | `runbook-cli.js` | `execSync` / `netstat` | Interpolated port/PID | **Fixed:** `execFileSync` + validated port/PID |
| low / test | `a2a-server/tests/unit/execute-security.service.test.ts` | `eval` / `child_process` strings | Fixture strings for security tests | None |
| — | `SKIP_AUTH`, `innerHTML` | dev / UI | Documented dev bypass; task-flow uses `escapeHtml` on attachment paths and messages | Watch `innerHTML` assignments that mix unescaped server fields (none critical in sampled paths) |
| — | Scripts (`runbook-cli`, `validate-system`, e2e) | `execSync` | Fixed commands / operator tooling | Acceptable for local CLI |

**Magenta (`npm audit --omit=dev`, 2026-04-07):** **Closed** — repo root, `a2a-server/`, and `a2a-client/` production graphs report **0**. **`a2a-server`:** `overrides.tar` → `^7.5.13`. **`a2a-client` / `premium-ui`:** `react-syntax-highlighter@^16.1.1` (safe `prismjs` / `refractor`). Log: [`tasks/completed/magenta-npm-audit-2026-04.md`](../tasks/completed/magenta-npm-audit-2026-04.md). Dev-only `npm audit` may still flag ESLint/Vitest trees — separate cleanup if required.</content>
<parameter name="filePath">C:\workspace\org-carrier\a2a-script-agent\docs\YELLOW-ALERT-SCAN.md