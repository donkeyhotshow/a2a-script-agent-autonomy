# A2A — AGENTS.md (что делать прямо сейчас)

## Главное направление (текущий виток)

**Модернизация системы нейронов** — переход от статических триггеров к итеративному анализу задач. new_task активирует нейроны анализа, сервер формирует ответ без new_task, но задача и активированные нейроны добавляются в tasks[].

**Документация:** [docs/neuron-modernization.md](docs/neuron-modernization.md) — полное описание новой архитектуры.

---

## Документация по протоколу (клиент-сервер) ⭐⭐⭐

**Важно:** Полная документация по протоколу общения клиента и сервера находится в разделе `docs/protocol/`.

### Основные документы протокола

| Документ | Назначение |
|---------|-----------|
|[Протокол: оглавление](docs/protocol/README.md)|Индекс всей документации протокола|
|[Обзор: ключевые принципы](docs/protocol/overview.md)|Формат, stateless context, итеративный обмен|
|[Структура context](docs/protocol/context.md)|Поле context в запросах/ответах|
|[Структура codeBlocks](docs/protocol/codeblocks.md)|Блоки кода в запросах|
|[Первый запрос сессии](docs/protocol/first-request.md)|Первый запрос сессии|
|[Жизненный цикл потоков](docs/protocol/flow.md)|Жизненный цикл итераций|
|[JSON API примеры](docs/protocol-json-api.md)|Примеры curl-запросов|

---

## Ссылки

| Что | Куда |
|-----|------|
| Модернизация нейронов | [docs/neuron-modernization.md](docs/neuron-modernization.md) |
| Протокол (полный) | [docs/protocol/README.md](docs/protocol/README.md) |
| Архив нейронов (legacy) | [archive/neurons-legacy/README.md](archive/neurons-legacy/README.md) |
| Etalon активация | [docs/etalon-neuron-activation.md](docs/etalon-neuron-activation.md) |
| ADR | [docs/adr/](docs/adr/) |

---

## Новая архитектура

### Workflow

```
User → new_task → TaskDetailAnalyzer → NeuronActivator → TaskProcessor → Response (tasks[])
                           ↓                  ↓                 ↓
                    Определение          Активация        Формирование
                    детализации          нейронов         tasks[] без new_task
```

### Определение детализации задачи

| Уровень | Обработка |
|---------|-----------|
| **short** | Требует уточнения контекста проекта |
| **medium** | Понятна структура, нужны файлы |
| **detailed** | Готова к обработке |

### Итерации

| Итерация | Нейроны |
|----------|---------|
| **Iter1** | task-semantic-analyzer, project-context-detector |
| **Iter2** | file-collector, code-analyzer |
| **IterN** | external-ai-trigger |

---

## Запуск сервера

```
bash
# Из корня проекта
npm run dev

# Или только сервер
npm run dev:api

# Без авторизации (разработка)
cd a2a-server && npm run dev:no-auth
```

---

## Быстрый старт (JSON API)

**Base URL:** `http://localhost:3000/api/v1`  
**Auth:** `Bearer a2a_dev_password`

```bash
# Отправить задачу
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Authorization: Bearer a2a_dev_password" \
  -H "Content-Type: application/json" \
  -d '{
    "context": { "new_task": ["implement user login"] },
    "codeBlocks": [{ "path": "package.json", "content": "..." }]
  }'
```

---

## Структура нейронов (новая)

```
typescript
interface Neuron {
  id: string;
  name: string;
  category: 'task_analysis' | 'context_gathering' | 'file_management' | 'code_analysis' | 'generation' | 'external_ai';
  triggers: string[];
  knowledge: object;
  actions: { type: 'analyze' | 'classify' | 'inject' | 'collect' | 'trigger'; target?: string }[];
  triggersMode: 'any' | 'all';
  priority: number;
}
```

---

## Следующие шаги

1. Реализовать TaskDetailAnalyzer
2. Создать нейроны анализа задач в a2a-server/src/neurons/
3. Обновить RequestProcessor для формирования tasks[]
4. Переместить legacy нейроны в archive/neurons-legacy/

---

**Обновлено:** 2026-02-23
