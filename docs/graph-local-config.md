# Граф знаний: локальная настройка

**Индекс:** [docs/README.md](README.md)

Граф знаний **настраивается локально вручную**, а не через диалог клиент–сервер.

---

## Принцип

| Что | Как |
|-----|-----|
| **Граф** | Локальный конфиг: neurons, entity types, relation types |
| **Источник** | Конфиги проекта, [a2a-server/docs/neurons.md](../a2a-server/docs/neurons.md) |
| **Не** | Диалог, произвольные задачи от клиента |

---

## Компоненты графа (локальные)

- **Neurons** — триггеры, категории ([a2a-server/docs/neurons.md](../a2a-server/docs/neurons.md))
- **Entity types** — model, controller, service, request, vue-component, …
- **Relation types** — uses, extends, belongs-to, handles, validates, …
- **Context blocks** — builtin (neuron-context-laravel-11 и т.п.)

Всё это задаётся в конфиге/коде, не приходит от клиента.

---

## Поток работы

```
Клиент                    Сервер
   │                         │
   │  project_path + files   │  Сбор контекста
   │ ─────────────────────► │  (codeBlocks → entities, relations)
   │                         │
   │                         │  Граф полный?
   │                         │  → Да: выполнить задачу через ChatGPT
   │                         │  → Нет: question (request_files)
   │                         │
   │  result / request_files │
   │ ◄───────────────────── │
   │                         │
   │  codeBlocks (файлы)     │  Клиент выдаёт файлы
   │ ─────────────────────► │
```

---

## Роли

| Роль | Действие |
|------|----------|
| **Сервер** | Собирает контекст из codeBlocks, строит граф, после сбора — выполняет задачу через ChatGPT |
| **Клиент** | Выдаёт файлы (path + content) по запросу сервера |

Граф не «обучается» в диалоге — он задан локально. Диалог только доставляет файлы и получает результат.
