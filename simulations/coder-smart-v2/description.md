# Coder Smart v2 Simulation

Fork of **coder-smart** with action id **`coder-smart-v2`**. Request transforms use **`truncate-section`** on `context.workbench.sections` where applicable (ISSUE 5). Step **2** `request.json` includes `context.execution` for `server-invoke-request.schema.json`.

## Тип: AI-Actions

Це симуляція типу **AI-Actions** - LLM динамічно вирішує наступний крок, кроки не захардкожені.

## Опис

Послідовний аналіз через діалог і RAG: уточнення задачі → план дослідження коду → чеклист виконання. Документ формується
поетапно (спочатку віртуально), потім записується в `.carrier/tasks/` і виконується по пунктах з обнуленням history
після кожного кроку.

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
2. **rag-clarify** — RAG-пошук для отримання даних для уточнення задачі; потім промпт у LLM: на основі запиту та
   RAG-результатів сформувати уточнену формулювання. Віртуальний док: секції 1 + 2.
3. **rag-research-plan** — RAG-пошук за уточненою задачею для формування плану дослідження коду; потім промпт у LLM:
   скласти план дослідження кодової бази. Віртуальний док: секції 1 + 2 + 3.
4. **checklist** — промпт у LLM: скласти чеклист виконання роботи. Віртуальний док: 1 + 2 + 3 (позначити як виконаний) +
    4.
5. **write-doc** — записати документ у папку **`.carrier/tasks/`**.
6. **execute-item** — цикл виконання пунктів чеклиста: history обнуляється, першим повідомленням йде контент MD-файлу
   задачі; LLM виконує перший невиконаний пункт; після виконання документ оновлюється (позначка `[x]`), знову запис у
   `.carrier/tasks/`, history обнуляється — і так далі до кінця чеклиста.

## Правила

- Діалог іде через **execute.form** (message) та **result.message**; RAG — через **execute.rag-search** та **result** з
  результатами пошуку.
- До запису файлу документ зберігається віртуально на сервері (context / state).
- Після запису в `.carrier/tasks/` кожна ітерація виконання пункту: history = [контент документу], LLM повертає result +
  updatedTaskDoc, клієнт оновлює файл.

## Структура файлів симуляції

```
simulations/coder-smart-v2/
├── description.md
├── analysis.md
├── 1/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 2/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 3/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 4/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 5/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 6/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── 7/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 8/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
└── 9/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json

