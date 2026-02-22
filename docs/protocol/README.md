# Протокол A2A

**Индекс документации протокола**

---

## Документы

| Документ | Описание |
|----------|----------|
| [overview.md](overview.md) | Обзор протокола и ключевые принципы |
| [context.md](context.md) | Структура поля `context` |
| [codeblocks.md](codeblocks.md) | Структура поля `codeBlocks` |
| [first-request.md](first-request.md) | Первый запрос сессии |
| [flow.md](flow.md) | Жизненный цикл итеративного обмена |

---

## Кратко

**Протокол:** JSON REST API

**Принцип:**
1. Клиент отправляет `context` + `codeBlocks`
2. Сервер обрабатывает, обновляет `context`, добавляет задачи
3. Сервер НЕ хранит состояние
4. Цикл повторяется до `outcome: "completed"`

---

## Ссылки

- [JSON API](../protocol-json-api.md) — примеры запросов/ответов
- [Нейроны](../neurons/README.md) — система детекции
- [Граф знаний](../graph-local-config.md) — структура графа
