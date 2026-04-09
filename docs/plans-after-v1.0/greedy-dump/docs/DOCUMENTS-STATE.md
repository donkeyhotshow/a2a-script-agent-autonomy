# Documents state (WMD ledger)

**Purpose:** Track which markdown/task documents exist for the greedy-dump import and how they relate to implementation.

| Doc | Location | Status | Next action |
|-----|----------|--------|-------------|
| Index | `greedy-dump/README.md` | active | Keep in sync with STATE |
| Source pointer | `greedy-dump/SOURCE.md` | active | Update if SOURCE moves |
| Sequence | `greedy-dump/STATE.md` | active | Bump after each merge |
| Task tree | `greedy-dump/TASK-TREE.md` | active | Add node when new subfolder appears |
| This ledger | `greedy-dump/docs/DOCUMENTS-STATE.md` | active | Row per new `TASK.md` |
| Plans extract (Laravel/Inertia) | `greedy-dump/docs/PLANS-LARAVEL-INERTIA-SCRIPT-EXTRACT.md` | active | Use as migration shortlist for server action backlog |
| Per-slice tasks | `greedy-dump/mirror/**/TASK.md` | active | Link PR / ADR when coded |
| Repo queue entry | `tasks/pending/greedy-dump-integration.md` | active | Close when import strategy is fully executed or superseded |
| admin-app | `greedy-dump/mirror/priority-3/admin-app/TASK.md` | deferred | Scripts are environment-specific sync utilities; not suitable for generic A2A actions |
| ai-survey-platform | `greedy-dump/mirror/priority-3/ai-survey-platform/TASK.md` | deferred | Laravel project with survey scripts; deferred for now (or marked as candidate) |
| ai-troci | `greedy-dump/mirror/priority-3/ai-troci/TASK.md` | deferred | Assets only (docx, Parser.7z, RECON-REPORT.md) — no scripts |
| app-watchdog | `greedy-dump/mirror/priority-3/app-watchdog/TASK.md` | pending | Has scripts (kill-by-port, export, generate-install) — Node.js, candidate for A2A actions |
| context-gates | `greedy-dump/mirror/priority-3/context-gates/TASK.md` | deferred | Config only (README.md, metadata JSON) — no scripts |
| data-engine | `greedy-dump/mirror/priority-3/data-engine/TASK.md` | pending | Large Node.js ETL project — many scripts (cli, mcp, server) |
| desktop-app-clicker | `greedy-dump/mirror/priority-3/desktop-app-clicker/TASK.md` | pending | Has scripts (lab-window-debug, generate_temp_templates) — desktop automation |
| main-gateway | `greedy-dump/mirror/priority-3/main-gateway/TASK.md` | pending | Has scripts folder + server.js — gateway service |
| neural-train-and-chat | `greedy-dump/mirror/priority-3/neural-train-and-chat/TASK.md` | deferred | Config/docs only (no scripts folder) |
| outsource-code-to-the-json | `greedy-dump/mirror/priority-3/outsource-code-to-the-json/TASK.md` | deferred | Docs only (multiple .md files, __.index.json) — no scripts |
| projects-manager | `greedy-dump/mirror/priority-3/projects-manager/TASK.md` | pending | Has many scripts (daemon, launcher, test runners) — candidate for A2A actions |
| prompt-sequences | `greedy-dump/mirror/priority-3/prompt-sequences/TASK.md` | pending | Has scripts (generate-sequence.js, validate-sequences.js) — Node.js utility for prompt sequences |
| prompting-handler | `greedy-dump/mirror/priority-3/prompting-handler/TASK.md` | pending | Has scripts (run_app.bat, start_prompting_handler.bat, etc.) — Windows batch files for service control |
| search-indexer | `greedy-dump/mirror/priority-3/search-indexer/TASK.md` | pending | Has scripts (docker-compose.yml, load-config.ps1, manage-container.ps1) — container management |
| services-carrier | `greedy-dump/mirror/priority-3/services-carrier/TASK.md` | pending | Has scripts (scripts/ directory with 81 JS/TS/PowerShell files) — service mesh utilities |
| site-cloner | `greedy-dump/mirror/priority-3/site-cloner/TASK.md` | pending | Has scripts (analyze-expo-app.mjs, install-global.mjs, publish-package.mjs) — site analysis/cloning utilities |
| smell-library | `greedy-dump/mirror/priority-3/smell-library/TASK.md` | pending | Has scripts (ML pipeline, algorithms, transforms, utils, tools, examples) — code smell detection/analysis |
| standards-manager | `greedy-dump/mirror/priority-3/standards-manager/TASK.md` | pending | Has scripts (cli.js, puppeteer-test.js, validator.js, src/, standards/, rules/, checklists/, logs/, work_sequences/, work_types/) — standards validation/management |
| testing-taskmanager | `greedy-dump/mirror/priority-3/testing-taskmanager/TASK.md` | pending | Has scripts (check-bibliography.js, check-libs-health.js, demo-testing-integration.js, discover-test-scenarios.js, discover-workspace-tests.js, fix-test-imports.cjs, health-check.cjs, regenerate-test-suites.cjs, run-basic-tests.js, run-manual-tests.js, run-validator-isolated.js, test-available-libs.js, test-libs-integration.js, test-taskmanager-libs.js, validate-test-scenarios.js, daemon-cli.js, mcp-client.js, run-tests.js, test-simple.js, test-standalone-server.cjs, src/, libs/, mcp/, plugins/, state/, utils/, work/, tasks/, tasks-from-tests/, tests/, tests-tasks/, tmp/) — testing/task management system |
| ai-prompts-saver | `greedy-dump/mirror/enggineered-prompts/ai-prompts-saver/TASK.md` | deferred | Assets only (ai-prompts-saver-333.mdc, ai-prompts-saver-v1.2.mdc, ai-prompts-saver.mdc, system-role-v0.md) — no scripts |
| aleon | `greedy-dump/mirror/enggineered-prompts/aleon/TASK.md` | deferred | Assets only (rrrrrude/ directory with METOdics.md and mix files) — no scripts |
| cursor-agent-main | `greedy-dump/mirror/enggineered-prompts/cursor-agent-main/TASK.md` | pending | Has scripts (src/index.ts, src/index.test.ts, agents/, example-task/, tests/) — TypeScript agent framework |
| start-session | `greedy-dump/mirror/enggineered-prompts/start-session/TASK.md` | deferred | Assets only (multiple .md files: ai_adapted_prompt.md, conceptual-module-upgrade.md, etc.) — no scripts |
| cursor-story | `greedy-dump/mirror/enggineered-prompts/cursor-story/TASK.md` | deferred | Assets only (ultra-wide-turbo-workspace-main/ directory with .txt files) — no scripts |
| obrabotano | `greedy-dump/mirror/obrabotano/TASK.md` | deferred | Large Node.js project with many scripts; defer for now to focus on Laravel sub-agent.

## Conventions

- **WMD** here means *workflow markdown documents*: human-readable state, not runtime config.
- When a slice is implemented in `a2a-server`, add a row: server path, action id, simulation id if any.
- Do not duplicate large binaries; reference `SOURCE.md` path instead.
