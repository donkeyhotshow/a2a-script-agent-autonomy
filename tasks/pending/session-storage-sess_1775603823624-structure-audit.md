# Session storage audit: sess_1775603823624

## Why
Session JSON structure has contract violations or suspicious shape drift; needs normalization and root-cause fix in client storage pipeline.

## Findings
- [ ] step 2: choice[0] description contains markdown noise: "*Description:** Extract patches from AI response, store them using PatchStorage, and return modified response with patch file paths. **Source:** `laravel-agent-workspace-tools/scripts/process-response-patches.js`"
- [ ] step 2: choice[0] label contains markdown noise: "*ID:** `process-response-patches`"
- [ ] step 2: choice[10] description contains markdown noise: "*Description:** Migrate scenario-registry.json from v2 format (nested statuses) to v3 format (flat steps with tournament support). Creates backup before migration. **Source:** `laravel-agent-workspace-tools/scripts/migrate-registry.js`"
- [ ] step 2: choice[10] label contains markdown noise: "*ID:** `migrate-registry`"
- [ ] step 2: choice[11] description contains markdown noise: "*Description:** Migrate Vue.js components and TypeScript files. Handles Vue components, TypeScript, composables, stores, services with validation and categorization. **Source:** `laravel-agent-workspace-tools/scripts/migrate-vue-components.js`"
- [ ] step 2: choice[11] label contains markdown noise: "*ID:** `migrate-vue-components`"
- [ ] step 2: choice[12] description contains markdown noise: "*Priority:** 6"
- [ ] step 2: choice[12] label contains markdown noise: "Validates configuration files against JSON schemas (mirrors the `validate-config.js` script)."
- [ ] step 2: choice[1] description contains markdown noise: "*Priority:** 9"
- [ ] step 2: choice[1] label contains markdown noise: "Align Laravel / PHP `namespace` with PSR-4 paths and fix invalid `use` imports (mirrors websitestore `scripts/detect/*` and `fix_use_statements.php`)."
- [ ] step 2: choice[2] description contains markdown noise: "*Description:** Migrate test files (PHP, JavaScript, TypeScript) through the AI agent system. Handles PHPUnit, Pest, Vitest, Jest, Playwright tests with validation and categorization. **Source:** `laravel-agent-workspace-tools/scripts/migrate-tests.js`"
- [ ] step 2: choice[2] label contains markdown noise: "*ID:** `migrate-tests`"
- [ ] step 2: choice[3] description contains markdown noise: "*Description:** Run system tests using the Laravel agent system core modules. Wrapper for `runSystemTests()`. **Source:** `laravel-agent-workspace-tools/scripts/test-system.js`"
- [ ] step 2: choice[3] label contains markdown noise: "*ID:** `test-system`"
- [ ] step 2: choice[4] description contains markdown noise: "*Priority:** 8"
- [ ] step 2: choice[4] label contains markdown noise: "Validates architectural dependency rules between layers in a Laravel project (mirrors the `architecture-validator.js` script)."
- [ ] step 2: choice[5] description contains markdown noise: "*Priority:** 7"
- [ ] step 2: choice[5] label contains markdown noise: "Generates patches for Vue components based on migration inventory (mirrors the `batch-generate-patches.js` script)."
- [ ] step 2: choice[6] description contains markdown noise: "*Priority:** 20 **Project:** general"
- [ ] step 2: choice[7] description contains markdown noise: "*Description:** Dispatch CLI commands to the Laravel agent system core. Acts as a hub for routing commands to appropriate handlers. **Source:** `laravel-agent-workspace-tools/scripts/cli-hub.js`"
- [ ] step 2: choice[7] label contains markdown noise: "*ID:** `cli-hub`"
- [ ] step 2: choice[8] description contains markdown noise: "*Description:** List all tickets from the AI agent system ticket directory. Shows pending, approved, and completed tickets. **Source:** `laravel-agent-workspace-tools/scripts/list-tickets.js`"
- [ ] step 2: choice[8] label contains markdown noise: "*ID:** `list-tickets`"
- [ ] step 2: choice[9] description contains markdown noise: "*Description:** Migrate PHP business logic components (Services, Models, Controllers, Validators, DTOs) through the AI agent ticket system. Validates PHP syntax, creates backups, and categorizes files. **Source:** `laravel-agent-workspace-tools/scripts/migrate-php-components.js`"
- [ ] step 2: choice[9] label contains markdown noise: "*ID:** `migrate-php-components`"
- [ ] step 2: contains internal context.session_id in server-response.json
- [ ] step 3: contains internal context.session_id in request-to-server.json
- [ ] step 3: contains internal context.session_id in server-response.json

## Evidence paths
- `a2a-client/storage/sessions/sess_1775603823624/2/server-response.json`
- `a2a-client/storage/sessions/sess_1775603823624/3/request-to-server.json`
- `a2a-client/storage/sessions/sess_1775603823624/3/server-response.json`

## Acceptance
- [ ] Reproduce each issue from live step artifacts.
- [ ] Fix write/projection path so new sessions do not produce the same issue.
- [ ] Validate by running `npm run audit:session-storage` until this file is removed automatically.
