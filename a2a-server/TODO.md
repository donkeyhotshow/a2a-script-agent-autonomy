# A2A Server — Задачи

## Обзор

A2A Server — серверная часть системы для управления нейронами, Knowledge Graph и обработки контекста.

---

## Чанк 1: Knowledge Graph — Нейроны

### 1.1 Структура нейронов
- [ ] Создать `src/knowledge/neurons/` директорию
- [ ] Определить `neuron.types.ts` — интерфейс Neuron
- [ ] Реализовать `neuron-store.ts` — хранилище нейронов
- [ ] Реализовать `neuron-activator.ts` — активация по триггерам

### 1.2 Базовые нейроны Laravel 11
- [ ] `validation.neuron.ts` — валидация, FormRequest, rules
- [ ] `auth.neuron.ts` — авторизация, Guard, Policy
- [ ] `eloquent.neuron.ts` — модели, relationships, factories
- [ ] `routing.neuron.ts` — маршруты, controllers, middleware
- [ ] `views.neuron.ts` — Inertia, Vue components, layouts
- [ ] `testing.neuron.ts` — Pest, PHPUnit, factories

### 1.3 Нейрон project-detector
- [ ] Определить триггеры для определения типа проекта
- [ ] Реализовать @INJECT для загрузки контекста
- [ ] Добавить store с путями Laravel 11

---

## Чанк 2: Knowledge Graph — Сущности и связи

### 2.1 Entity Recognizer
- [ ] Создать `entity-recognizer.ts`
- [ ] Распознавание Model, Controller, Service, Repository
- [ ] Распознавание Vue components, composables
- [ ] Извлечение metadata из кода

### 2.2 Relation Mapper
- [ ] Создать `relation-mapper.ts`
- [ ] Определение uses, creates, extends, implements
- [ ] Определение Eloquent relationships
- [ ] Построение графа зависимостей

### 2.3 Graph Store
- [ ] Создать `graph-store.ts`
- [ ] Реализовать хранение в PostgreSQL
- [ ] Реализовать запросы к графу
- [ ] Добавить поиск путей между сущностями

---

## Чанк 3: Context Handler

### 3.1 Формирование контекста
- [ ] Создать `context-handler.ts`
- [ ] Реализовать Shadowing — перекрытие стандартов
- [ ] Формировать context block для клиента
- [ ] Восстанавливать последовательность активных нейронов

### 3.2 Протокол общения
- [ ] Обновить `context-parser.ts` для работы с нейронами
- [ ] Обновить `message-builder.ts` для формирования ответов
- [ ] Реализовать запрос файлов у клиента
- [ ] Реализовать обработку new_task

---

## Чанк 4: Интеграция с клиентом

### 4.1 API endpoints
- [ ] `POST /sessions` — создание сессии
- [ ] `POST /sessions/:id/message` — отправка сообщения
- [ ] `GET /sessions/:id/context` — получение контекста
- [ ] WebSocket для real-time обновлений

### 4.2 Обработка запросов
- [ ] Получать структуру проекта от клиента
- [ ] Активировать нейроны по триггерам
- [ ] Возвращать context block с активными нейронами
- [ ] Запрашивать файлы для анализа

---

## Чанк 5: Очистка и рефакторинг

### 5.1 Удалить ML из сервера
- [ ] Удалить `src/ml/embedding.service.ts` (в клиенте)
- [ ] Удалить `src/ml/search.service.ts` (в клиенте)
- [ ] Удалить `src/ml/indexer.service.ts` (в клиенте)
- [ ] Оставить только `plexe.client.ts` если нужен

### 5.2 Обновить документацию
- [ ] Обновить README.md
- [ ] Обновить схемы в prisma/schema.prisma
- [ ] Добавить документацию по нейронам

---

## Приоритеты

| Приоритет | Чанк | Обоснование |
|-----------|------|-------------|
| 🔴 Высокий | Чанк 1 | Базовые нейроны — ДНК системы |
| 🔴 Высокий | Чанк 3 | Context Handler — ключевой механизм |
| 🟡 Средний | Чанк 2 | Knowledge Graph — расширение |
| 🟡 Средний | Чанк 4 | Интеграция с клиентом |
| 🟢 Низкий | Чанк 5 | Очистка кода |

---

**Дата создания:** 2026-02-20
