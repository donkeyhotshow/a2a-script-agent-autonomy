# Сравнение: Видение vs Реализация

## Текущее состояние

### Что есть в new-request-flow (Видение)

Документы в `new-request-flow/` описывают идеальную архитектуру:

1. **ARCHITECTURE.md** - Полная архитектура системы
2. **PROTOCOL.md** - Протокол взаимодействия
3. **SESSION-FLOW.md** - Поток сессий
4. **SIMULATION-*.md** - Анализ симуляций

### Что реализовано (Текущая система)

```
a2a-client/web/        # Web UI (порт 5173)
a2a-server/            # Server API (порт 3000)
external-ai-hub/       # Proxy для Ollama (порт 11434)
```

---

## Проблемы

### 1. Web → Server напрямую

**По документу:**
```
Web → Client API (3001) → Server (3000)
```

**Как сейчас:**
```
Web → Server (3000) напрямую
```

**Где исправлять:**
- `a2a-client/web/js/web-api-client.js` - нужно переписать на Client API
- Нужно создать Client API сервер на порту 3001

### 2. Session хранятся на Server

**По документу:**
```
Server - STATELESS, не хранит сессии
Client API - хранит сессии
```

**Как сейчас:**
```
Server хранит сессии в базе данных
```

**Где исправлять:**
- Убрать session storage из `a2a-server/`
- Добавить session storage в `a2a-client/`

### 3. Client API не существует

**По документу:**
```
Должен быть Client API сервер (порт 3001)
```

**Как сейчас:**
```
Client API сервера нет
```

**Что нужно создать:**
- HTTP сервер на Node.js
- Эндпоинты: `/api/sessions`, `/api/projects`, `/api/config`

---

## План исправлений

### Этап 1: Создать Client API

**Задачи:**
1. [ ] Создать `a2a-client/server/` - HTTP сервер на порту 3001
2. [ ] Реализовать endpoints:
   - `POST /api/sessions` - создать сессию
   - `GET /api/sessions` - список сессий
   - `GET /api/sessions/:id` - получить сессию
   - `POST /api/sessions/:id/task` - отправить задачу
   - `POST /api/sessions/:id/next` - следующий шаг
   - `GET /api/projects` - список проектов
   - `POST /api/projects` - создать проект
   - `GET /api/config` - конфигурация
   - `POST /api/config` - сохранить конфигурацию

**Где создавать:**
```
a2a-client/server/
├── src/
│   ├── index.ts          # Точка входа
│   ├── routes/
│   │   ├── sessions.ts   # /api/sessions
│   │   ├── projects.ts   # /api/projects
│   │   └── config.ts     # /api/config
│   ├── services/
│   │   ├── session-store.ts
│   │   └── api-client.ts # Вызовы к Server
│   └── types/
│       └── index.ts
└── package.json
```

### Этап 2: Переписать Web API Client

**Задачи:**
1. [ ] Переписать `a2a-client/web/js/web-api-client.js`
2. [ ] Изменить все fetch() вызовы на Client API

**Было:**
```javascript
const response = await fetch('/api/v1/projects');
```

**Стало:**
```javascript
const response = await fetch('http://localhost:3001/api/projects');
```

### Этап 3: Убрать сессии из Server

**Задачи:**
1. [ ] Удалить session storage из `a2a-server/`
2. [ ] Сделать Server полностью stateless

**Где удалять:**
- `a2a-server/src/repositories/session.repository.ts`
- Все связи с сессиями в routes

### Этап 4: Обновить UI

**Задачи:**
1. [ ] Добавить панель конфигурации (provider, projects)
2. [ ] Реализовать панели сессий (drag & drop, сворачивание)
3. [ ] Добавить кнопки "Отменить" / "Применить"

---

## Куда класть код

### a2a-client/packages/

| Пакет | Назначение |
|-------|------------|
| `api-client` | HTTP клиент для Server |
| `agent` | Агент для выполнения задач |
| `fs-utils` | Файловые утилиты |
| `rag` | RAG функциональность |
| `script-runner` | Запуск скриптов |
| `terminal` | Терминал |
| `types` | Общие типы |

### a2a-client/web/

| Папка | Назначение |
|-------|------------|
| `js/flow/` | Flow UI (nodes, panels) |
| `js/json/` | JSON UI |
| `css/components/` | UI компоненты |

### a2a-server/

| Папка | Назначение |
|-------|------------|
| `src/routes/` | API endpoints |
| `src/services/` | Бизнес-логика |
| `src/neurons/` | Нейроны (AI логика) |
| `src/protocol/` | Обработка протокола |

### external-ai-hub/

| Папка | Назначение |
|-------|------------|
| `app/` | Python FastAPI приложение |
| `docs/` | Документация |
| `plans/` | Планы развития |

---

## Команды для запуска

```bash
# 1. Server (порт 3000)
cd a2a-server && npm run dev

# 2. Client API (порт 3001) - ЕЩЕ НЕТ
cd a2a-client && npm run server

# 3. Web UI (порт 5173)
cd a2a-client && npm run dev

# 4. External AI Hub (порт 11434)
cd external-ai-hub && python app/main.py
```

---

## Статус реализации

| Компонент | Статус | Notes |
|-----------|--------|-------|
| Server (3000) | ✅ Готов | Stateless нужен |
| Client API (3001) | ❌ Нет | Нужно создать |
| Web → Server | ❌ Нужно исправить | Должно быть Web → Client API |
| External AI Hub | ✅ Готов | |
| Session storage | ❌ На Server | Должно быть на Client API |
