# A2A Coding Orchestrator — Главный TODO

## Обзор проекта

**A2A (Agent-to-Agent)** — система для анализа Laravel проектов с использованием ML и Knowledge Graph.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        A2A System                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │      a2a-client         │    │       a2a-server            │ │
│  │                         │    │                             │ │
│  │  • Индексация проекта   │◄──►│  • Нейроны Laravel 11       │ │
│  │  • Embeddings           │    │  • Knowledge Graph          │ │
│  │  • Поиск (hybrid)       │    │  • Context Handler          │ │
│  │  • Граф файлов          │    │  • Protocol Handler         │ │
│  │  • RAG                  │    │                             │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Чанки задач

| Чанк | Фокус | Файл | Приоритет |
|------|-------|------|-----------|
| **Client-1** | Инфраструктура | [a2a-client/TODO.md](a2a-client/TODO.md) | 🔴 Высокий |
| **Client-2** | Поиск и индексация | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟡 Средний |
| **Client-3** | Граф и связи | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟡 Средний |
| **Client-4** | ML компоненты | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟢 Низкий |
| **Server-1** | Нейроны | [a2a-server/TODO.md](a2a-server/TODO.md) | 🔴 Высокий |
| **Server-2** | Knowledge Graph | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟡 Средний |
| **Server-3** | Context Handler | [a2a-server/TODO.md](a2a-server/TODO.md) | 🔴 Высокий |
| **Server-4** | Интеграция | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟡 Средний |
| **Server-5** | Очистка | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟢 Низкий |

---

## Что обучается

| Компонент | Где | Как |
|-----------|-----|-----|
| **Embeddings** | a2a-client | На коде проекта |
| **Search Ranking** | a2a-client | Через feedback |
| **Нейроны** | a2a-server | Через вопросы пользователю |

Подробнее: [plans/a2a-training-plan.md](plans/a2a-training-plan.md)

---

## Документы

| Документ | Описание |
|----------|----------|
| [plans/a2a-ml-knowledge-separation-plan.md](plans/a2a-ml-knowledge-separation-plan.md) | Разделение ML и Knowledge Graph |
| [plans/a2a-training-plan.md](plans/a2a-training-plan.md) | План обучения |
| [plans/a2a-server-api-specification.md](plans/a2a-server-api-specification.md) | API спецификация |
| [plans/a2a-server-database-schema.md](plans/a2a-server-database-schema.md) | Схема БД |

---

## Быстрый старт

### Приоритет 1 (начать с этого)
1. **Server-1:** Создать базовые нейроны Laravel 11
2. **Server-3:** Реализовать Context Handler
3. **Client-1:** Настроить интеграцию с сервером

### Приоритет 2
4. **Server-2:** Knowledge Graph
5. **Client-2:** Поиск и индексация
6. **Server-4:** API endpoints

### Приоритет 3
7. **Client-3:** Граф и связи
8. **Client-4:** ML компоненты
9. **Server-5:** Очистка кода

---

**Дата создания:** 2026-02-20
