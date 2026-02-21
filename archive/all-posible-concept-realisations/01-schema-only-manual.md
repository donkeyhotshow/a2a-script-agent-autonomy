# Вариант 1: Граф = только схема (ручная)

**Суть:** Граф — это schema: neurons, entity types, relation types. Никакого instance из кода. Всё задаётся в LOADING.md / конфиге.

---

## Что есть

- **Neurons** — триггеры по путям/паттернам (FormRequest, app/Models/, .vue). Активируются при partial match.
- **Entity types** — model, controller, service, request, vue-component… Список типов, не экземпляры.
- **Relation types** — uses, extends, belongs-to, handles, validates… Список связей, не рёбра графа.
- **Context blocks** — builtin (neuron-context-laravel-11 и т.п.).

Всё это — справочник. Не хранится per-project.

---

## Поток работы

1. Клиент шлёт `project_path`, `new_task`, `codeBlocks` (файлы).
2. Сервер по путям файлов активирует нейроны (триггеры).
3. Активированные нейроны → inject context blocks в промпт.
4. Entity/relation types используются как подсказки: «ожидаем controller, request, model» — для формирования request_files или hints, но не для извлечения.
5. Контекст (файлы + blocks) → ChatGPT.
6. Результат → клиенту.

---

## Что остаётся в коде

- `context-handler.ts` — new_task → tasks, активация нейронов
- `context-injector.ts` — @INJECT из нейронов
- Нейроны, триггеры, context blocks (LOADING.md)
- Entity/relation types как enum/список — для подсказок

---

## Что убирается

- `recognizeEntitiesBatch()` — не вызываем
- `buildAndStoreGraph()` — не вызываем
- `graph-store.ts` — Map<project_path, StoredGraph> не нужен (или только для кэша schema)
- `question-generator.ts` — questions про «добавь controller», «graph incomplete» — убрать
- Итеративный сбор файлов через graph_incomplete — убрать

---

## Откуда request_files

Не из «граф неполный». Варианты:
- Из нейронов с подозрением (производные нейроны → request_files)
- Из индекса (поиск по new_task)
- Из шаблона задачи (если есть)

---

## Итог

Граф = справочник типов и правил. Instance (конкретные RegisterController, User) не храним. Схема помогает собирать контекст и подсказки, но не строится из кода.
