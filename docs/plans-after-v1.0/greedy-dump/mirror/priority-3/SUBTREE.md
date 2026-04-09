# priority-3 — per-folder tasks (tree)

Each line: folder name — short content hint — `TASK` file path (create when starting).

| Folder | Hint | Task stub |
|--------|------|-----------|
| admin-app | Admin UI / API glue | add `admin-app/TASK.md` when scoped |
| ai-survey-platform | Surveys + AI | idem |
| ai-troci | Internal codename project | idem |
| app-watchdog | Health/watchdog scripts | idem |
| context-gates | Gating / policy scripts | idem |
| data-engine | ETL or data pipelines | idem |
| desktop-app-clicker | Desktop automation | idem |
| main-gateway | Gateway services | idem |
| neural-train-and-chat | Training/chat utilities | idem |
| outsource-code-to-the-json | Code→JSON tooling | idem |
| projects-manager | Project orchestration | idem |
| prompt-sequences | Ordered prompt flows | idem |
| prompting-handler | Prompt dispatch | idem |
| search-indexer | Indexing jobs | idem |
| services-carrier | Service mesh / carrier | idem |
| site-cloner | Crawl/clone | idem |
| smell-library | Code smell catalog | idem |
| standards-manager | Lint/standard enforcement | idem |
| testing-taskmanager | Test task tracking | idem |

**Process:** For each row, create `mirror/priority-3/<folder>/TASK.md` only when that slice is scheduled (keeps file count low until needed).
