# Task: ai-survey-platform

**Contents:** Laravel project with survey functionality. Contains a `scripts` folder with various utility scripts (JS, PowerShell) for documentation validation, analysis, migration, etc.

**Laravel relevance:** yes

**Executable scripts:** Yes, many .mjs, .js, .ps1 scripts. However, they are tightly coupled to the ai-survey-platform's internal tooling (documentation, validation, migration) and may not be suitable for generic A2A server actions without modification.

**Integration:** Examine scripts for potential A2A actions (e.g., documentation analysis, link validation, migration helpers). Note that many are environment-specific or project-specific.

**Next action:** Defer for now (or mark as candidate for further review) unless a specific script is referenced.