# Auto-AI — workflow (extensive case)

## Steps

| Step | Request                                                         | Response                                      |
|------|-----------------------------------------------------------------|-----------------------------------------------|
| 1    | task (refactor API: logging, health, tests, lint, test, report) | actions [auto-ai]                             |
| 2    | result.action: "auto-ai"                                        | execute.form (message)                        |
| 3    | result.message (full task)                                      | LLM → execute.rag-search (API app routes)     |
| 4    | result.rag-search                                               | LLM → execute.list-directory (src/)           |
| 5    | result.list-directory                                           | LLM → execute.read-file (src/app.js)          |
| 6    | result.read-file (app.js)                                       | LLM → execute.read-file (src/routes/index.js) |
| 7    | result.read-file (routes)                                       | LLM → execute.write-file (health route)       |
| 8    | result.write-file                                               | LLM → execute.write-file (logging middleware) |
| 9    | result.write-file                                               | LLM → execute.grep-search (API tests)         |
| 10   | result.grep-search                                              | LLM → execute.read-file (test file)           |
| 11   | result.read-file (test)                                         | LLM → execute.write-file (update test)        |
| 12   | result.write-file                                               | LLM → execute.execute-command (npm run lint)  |
| 13   | result.execute-command (lint)                                   | LLM → execute.execute-command (npm test)      |
| 14   | result.execute-command (test)                                   | LLM → execute.write-file (report)             |
| 15   | result.write-file (report)                                      | LLM → completed + form                        |
| 16   | result.message ("thanks")                                       | completed, form again (optional)              |

## Actions in this flow

| Action          | Steps                  |
|-----------------|------------------------|
| form            | 2, 15, 16              |
| rag-search      | 3→4                    |
| list-directory  | 4→5                    |
| read-file       | 5→6, 6→7, 10→11        |
| write-file      | 7→8, 8→9, 11→12, 14→15 |
| grep-search     | 9→10                   |
| execute-command | 12→13, 13→14           |
| completed       | 15, 16                 |

## Purpose

Validate orchestration and context when the AI runs a long chain: multiple read-file, multiple write-file,
list-directory, grep-search, two execute-commands, then report and completed.
