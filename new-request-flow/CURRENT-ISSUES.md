# Текущие проблемы и план исправлений

> **ВАЖНО:** Сервер (a2a-server) STATELESS - не хранит сессии!
> Все сессии хранятся на Client API. Сервер только обрабатывает запросы.

## Выявленные проблемы

### 1. Web напрямую обращается к серверу (КРИТИЧНО)

**Проблема:** Web (a2a-client/web) делает HTTP запросы напрямую к `/api/v1/*` (сервер), минуя Client API.

**Места:**
- [`a2a-client/web/js/app-enhancements.js:748`](a2a-client/web/js/app-enhancements.js:748) - `fetch('/api/v1/projects')`
- [`a2a-client/web/js/app-enhancements.js:789`](a2a-client/web/js/app-enhancements.js:789) - `fetch('/api/v1/projects', { method: 'POST' })`
- [`a2a-client/web/js/web-api-client.js:7`](a2a-client/web/js/web-api-client.js:7) - `serverUrl: 'http://localhost:8080/api/v1'`
- [`a2a-client/web/js/sessions.js:28`](a2a-client/web/js/sessions.js:28) - `api: '/api/v1'`
- И многие другие файлы в `a2a-client/web/js/flow/`

**Почему это плохо:**
1. Web не должен знать адрес сервера
2. Web не может правильно обрабатывать ответы сервера (actions, execute)
3. Нет разделения ответственности
4. Невозможно тестировать изолированно

**Решение:**
1. Создать Client API сервер (порт 3001)
2. Переписать все fetch запросы в web на обращение к Client API
3. Client API будет проксировать запросы к серверу

---

### 2. Нет хранения сессий на стороне Client

**Проблема:** Сессии не сохраняются между запросами.

**Решение:**
1. Реализовать хранилище сессий (в памяти + файл/БД)
2. Сохранять состояние после каждого шага

---

### 3. Web UI не управляет панелями сессий

**Проблема:** Нет отдельных панелей для каждой сессии с нужными кнопками.

**Что нужно:**
1. Создать компонент SessionPanel
2. Реализовать перетаскивание, сворачивание
3. Кнопки "Далее", "Авто/Стоп", "Отменить"

---

## Файлы для изменения

### A. Client API (создать)

```
a2a-client/
├── packages/
│   └── api-server/           # НОВЫЙ ПАКЕТ - HTTP сервер для web
│       ├── src/
│       │   ├── index.ts      # Express сервер (порт 3001)
│       │   ├── routes/
│       │   │   ├── sessions.ts
│       │   │   ├── projects.ts
│       │   │   └── config.ts
│       │   ├── services/
│       │   │   ├── session.service.ts
│       │   │   └── storage.ts
│       │   └── middleware/
│       │       └── auth.ts
│       ├── package.json
│       └── tsconfig.json
```

### B. Web (изменить)

| Файл | Что делать |
|------|------------|
| `a2a-client/web/js/web-api-client.js` | Переписать на Client API (localhost:3001) |
| `a2a-client/web/js/app-enhancements.js` | Заменить fetch на вызовы web-api-client |
| `a2a-client/web/js/sessions.js` | Переписать на Client API |
| `a2a-client/web/js/flow/protocol.js` | Убрать обращения к /api/v1 |
| `a2a-client/web/js/flow/init.js` | Убрать обращения к /api/v1 |

### C. Добавить в Web

| Файл | Описание |
|------|----------|
| `a2a-client/web/js/session-panel.js` | Компонент панели сессии |
| `a2a-client/web/css/components/session-panel.css` | Стили панели |

---

## План исправлений

### Этап 1: Client API сервер (приоритет: ВЫСОКИЙ)

1. **Создать пакет `api-server`**
   - Port: 3001
   - Express + TypeScript
   - Endpoints:
     - `POST /api/sessions` - создать сессию
     - `GET /api/sessions` - список сессий
     - `GET /api/sessions/:id` - получить сессию
     - `POST /api/sessions/:id/task` - отправить задачу
     - `POST /api/sessions/:id/next` - следующий шаг
     - `POST /api/sessions/:id/cancel` - отменить
     - `GET /api/projects` - список проектов
     - `POST /api/projects` - создать проект
     - `GET /api/config` - конфигурация
     - `POST /api/config` - сохранить конфигурацию

2. **Интегрировать ApiClient**
   - Использовать существующий `a2a-client/packages/api-client`
   - Он уже умеет обращаться к серверу (localhost:3000)

### Этап 2: Исправить Web (приоритет: ВЫСОКИЙ)

1. **Обновить web-api-client.js**
   - Заменить serverUrl на `http://localhost:3001`
   - Добавить все необходимые методы

2. **Обновить app-enhancements.js**
   - Заменить `fetch('/api/v1/projects')` на `webApiClient.getProjects()`
   - Заменить `fetch('/api/v1/projects', { method: 'POST' })` на `webApiClient.createProject(...)`

3. **Обновить остальные файлы**
   - sessions.js
   - flow/protocol.js
   - flow/init.js

### Этап 3: UI панелей сессий (приоритет: СРЕДНИЙ)

1. **Создать SessionPanel**
   - Состояния: inactive, active, minimized
   - Drag & drop
   - Кнопки управления

2. **Интегрировать в web**
   - При создании сессии создавать панель
   - Обновлять панель при изменении статуса

### Этап 4: Тестирование (приоритет: ВЫСОКИЙ)

1. Проверить полный флоу: создание сессии → выбор действия → выполнение
2. Проверить авто-режим
3. Проверить отмену

---

## Сравнение: До и После

### До (текущее состояние)

```
Web                    Client                  Server
  │                        │                      │
  │  fetch('/api/v1/...') │                      │
  │──────────────────────>│                      │
  │                        │                      │
  │                        │  (не обрабатывает)  │
  │                        │────────────────────>│
  │                        │                      │
  │                        │<─────────────────────│
  │<──────────────────────│                      │
```

### После (правильная архитектура)

```
Web                    Client                  Server
  │                        │                      │
  │  webApiClient.createSession()               │
  │──────────────────────>│                      │
  │                        │                      │
  │                        │  (создает, хранит)   │
  │                        │                      │
  │                        │  apiClient.request() │
  │                        │─────────────────────>│
  │                        │                      │
  │                        │<─────────────────────│
  │<──────────────────────│                      │
```

---

## Проверка реализации

После исправлений проверить:

1. ✅ Web не содержит обращений к `/api/v1`
2. ✅ Все запросы содержат sessionId и projectId
3. ✅ Сессии сохраняются между запросами
4. ✅ Панели сессий отображаются корректно
5. ✅ Кнопки "Далее", "Авто", "Отмена" работают

---

## Ссылки

- [ARCHITECTURE.md](ARCHITECTURE.md) - Архитектура системы
- [PROTOCOL.md](PROTOCOL.md) - Схемы запросов/ответов
- [SESSION-FLOW.md](SESSION-FLOW.md) - Поток сессий
