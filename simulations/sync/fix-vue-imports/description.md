# Fix Vue Imports Simulation

## Тип: Actions

Це симуляція типу **Actions** — сервер веде кроки; після resolve можливий **частковий** результат і перехід у **Coder**
або залишити як є.

## Потік (5 кроків)

| Крок | Internal step       | Клієнт / відповідь сервера                                               |
|------|---------------------|--------------------------------------------------------------------------|
| 1    | router              | `execute.form` — вибір fix-vue-imports                                   |
| 2    | vue-import-detect   | `execute.script` — детект                                                |
| 3    | vue-import-resolve  | `execute.script` — resolve                                               |
| 4    | vue-import-escalate | Після `partial_escalate`: `execute.form` — **Coder** або частковий вихід |
| 5    | (handoff)           | `result.choice: coder` → `execute.message` + `result` handoff у Coder    |

Другий сценарій (відмова від Coder, повернення до роутера + нова задача): [
`fix-vue-imports-decline`](../fix-vue-imports-decline/description.md).

Full scripted chain reference (10-step central golden): **`sync/script`** ([`../script/description.md`](../script/description.md)).

## Структура файлів

```
simulations/fix-vue-imports/
├── description.md
├── analysis.md
├── 1/ … 5/   (client, request, response, received; опційно server-transforms-*.json)
```
