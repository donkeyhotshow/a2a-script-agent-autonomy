# Coder Smart Simulation

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Опис

Послідовний аналіз через діалог і RAG: уточнення задачі → план дослідження коду → чеклист виконання. Документ формується поетапно (спочатку віртуально), потім записується в `.carrier/tasks/` і виконується по пунктах з обнуленням history після кожного кроку.

## Формат MD-файлу задачі

Файл у **`.carrier/tasks/<id>.md`** (або аналог):

```markdown
# 1. Запит користувача

<оригінальний текст>

# 2. Уточнена формулювання

<покращене формулювання після RAG + LLM>

# 3. План дослідження кодової бази

<план отриманий після RAG + LLM; пізніше позначається як виконаний>

# 4. Чеклист на виконання

- [ ] Пункт 1
- [ ] Пункт 2
```

## Послідовність steps (аналіз)

1. **user-request** — захоплення запиту користувача (віртуальний док: тільки секція 1).
2. **rag-clarify** — RAG-пошук для отримання даних для уточнення задачі; потім промпт у LLM: на основі запиту та RAG-результатів сформувати уточнену формулювання. Віртуальний док: секції 1 + 2.
3. **rag-research-plan** — RAG-пошук за уточненою задачею для формування плану дослідження коду; потім промпт у LLM: скласти план дослідження кодової бази. Віртуальний док: секції 1 + 2 + 3.
4. **checklist** — промпт у LLM: скласти чеклист виконання роботи. Віртуальний док: 1 + 2 + 3 (позначити як виконаний) + 4.
5. **write-doc** — записати документ у папку **`.carrier/tasks/`**.
6. **execute-item** — цикл виконання пунктів чеклиста: history обнуляється, першим повідомленням йде контент MD-файлу задачі; LLM виконує перший невиконаний пункт; після виконання документ оновлюється (позначка `[x]`), знову запис у `.carrier/tasks/`, history обнуляється — і так далі до кінця чеклиста.

## Правила

- Діалог іде через **execute.form** (message) та **result.message**; RAG — через **execute.rag-search** та **result** з результатами пошуку.
- До запису файлу документ зберігається віртуально на сервері (context / state).
- Після запису в `.carrier/tasks/` кожна ітерація виконання пункту: history = [контент документу], LLM повертає result + updatedTaskDoc, клієнт оновлює файл.

## Структура файлів симуляції

```
simulations/coder-smart/
├── description.md
├── analysis.md
├── 1/ request.json, response.json   # task → actions з steps
├── 2/ request.json, response.json   # вибір action → form (message)
├── 3/ request.json, response.json   # result.message (запит) → execute.rag-search (clarify)
├── 4/ request.json, server-transforms-request.md, request.md, response.md, server-transforms-response.md, response.json  # RAG results → LLM clarify → doc 1+2, execute.rag-search (plan)
├── 5/ request.json, server-transforms-request.md, request.md, response.md, server-transforms-response.md, response.json  # RAG results → LLM research plan → doc 1+2+3
├── 6/ request.json, server-transforms-request.md, request.md, response.md, server-transforms-response.md, response.json  # LLM checklist → doc 1+2+3(done)+4, execute.write-file
├── 7/ request.json, response.json   # result.written → execute.form (doc content)
├── 8/ request.json, server-transforms-request.md, request.md, response.md, server-transforms-response.md, response.json   # result.message (doc) → LLM execute item → write-file
└── 9/ request.json, response.json   # result.written → execute.form (наступна ітерація)

