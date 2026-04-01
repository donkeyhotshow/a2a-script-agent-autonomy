# agent

**Повне покриття** типів `execute`, які web-клієнт може отримати в режимі **agent**, у **одному** золотому ланцюжку в контексті репо **a2a-script-agent** (`simulations/sync/agent`, орієнтири `SCHEMA.md`, `sim-validate.ts`, приклад **workbench.files** як у [`agent-coder-smart`](../agent-coder-smart/)).

Усі кроки **без LLM** у фікстурах (`server-transforms-request.json` = passthrough `copy`): це **контрактний** реплей, не жива розмова.

## Файли на крок (7)

| Файл | Примітка |
|------|----------|
| `client.json`, `request.json`, `server-transforms-request.json`, `response.json`, `received.json` | Обов’язковий JSON-контракт |
| `request.md`, `response.md` | Дзеркало JSON у першому \`\`\`json\`\`\` блоці для `a2a-server` `npm run sim:check-md` |
| *(немає)* `server-transforms-response.json` | Свідомо **немає** на no-LLM кроках ([`SCHEMA.md`](../../SCHEMA.md)) |

## Кроки (15)

| # | Execute (один ключ) |
|---|----------------------|
| 1 | `form` choices — роутер |
| 2 | `form` input — вхід у agent |
| 3 | `form` choices — human gate |
| 4 | `rag-search` |
| 5 | `list-directory` |
| 6 | `read-file` |
| 7 | `grep-search` |
| 8 | `file-exists` |
| 9 | `edit-patch` (фікстура `simulations/sync/agent/.e2e-fixture.md` — лише для золота) |
| 10 | `write-file` → `.carrier/tasks/agent-e2e-audit.md` + `workbench.sections.files[]` |
| 11 | `execute-command` |
| 12 | `run-script` |
| 13 | `script` (DSL) |
| 14 | `message` |
| 15 | `form` input — завершення / наступне питання |

## Run

```bash
npm run sim:validate -- --sim sync/agent/15
npm run sim:quality
```
