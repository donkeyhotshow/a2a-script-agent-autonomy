# A2A Client — Задачи

## Обзор

A2A Client — клиентская часть системы для индексации проектов, поиска по коду и взаимодействия с сервером.

**Архитектура:** Hybrid (Tier 1 + Tier 2)
- **Tier 1:** Дешёвые эвристики (regex, граф) — быстрая фильтрация
- **Tier 2:** ML-модели для top-N кандидатов — точное ранжирование

---

## Текущая задача: Асинхронный протокол

### Принципы

1. Клиент хранит сессии в .a2a/sessions/, текущий проект в cookie
2. Клиент отправляет запросы на сервер → получает promiseId
3. Клиент опрашивает сервер каждые 5 секунд
4. При получении результата — обновляет UI

### Задачи

- [ ] Обновить `web/js/sessions.js` — API для сессий
- [ ] Создать `web/js/api.js` — функции для API сервера
- [x] Обновить `web/js/storage.js` — cookie + API (.a2a)
- [ ] Добавить spinner стили в `web/css/style.css`
- [ ] Обновить `packages/api-client/src/async-client.js`

### Структура данных в .a2a папке проекта

```
project/
├── .a2a/
│   ├── index.json          # Индекс проекта
│   ├── sessions/
│   │   ├── sess_1.json     # Сессия с сообщениями
│   │   └── sess_2.json
│   └── config.json         # Конфигурация проекта
```

### Формат файла сессии (sessions/sess_1.json)

```json
{
  "id": "sess_1",
  "projectId": "proj_1",
  "title": "New Session",
  "createdAt": "2026-02-20T...",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Hello",
      "promiseId": "prm_xxx",
      "status": "pending",
      "createdAt": "2026-02-20T..."
    }
  ]
}
```

### UI поведение

1. Пользователь пишет сообщение
2. UI блокирует поле ввода
3. Добавляет сообщение с spinner'ом
4. Сохраняет в .a2a/sessions/
5. Отправляет POST /requests → получает promiseId
6. Сохраняет promiseId в сообщении
7. Запускает polling (setTimeout 5 сек)
8. При completed/failed:
   - Обновляет сообщение в .a2a
   - Убирает spinner
   - Разблокирует поле ввода
   - Добавляет ответ сервера как новое сообщение

---

## Чанк 1: Tier 1 — Эвристики (база)

### 1.1 Пакет fs-utils
- [ ] Рефакторинг `ignore-detector.js` — оптимизация производительности
- [ ] Добавить кэширование результатов сканирования
- [x] Vitest unit tests (ignore-detector, glob-matcher, file-scanner)

### 1.2 Пакет graph (Tier 1)
- [ ] Расширить builder для извлечения связей Laravel
- [ ] Добавить определение Eloquent relationships
- [ ] Реализовать поиск путей в графе
- [ ] **File Type Rules** — классификация файлов по regex

### 1.3 Intent Rules (Tier 1)
- [ ] Реализовать в `packages/agent/src/index.js`
- [ ] Правила: search, index, explain, refactor, test, debug
- [ ] Интеграция с hybrid-search

---

## Чанк 2: Tier 1 — Полнотекстовый поиск

### 2.1 Пакет fulltext
- [ ] Оптимизировать индексацию больших проектов
- [ ] Добавить incremental indexing
- [ ] Реализовать поиск по regex паттернам
- [ ] **Query Type Rules** — классификация запросов

### 2.2 Пакет hybrid-search (Tier 1)
- [ ] Реализовать Query Type Rules (exact, phrase, file, general)
- [ ] Интеграция с Tier 2 ML-моделями
- [ ] Настроить веса для lexical vs semantic поиска

---

## Чанк 3: Tier 2 — ML-модели (для top-N кандидатов)

### 3.1 Query Type Classifier
- [ ] Обучить на данных запросов
- [ ] Интегрировать в hybrid-search
- [ ] Настроить threshold для fallback

### 3.2 File Type Classifier
- [ ] Обучить на структуре Laravel проектов
- [ ] Интегрировать в graph builder
- [ ] Настроить threshold для fallback

### 3.3 Intent Detector
- [ ] Обучить на intent rules + реальные данные
- [ ] Интегрировать в agent
- [ ] Настроить threshold для fallback

### 3.4 Chunk Relevance Predictor
- [ ] Обучить для RAG
- [ ] Интегрировать в packages/rag
- [ ] Настроить threshold

---

## Чанк 4: RAG и Embeddings

### 4.1 Пакет rag
- [ ] Реализовать chunking стратегию для PHP кода
- [ ] Реализовать chunking стратегию для Vue компонентов
- [ ] Оптимизировать хранение embeddings

### 4.2 Embeddings
- [ ] Определить стратегию: локально vs API
- [ ] Реализовать кэширование embeddings
- [ ] Добавить поддержку разных моделей

---

## Чанк 5: Интеграция с сервером

### 5.1 Пакет api-client
- [ ] Реализовать методы для работы с сессиями
- [ ] Добавить обработку ошибок и retry логику
- [ ] Документировать API методы

### 5.2 Пакет agent
- [ ] Интеграция с a2a-server API
- [ ] Добавить WebSocket клиент для real-time обновлений
- [ ] Реализовать обработку команд от сервера

### 5.3 Синхронизация
- [ ] Отправлять структуру графа на сервер
- [ ] Получать активные нейроны от сервера
- [ ] Синхронизировать состояние сессии

---

## Чанк 6: Обучение и Feedback

### 6.1 Сбор данных
- [ ] Собирать feedback по результатам поиска
- [ ] Логировать query → results → user_action
- [ ] Подготавливать данные для fine-tuning

### 6.2 Метрики
- [ ] Реализовать Precision@K, Recall@K, MRR
- [ ] Логировать Latency P95
- [ ] A/B тестирование стратегий

---

## Приоритеты

| Приоритет | Чанк | Обоснование |
|-----------|------|-------------|
| 🔴 Высокий | Чанк 1 | Tier 1 — база для всего |
| 🔴 Высокий | Чанк 2 | Tier 1 — полнотекстовый поиск |
| 🟡 Средний | Чанк 3 | Tier 2 — ML-модели |
| 🟡 Средний | Чанк 4 | RAG и Embeddings |
| 🟡 Средний | Чанк 5 | Интеграция с сервером |
| 🟢 Низкий | Чанк 6 | Обучение и Feedback |

---

## Стратегия Hybrid

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│   Tier 1    │────▶│   Tier 2    │────▶│   Output    │
│             │     │  Эвристики  │     │  ML Models  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    top-N кандидатов
```

**Tier 1 (эвристики):**
- Query Type Rules (regex)
- File Type Rules (regex)
- Intent Rules (keywords)

**Tier 2 (ML-модели):**
- Query Type Classifier
- File Type Classifier
- Intent Detector
- Chunk Relevance Predictor

---

**Дата создания:** 2026-02-20
