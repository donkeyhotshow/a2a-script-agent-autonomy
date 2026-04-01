# Task: Analyze services-carrier scripts for a2a-server action patterns

**Priority:** High

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-3\services-carrier\scripts\`

**Scripts (81):** Mix of Node.js (.mjs, .js), PowerShell (.ps1), and batch (.bat) files

---

## Analysis Results

### Category 1: Analysis Scripts (7 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `analyze-bundle.mjs` | Bundle size analysis | `analyze-bundle` → reads dist directory |
| `analyze-circular-deps.mjs` | Circular dependency detection | `analyze-circular-deps` → uses pnpm ls |
| `analyze-code-duplicates.mjs` | Duplicate code detection | `analyze-code-duplicates` |
| `analyze-css.mjs` | CSS analysis | `analyze-css` |
| `analyze-test-coverage.mjs` | Test coverage analysis | `analyze-test-coverage` |
| `analyze-vue-components.mjs` | Vue component analysis | `analyze-vue-components` |
| `code-analysis.mjs` | General code analysis | `code-analysis` |

### Category 2: Migration Scripts (7 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `apply-migration.mjs` | Database migration (SQLite) | `apply-migration` → uses better-sqlite3 |
| `migrate-date-formatting.mjs` | Date format migration | `migrate-date-formatting` |
| `migrate-error-handling.mjs` | Error handling migration | `migrate-error-handling` |
| `migrate-localstorage.mjs` | LocalStorage migration | `migrate-localstorage` |
| `migrate-notifications.mjs` | Notification migration | `migrate-notifications` |
| `migrate-state-management.mjs` | State management migration | `migrate-state-management` |
| `migrate.js` | General migration | `migrate-general` |

### Category 3: Validation Scripts (9 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `final-quality-check.mjs` | Quality gate | `validate-quality-gate` |
| `final-system-validation.mjs` | System validation | `validate-system` |
| `validate-docs.mjs` | Documentation validation | `validate-docs` |
| `validate-links.mjs` | Link validation | `validate-links` |
| `validate-migrations.js` | Migration validation | `validate-migrations` |
| `validate-requirements-*.mjs` | Requirements validation | `validate-requirements` |
| `validate-role-responsibility.mjs` | Role validation | `validate-roles` |
| `validate-roles.cjs` | Role validation | `validate-roles-cjs` |

### Category 4: Generation Scripts (8 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `generate-role-files.js` | Role file generation | `generate-role-files` |
| `generate-role-files-fixed.ps1` | Role file PS | `generate-role-files-ps` |
| `generate-missing-role-jsons.mjs` | Role JSON generation | `generate-role-json` |
| `generate-role-json-files.ps1` | Role JSON PS | `generate-role-json-ps` |
| `fill-adr-roles.mjs` | ADR role fill | `fill-adr-roles` |
| `create-missing-files.mjs` | File creation | `create-missing-files` |
| `create-missing-readme.mjs` | README creation | `create-readme` |
| `page-tasks-generator.mjs` | Page tasks generation | `generate-page-tasks` |

### Category 5: Testing Scripts (5 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `test-auth-replacement.js` | Auth testing | `test-auth` |
| `test-new-auth.js` | New auth testing | `test-new-auth` |
| `testing-metrics-collector.mjs` | Test metrics | `collect-test-metrics` |
| `run-e2e-tests.*` | E2E testing | `run-e2e-tests` |
| `create-test-user.js` | Test user creation | `create-test-user` |

### Category 6: Performance Scripts (2 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `performance-analysis.js` | Performance analysis | `analyze-performance` |
| `performance-monitor.mjs` | Runtime monitoring | `monitor-performance` |

### Category 7: Utility Scripts (15 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `build.js` | Build script | `build-project` |
| `dev.js` | Dev server | `start-dev` |
| `dev-with-pid.mjs` | Dev with PID | `start-dev-pid` |
| `check-db.mjs` | DB check | `check-db` |
| `check-project-table.mjs` | Project table check | `check-project-table` |
| `check-missing-files.mjs` | Missing files check | `check-missing-files` |
| `cleanup-requirements.ps1` | Requirements cleanup | `cleanup-requirements` |
| `bundle-analyzer-auto.mjs` | Bundle analyzer | `analyze-bundle-auto` |
| `sync-roles-to-code.mjs` | Sync roles | `sync-roles` |
| `sync-recovery-files.mjs` | Sync recovery | `sync-recovery` |
| `standardize-markdown-format.mjs` | Markdown standardization | `standardize-markdown` |
| `setup-monitoring.mjs` | Monitoring setup | `setup-monitoring` |
| `npm-packages-migration.mjs` | NPM migration | `migrate-npm-packages` |
| `update-links.ps1` | Link updates | `update-links` |
| `update-artefacts.cjs` | Artefact updates | `update-artefacts` |

---

## Action Candidates (Priority List)

### Priority 1: High-Value Actions (10)

1. **`analyze-bundle`** - Bundle size analysis
2. **`analyze-circular-deps`** - Circular dependency detection
3. **`analyze-code-duplicates`** - Duplicate code detection
4. **`apply-migration`** - Database migration
5. **`validate-migrations`** - Migration validation
6. **`validate-quality-gate`** - Quality gate validation
7. **`generate-role-files`** - Role file generation
8. **`create-missing-files`** - File creation
9. **`run-e2e-tests`** - E2E testing
10. **`code-analysis`** - General code analysis

### Priority 2: Medium-Value Actions (10)

11. **`analyze-test-coverage`** - Test coverage
12. **`analyze-vue-components`** - Vue component analysis
13. **`migrate-date-formatting`** - Date migration
14. **`migrate-state-management`** - State migration
15. **`fill-adr-roles`** - ADR role fill
16. **`test-auth`** - Auth testing
17. **`collect-test-metrics`** - Metrics collection
18. **`analyze-performance`** - Performance analysis
19. **`validate-links`** - Link validation
20. **`sync-roles`** - Role sync

---

## Cross-Reference with Other Projects

| services-carrier | laravel-agent-workspace-tools | ai-survey-platform | Reuse |
|-----------------|------------------------------|-------------------|-------|
| validate-migrations.js | validate-migration-scenarios.js | validate-migrations.js | HIGH |
| generate-role-files.* | batch-generate-patches.js | generate-role-files.js | HIGH |
| migrate-*.mjs | migrate-*-components.js | migrate-*.mjs | HIGH |
| code-analysis.mjs | - | code-analysis.mjs | HIGH |
| final-quality-check.mjs | - | final-quality-check.mjs | HIGH |

---

## Recommendations

### 1. Create Shared Actions (Highest Reuse)

These patterns appear in all three projects:
- **`validate-migrations`** → Common validation
- **`generate-role-files`** → Role generation
- **`code-analysis`** → Code quality analysis
- **`validate-quality-gate`** → Quality gates
- **`analyze-dependencies`** → Dependency analysis

### 2. Project-Specific Actions

- **services-carrier**: `analyze-circular-deps`, `apply-migration`, `bundle-analyzer`
- **laravel-agent-workspace-tools**: `validate-architecture`, `migrate-php-components`
- **ai-survey-platform**: `validate-role-responsibility`, `testing-metrics-collector`

### 3. Action Definition Strategy

Use YAML definitions in `a2a-server/src/actions/definitions/yaml/actions/` with:
- Standard parameters: `sourceDir`, `targetDir`, `dryRun`, `backup`
- Script handlers for execution
- Read handlers for file operations

---

## Definition of Done

- [x] Scripts categorized by functionality (7 categories)
- [x] Action candidates identified (20 high-value)
- [x] Priority list created
- [x] DEV_STATE.md to be updated with findings
