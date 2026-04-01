# Task: Analyze ai-survey-platform scripts for a2a-server action patterns

**Priority:** Medium

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-3\ai-survey-platform\scripts\`

**Scripts (80+):** Laravel + Node.js hybrid project

---

## Analysis Results

### Category 1: Laravel-Specific Patterns (6 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `validate-migrations.js` | Migration validation | `laravel-validate-migrations` |
| `generate-role-files.js` | ADR role generation | `laravel-generate-roles` |
| `generate-role-files.ps1` | ADR role generation | `laravel-generate-roles-ps` |
| `fill-adr-roles.mjs` | ADR role fill | `laravel-fill-adr-roles` |
| `migrate-*.mjs` | Component migration | `laravel-migrate-components` |

### Category 2: Generic Analysis Patterns (5 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `code-analysis.mjs` | Code metrics | `analyze-code-quality` |
| `config-analysis.mjs` | Config validation | `analyze-config` |
| `dependencies-analysis.mjs` | Dependency analysis | `analyze-dependencies` |
| `docs-analyzer.mjs` | Documentation | `analyze-docs` |
| `dependency-analysis.mjs` | Dependency graph | `analyze-dep-graph` |

### Category 3: Validation Patterns (12 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `final-quality-check.mjs` | Quality gate | `validate-quality-gate` |
| `final-system-validation.mjs` | System validation | `validate-system` |
| `validate-migrations.js` | DB migrations | `validate-migrations` |
| `validate-docs.mjs` | Doc validation | `validate-docs` |
| `validate-links.mjs` | Link validation | `validate-links` |
| `validate-requirements-*.mjs` | Reqs validation | `validate-requirements` |
| `validate-role-responsibility.mjs` | Role validation | `validate-roles` |
| `validate-roles.cjs` | Role validation | `validate-roles-cjs` |

### Category 4: Performance Patterns (4 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `performance-analysis.js` | Performance metrics | `analyze-performance` |
| `performance-analyzer.mjs` | Deep analysis | `analyze-performance-deep` |
| `performance-benchmark.mjs` | Benchmarks | `run-benchmark` |
| `performance-monitor.mjs` | Runtime monitoring | `monitor-performance` |

### Category 5: Testing Patterns (5 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `test-runner.mjs` | Test execution | `run-tests` |
| `test-data-generator.mjs` | Test data | `generate-test-data` |
| `testing-metrics-collector.mjs` | Test metrics | `collect-test-metrics` |
| `test-new-auth.js` | Auth testing | `test-auth` |
| `run-e2e-tests.*` | E2E testing | `run-e2e-tests` |

### Category 6: Build/Deploy Patterns (3 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `start-servers.ps1` | Server startup | `start-servers` |
| `stop-servers.ps1` | Server shutdown | `stop-servers` |
| `quality-gate.mjs` | Quality gate | `run-quality-gate` |

### Category 7: Generation Patterns (10 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `generate-missing-metrics.cjs` | Metrics generation | `generate-metrics` |
| `generate-missing-role-jsons.mjs` | Role JSON | `generate-role-json` |
| `generate-role-files-fixed.ps1` | Role files PS | `generate-roles-ps` |
| `generate-roles.ps1` | Role generation | `generate-roles` |
| `page-tasks-generator.mjs` | Page tasks | `generate-page-tasks` |
| `create-missing-files.mjs` | File creation | `create-missing-files` |
| `create-missing-readme.mjs` | README creation | `create-readme` |

### Category 8: Migration/Fix Patterns (15 scripts)

| Script | Pattern | a2a-server Action Candidates |
|--------|---------|----------------------------|
| `migrate-date-formatting.mjs` | Date formatting | `migrate-date-format` |
| `migrate-error-handling.mjs` | Error handling | `migrate-error-handling` |
| `migrate-layouts.mjs` | Layout migration | `migrate-layouts` |
| `migrate-localstorage.mjs` | LocalStorage | `migrate-localstorage` |
| `migrate-notifications.mjs` | Notifications | `migrate-notifications` |
| `migrate-state-management.mjs` | State management | `migrate-state` |
| `migrate.js` | General migration | `migrate-general` |
| `fix-broken-links.mjs` | Link fixing | `fix-broken-links` |
| `fix-false-info.js` | Info fixing | `fix-false-info` |
| `fix-broken-links.mjs` | Link fixes | `fix-links` |

---

## Cross-Reference with laravel-agent-workspace-tools

The following patterns align with existing Laravel workspace tools:

| ai-survey-platform | laravel-agent-workspace-tools | Alignment |
|-------------------|------------------------------|-----------|
| validate-migrations.js | validate-migration-scenarios.js | HIGH |
| generate-role-files.* | batch-generate-patches.js | MEDIUM |
| migrate-*.mjs | migrate-*-*.js | HIGH |
| fill-adr-roles.mjs | - | NEW |

---

## Recommendations for Reuse

### Priority 1: High-Value Actions
1. **Validation actions** -可直接复用 from laravel-agent-workspace-tools:
   - `validate-migrations` 
   - `validate-config`

2. **Analysis actions** - Generic enough for reuse:
   - `analyze-code-quality`
   - `analyze-dependencies`

### Priority 2: Script Adapters
1. **Migration scripts** → Convert to `script` actions with parameters
2. **Performance scripts** → Convert to `script` actions
3. **Generation scripts** → Convert to `script` actions

### Priority 3: New Actions
1. **ADR role generation** - Unique to ai-survey-platform, create new actions:
   - `generate-role-files`
   - `fill-adr-roles`

---

## Definition of Done

- [x] Scripts categorized (Laravel-specific vs generic)
- [x] Action candidates aligned with existing patterns  
- [x] Recommendations for reuse from laravel-agent-workspace-tools
- [x] DEV_STATE.md to be updated
