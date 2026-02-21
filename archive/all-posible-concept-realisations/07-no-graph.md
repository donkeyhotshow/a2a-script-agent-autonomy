# Вариант 7: Без графа

**Суть:** Концепция графа убрана полностью. Только индекс + нейроны + context blocks. Ни schema, ни instance.

---

## Что есть

- **Индекс (ML)** — поиск по коду, embeddings. Файлы проекта проиндексированы.
- **Нейроны** — триггеры по путям/паттернам. Активируются при partial match.
- **Context blocks** — builtin (neuron-context-laravel-11 и т.п.).
- **Нет** entity types, relation types как отдельной сущности «граф».

---

## Поток работы

1. Клиент шлёт `project_path`, `new_task`, `codeBlocks` (файлы).
2. Индекс: по new_task ищет релевантные файлы. Клиент может прислать часть, индекс дополняет.
3. Нейроны: по путям (из codeBlocks + из индекса) активируются триггеры.
4. Активированные нейроны → inject context blocks.
5. Контекст = файлы + blocks → ChatGPT.
6. Результат → клиенту.

---

## Что остаётся в коде

- `context-handler.ts` — new_task → tasks, активация нейронов
- `context-injector.ts` — @INJECT из нейронов
- Индекс (поиск, embeddings)
- Нейроны, триггеры, context blocks

---

## Что убирается

- `entity-recognizer.ts` — целиком
- `relation-mapper.ts` — целиком
- `graph-store.ts` — целиком
- `question-generator.ts` — целиком
- `graph-log.ts` — целиком
- Entity types, relation types из LOADING.md — не используются
- `recognizeEntitiesBatch`, `buildAndStoreGraph` — не вызываем
- graph_incomplete, questions — не возвращаем

---

## Откуда request_files

- Из нейронов (производные нейроны при подозрении)
- Из индекса (поиск по запросу)
- Клиент сам решает, что прислать

---

## Отличие от Schema only

| | Schema only | No graph |
|---|-------------|----------|
| Entity/relation types | Есть как справочник | Нет |
| Подсказки «ожидаем controller» | Да | Нет |
| Валидация по типам | Возможна | Нет |
| Сложность | Чуть выше | Минимальная |

---

## Итог

Максимально упрощённо. Граф не существует. Индекс даёт поиск, нейроны — контекст. Всё остальное — ChatGPT.
