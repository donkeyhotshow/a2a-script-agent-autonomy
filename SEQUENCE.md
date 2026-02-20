# SEQUENCE — последовательность для графа знаний

**Цель:** граф работает и наполнен. Отчёт о конечном состоянии — JSON-сниппеты.

**Проект:** [DEV_PROJECT.json](DEV_PROJECT.json) — `C:\workspace\domain-platform\websitestore.com.ua`

**Payloads:** [json-in-cmd.md](json-in-cmd.md) | **Поток:** [docs/flow-graph-requests.md](docs/flow-graph-requests.md)

---

## Последовательность

### 1. Запустить сервер

```bash
npm run dev:api
# или: cd a2a-server && npm run dev
```

### 2. Итерация 1 — пустой запрос, получить вопрос

Request: [json-in-cmd.md](json-in-cmd.md) (Iter1). Poll `GET /api/v1/requests/{promiseId}/result` каждые 5–6 сек.

### 3. Результат итерации 1 — graph_incomplete

```json
{
  "result": {
    "outcome": "graph_incomplete",
    "question": "Knowledge graph incomplete. Provide codeBlocks (controller, request, service, model, vue)...",
    "questions": [{ "type": "graph_empty", "hint": "Send 1–5 key files" }]
  }
}
```

### 4. Итерация 2 — ответить codeBlocks

Request: [json-in-cmd.md](json-in-cmd.md) (Iter2). 1–5 файлов: controller, request, model, service, vue.

### 5. Повторять 3–4, пока outcome ≠ completed

При каждом `graph_incomplete` — `questions` подскажут, чего не хватает.

### 6. Конечное состояние — completed

```json
{
  "result": {
    "outcome": "completed",
    "context": { "project_path": "...", "tasks": [...] }
  }
}
```

---

## Состояние графа

Структура entities/relations: [LOADING.md](LOADING.md). Граф не возвращается в API; ключ = project_path.

---

## CLI

```bash
npm run questions
# или
node scripts/questions-cli.js C:/workspace/domain-platform/websitestore.com.ua
```
