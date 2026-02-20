# A2A Server — Задачи

## Обзор

A2A Server — stateless сервер для обработки контекста и активации нейронов. Не хранит проекты, сессии или запросы клиентов. Принимает только markdown с контекст-блоком и опциональными блоками кода.

---

## Рефакторинг: Stateless Server ✅ ЗАВЕРШЁН

### Изменения

- [x] Удалён Prisma — схема упрощена, модели Project, Session, Task, Message удалены
- [x] Удалены репозитории: project.repository.ts, session.repository.ts
- [x] Удалены сервисы: project.service.ts, session.service.ts
- [x] Удалены routes: projects.routes.ts, sessions.routes.ts
- [x] Удалены контроллеры: project.controller.ts, session.controller.ts
- [x] Упрощена аутентификация — хардкоденный пароль (keepauth: true)
- [x] Упрощены endpoints — только /invoke и /message
- [x] Обновлены типы — удалены SessionState, ProjectState
- [x] Обновлён tsconfig — исключён prisma из include

### Новые Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /invoke | Обработка контекст-блока |
| POST | /message | Отправка сообщения |

### Новое API

```
typescript
// Request
interface ClientMessage {
  context: ContextBlock;
  files?: FileBlock[];
}

// Response  
interface ServerMessage {
  context: ContextBlock;
  files?: FileBlock[];
  message?: string;
}
```

---

## Чанк 1: Knowledge Graph — Нейроны ✅ ЗАВЕРШЁН

### 1.1 Структура нейронов
- [x] Создать `src/knowledge/neurons/` директорию
- [x] Определить `neuron.types.ts` — интерфейс Neuron
- [x] Реализовать `neuron-store.ts` — хранилище нейронов
- [x] Реализовать `neuron-activator.ts` — активация по триггерам

### 1.2 Базовые нейроны Laravel 11
- [x] `validation.neuron.ts` — валидация, FormRequest, rules
- [x] `auth.neuron.ts` — авторизация, Guard, Policy
- [x] `eloquent.neuron.ts` — модели, relationships, factories
- [x] `routing.neuron.ts` — маршруты, controllers, middleware
- [x] `views.neuron.ts` — Inertia, Vue components, layouts
- [x] `testing.neuron.ts` — Pest, PHPUnit, factories

### 1.3 Нейрон project-detector
- [x] Определить триггеры для определения типа проекта
- [x] Реализовать @INJECT для загрузки контекста
- [x] Добавить store с путями Laravel 11

---

## Чанк 2: Knowledge Graph — Сущности и связи ✅ ЗАВЕРШЁН

### 2.1 Entity Recognizer
- [x] Создать `entity-recognizer.ts`
- [x] Распознавание Model, Controller, Service, Repository
- [x] Распознавание Vue components, composables
- [x] Извлечение metadata из кода
- [x] Поддержка 22 типов сущностей

### 2.2 Relation Mapper
- [x] Создать `relation-mapper.ts`
- [x] Определение uses, creates, extends, implements
- [x] Определение Eloquent relationships
- [x] Построение графа зависимостей
- [x] 14 типов связей

### 2.3 Graph Store
- [x] Создать `graph-store.ts`
- [x] In-memory хранение с индексами
- [x] Запросы к графу
- [x] Поиск путей между сущностями
- [x] PageRank-like importance scores
- [x] Детекция циклических зависимостей

---

## Чанк 3: Context Handler ✅ ЗАВЕРШЁН

### 3.1 Формирование контекста
- [x] Создать `context-handler.ts`
- [x] Реализовать Shadowing — перекрытие стандартов
- [x] Формировать context block для клиента
- [x] Восстанавливать последовательность активных нейронов
- [x] Обработка Root Context (первое сообщение от клиента)
- [x] Интеграция с neuron-activator

### 3.2 Протокол общения
- [x] Реализовать `context-parser.ts` — парсинг и валидация ContextBlock
- [x] Реализовать `message-builder.ts` — построение сообщений
- [x] Реализовать `file-block-handler.ts` — работа с файловыми блоками
- [x] Реализовать запрос файлов у клиента
- [x] Реализовать обработку new_task

### 3.3 Документация
- [x] Создать `docs/entry-points.md` — точки входа и Root Context
- [x] Создать `plans/a2a-server-context-handler-plan.md` — план реализации

### 3.4 Тесты
- [x] Unit тесты для context-handler
- [x] Unit тесты для entity-recognizer

---

## Приоритеты

| Приоритет | Чанк | Статус |
|-----------|------|--------|
| 🔴 Высокий | Рефакторинг: Stateless | ✅ Завершён |
| 🔴 Высокий | Чанк 3: Context Handler | ✅ Завершён |
| 🟡 Средний | Чанк 1: Нейроны | ✅ Завершён |
| 🟡 Средний | Чанк 2: Knowledge Graph | ✅ Завершён |

---

## Реализованные файлы

### Knowledge Layer
| Файл | Описание |
|------|----------|
| [`context-handler.ts`](src/knowledge/context-handler.ts) | Главный модуль формирования контекста |
| [`context-store.ts`](src/knowledge/context-store.ts) | Хранилище контекст-блоков |
| [`context-injector.ts`](src/knowledge/context-injector.ts) | Резолвинг @INJECT действий |
| [`entity-recognizer.ts`](src/knowledge/entity-recognizer.ts) | Распознавание сущностей в коде |
| [`relation-mapper.ts`](src/knowledge/relation-mapper.ts) | Построение связей между сущностями |
| [`graph-store.ts`](src/knowledge/graph-store.ts) | Хранение и запросы к графу |

### Protocol Layer
| Файл | Описание |
|------|----------|
| [`context-parser.ts`](src/protocol/context-parser.ts) | Парсинг и валидация ContextBlock |
| [`message-builder.ts`](src/protocol/message-builder.ts) | Построение сообщений |
| [`file-block-handler.ts`](src/protocol/file-block-handler.ts) | Работа с файловыми блоками |

### Neurons
| Файл | Описание |
|------|----------|
| [`neuron.types.ts`](src/knowledge/neurons/neuron.types.ts) | Типы нейронов |
| [`neuron-store.ts`](src/knowledge/neurons/neuron-store.ts) | Хранилище нейронов |
| [`neuron-activator.ts`](src/knowledge/neurons/neuron-activator.ts) | Активация нейронов |
| [`base/*.neuron.ts`](src/knowledge/neurons/base/) | Базовые нейроны Laravel 11 |

### Middleware
| Файл | Описание |
|------|----------|
| [`auth.middleware.ts`](src/middleware/auth.middleware.ts) | Аутентификация (hardcoded password) |

### Routes
| Файл | Описание |
|------|----------|
| [`index.ts`](src/routes/index.ts) | Основные endpoints (/invoke, /message) |

### Tests
| Файл | Описание |
|------|----------|
| [`context-handler.test.ts`](tests/unit/knowledge/context-handler.test.ts) | Тесты context-handler |
| [`entity-recognizer.test.ts`](tests/unit/knowledge/entity-recognizer.test.ts) | Тесты entity-recognizer |

### Documentation
| Файл | Описание |
|------|----------|
| [`docs/entry-points.md`](docs/entry-points.md) | Точки входа и Root Context |
| [`plans/a2a-server-context-handler-plan.md`](../plans/a2a-server-context-handler-plan.md) | План реализации |

---

**Дата создания:** 2026-02-20  
**Последнее обновление:** 2026-02-25
