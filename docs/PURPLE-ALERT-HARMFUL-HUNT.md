# Purple alert — temporary harmful-pattern hunt (AI command)

**Status:** **Temporary** working note. In [`GLOSSARY.md`](../GLOSSARY.md), **Purple alert** normally means **deduplication** of code/docs/routes; this file is an **operator shortcut** for **in-repo security / abuse-pattern search**. Supply-chain and package risk → **Magenta alert** (`npm audit`, lockfiles). Routine tech debt → [`YELLOW-ALERT-SCAN.md`](YELLOW-ALERT-SCAN.md).

**Purpose:** Repeatable instruction block to **find likely harmful or exploitable patterns** (accidental backdoors, unsafe dynamic execution, secret leakage), not to refactor in the same pass.

---

## Invocation

```text
Purple alert harmful hunt: follow docs/PURPLE-ALERT-HARMFUL-HUNT.md. Scope: … (repo root or path). Output: findings table with severity + file:line + remediation hint. Do not change code until reviewed.
```

```text
Фиолетовая тревога — поиск вредного: по docs/PURPLE-ALERT-HARMFUL-HUNT.md. Область: … Таблица находок, без правок кода до ревью.
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
| med | `a2a-server/src/sandbox/SkillLite.ts:17` | `execSync(command)` | Unused export today; if wired to LLM/user input without allowlist → RCE | Keep disabled or add strict allowlist + real sandbox before use |
| low | `a2a-client/packages/web/js/client-action-runner.js:131` | `new Function` | Only `PREDEFINED_SCRIPTS[scriptId].code` — fixed catalog | Ensure `scriptId` never accepts arbitrary strings from network without validation |
| low / test | `a2a-server/tests/unit/execute-security.service.test.ts` | `eval` / `child_process` strings | Fixture strings for security tests | None |
| — | `SKIP_AUTH`, `innerHTML` | dev / UI | Documented dev bypass; task-flow uses `escapeHtml` on attachment paths and messages | Watch `innerHTML` assignments that mix unescaped server fields (none critical in sampled paths) |
| — | Scripts (`runbook-cli`, `validate-system`, e2e) | `execSync` | Fixed commands / operator tooling | Acceptable for local CLI |

**Magenta (`npm audit --omit=dev`, 2026-04-07):** Repo root — **0** vulnerabilities. **`a2a-server/`** — **7** (e.g. transitive `handlebars`, `simple-git`, `tar`, `path-to-regexp`, `minimatch` / `brace-expansion` under `glob`). **`a2a-client/`** — **8** (e.g. `vite` via vitest, `undici`, `flatted`, `path-to-regexp`, `picomatch`, `prismjs` via `react-syntax-highlighter`). Next: per-package `npm audit fix`, re-run tests; use `npm audit fix --force` only with breakage review. Tracking: [`tasks/pending/magenta-npm-audit-2026-04.md`](../tasks/pending/magenta-npm-audit-2026-04.md).
