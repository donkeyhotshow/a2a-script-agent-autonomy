# План: Миграция на Action-Based систему

> **Относится к:** a2a-server + a2a-client

## Текущее состояние

- Definitions: [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/) ([README](a2a-server/src/actions/definitions/README.md)); код: [action-registry.ts](a2a-server/src/actions/action-registry.ts), [action-parser.ts](a2a-server/src/actions/action-parser.ts)
- Есть папка `a2a-server/src/actions/` (новая)
- Есть `archive/actions-legacy/` (старые actions)
- Есть `etalon/` с примерами скриптов
- Есть симуляции: `simulation-action/`, `simulation-fallback/`, `simulation-true/`
- Есть `external-ai-hub/` для ollama

## Концепция

Action = человекопонятная инструкция для системы
- Все = actions
- sub-action = action с lower priority
- Данные шагов хранятся на сервере (не в симуляции)

## Структура Action

```yaml
action_id: "глагол-объект"
title: "Заголовок"
description: "Описание"
priority: 10
subActions:  # action ids
  - action_id: "под-действие"
    priority: 5
```

## API Сервера

### GET /api/v1/actions/:actionId

Ретрив данных action:
- title
- description
- priority
- subActions (список action ids)

## Проблемы

- Нужно расширить API для ретрива
- Нужно переделать формат actions
- Нужно обновить симуляции (только ids, без деталей)
- Нужно добавить priority

## План реализации

### 1. Формат Actions

**Файл:** `a2a-server/src/actions/`
- [ ] [Переделать структуру с priority](#переделать-структуру-с-priority)
- [ ] [subActions = только action ids](#subactions--только-action-ids)
- [ ] [Оставить полные данные на сервере](#оставить-полные-данные-на-сервере)

### 2. API

**Файл:** `a2a-server/src/routes/`
- [ ] [GET /api/v1/actions/:actionId](#get-apiv1actionsactionid)
- [ ] [GET /api/v1/actions/search?q=](#get-apiv1actionssearchq)

### 4. Web UI

**Файл:** `a2a-client/web/`
- [ ] [Запрос actionId → сервер](#запрос-actionid--сервер)
- [ ] [Сортировка по priority](#сортировка-по-priority)
- [ ] [Подтверждение запуска](#подтверждение-запуска)

### 5. Ollama (Fallback)

**Папка:** `external-ai-hub/`
- [ ] [Интеграция для генерации если action не найден](#интеграция-для-генерации-если-action-не-найден)

---

### Переделать структуру с priority


### subActions = только action ids


### Оставить полные данные на сервере


### GET /api/v1/actions/:actionId


### GET /api/v1/actions/search?q=


### Запрос actionId → сервер


### Сортировка по priority


### Подтверждение запуска


### Интеграция для генерации если action не найден

## Зависимые файлы

- `a2a-server/src/actions/`
- `a2a-server/src/routes/`
- `a2a-client/web/`
- `external-ai-hub/`

## Follow-up

- Измерить скорость ретрива
- Добавить кэширование
