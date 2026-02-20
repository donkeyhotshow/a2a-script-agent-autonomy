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
│  │  Tier 1: Эвристики      │    │  • Нейроны Laravel 11       │ │
│  │  • Query Type Rules     │    │  • Knowledge Graph          │ │
│  │  • File Type Rules      │    │  • Context Handler          │ │
│  │  • Intent Rules         │    │  • Protocol Handler         │ │
│  │                         │    │                             │ │
│  │  Tier 2: ML-модели      │    │                             │ │
│  │  • Query Classifier     │    │                             │ │
│  │  • File Classifier      │    │                             │ │
│  │  • Intent Detector      │    │                             │ │
│  │  • Chunk Relevance      │    │                             │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hybrid Strategy (Tier 1 + Tier 2)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│   Tier 1    │────▶│   Tier 2    │────▶│   Output    │
│             │     │  Эвристики  │     │  ML Models  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    top-N кандидатов
```

**Tier 1 (дёшево, быстро):**
- Query Type Rules — regex для классификации запросов
- File Type Rules — regex для классификации файлов
- Intent Rules — keywords для определения намерений

**Tier 2 (точнее, дороже):**
- Query Type Classifier — ML для запросов
- File Type Classifier — ML для файлов
- Intent Detector — ML для намерений
- Chunk Relevance Predictor — ML для RAG

---

## Чанки задач

| Чанк | Фокус | Файл | Приоритет |
|------|-------|------|-----------|
| **Client-1** | Tier 1: Эвристики | [a2a-client/TODO.md](a2a-client/TODO.md) | 🔴 Высокий |
| **Client-2** | Tier 1: Полнотекстовый | [a2a-client/TODO.md](a2a-client/TODO.md) | 🔴 Высокий |
| **Client-3** | Tier 2: ML-модели | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟡 Средний |
| **Client-4** | RAG и Embeddings | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟡 Средний |
| **Client-5** | Интеграция с сервером | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟡 Средний |
| **Client-6** | Обучение и Feedback | [a2a-client/TODO.md](a2a-client/TODO.md) | 🟢 Низкий |
| **Server-1** | Нейроны | [a2a-server/TODO.md](a2a-server/TODO.md) | 🔴 Высокий |
| **Server-2** | Knowledge Graph | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟡 Средний |
| **Server-3** | Context Handler | [a2a-server/TODO.md](a2a-server/TODO.md) | 🔴 Высокий |
| **Server-4** | Интеграция | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟡 Средний |
| **Server-5** | Очистка | [a2a-server/TODO.md](a2a-server/TODO.md) | 🟢 Низкий |

---

## Что обучается

| Компонент | Где | Как |
|-----------|-----|-----|
| **Tier 2 ML-модели** | a2a-client | На данных запросов и feedback |
| **Нейроны** | a2a-server | Через вопросы пользователю |

Подробнее: [plans/a2a-training-plan.md](plans/a2a-training-plan.md)

---

## Документы

| Документ | Описание |
|----------|----------|
| [plans/a2a-ml-knowledge-separation-plan.md](plans/a2a-ml-knowledge-separation-plan.md) | Разделение ML и Knowledge Graph |
| [plans/a2a-training-plan.md](plans/a2a-training-plan.md) | План обучения |
| [a2a-client/packages/config/README.md](a2a-client/packages/config/README.md) | ML Strategy Configuration |

---

## Быстрый старт

### Приоритет 1 (начать с этого)
1. **Client-1:** Tier 1 эвристики (fs-utils, graph, intent rules)
2. **Client-2:** Tier 1 полнотекстовый поиск
3. **Server-1:** Создать базовые нейроны Laravel 11
4. **Server-3:** Реализовать Context Handler

### Приоритет 2
5. **Client-3:** Tier 2 ML-модели
6. **Client-4:** RAG и Embeddings
7. **Server-2:** Knowledge Graph
8. **Server-4:** API endpoints

### Приоритет 3
9. **Client-5:** Интеграция с сервером
10. **Client-6:** Обучение и Feedback
11. **Server-5:** Очистка кода

---

**Дата создания:** 2026-02-20
