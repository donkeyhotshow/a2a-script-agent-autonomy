# TODO: Что нужно создать/исправить

## Приоритетные задачи

### 🔴 Высокий приоритет

#### 1. Client API Server
Создать HTTP сервер который:
- Принимает запросы от Web (порт 3001)
- Хранит сессии
- Общается с Server (порт 3000)

```
a2a-client/server/
├── src/
│   ├── index.ts          # Точка входа
│   ├── routes/
│   │   ├── sessions.ts   # /api/sessions
│   │   ├── projects.ts  # /api/projects
│   │   └── config.ts    # /api/config
│   └── services/
│       ├── session-store.ts   # Хранение сессий
│       └── api-client.ts      # Клиент для Server
└── package.json
```

#### 2. Исправить Web API Client
Переписать `a2a-client/web/js/web-api-client.js`:
- Убрать прямой доступ к Server
- Обращаться к Client API (порт 3001)
- endpoints: `/api/sessions`, `/api/sessions/:id/action`, etc.

---

### 🟡 Средний приоритет

#### 4. UI: Панели сессий
Обновить `sessions.js`:
- drag & drop панелей
- сворачивание в drop zone
- кнопки: далее, авто, стоп, отменить

#### 5. UI: Окно конфигурации
Добавить страницу настроек:
- Выбор provider для LLM
- Редактор списка проектов

#### 6. UI: Выбор действия
- Показать список actions
- Кнопка "Применить" для запуска

---

### 🟢 Низкий приоритет

#### 7. Flow UI
- Визуальный редактор workflow
- Drag & drop действий

#### 8. Graph UI  
- Визуализация зависимостей кода

---

## Файлы для изменения

### Создать
| Файл | Описание |
|------|----------|
| `a2a-client/server/src/index.ts` | Client API сервер |
| `a2a-client/server/src/routes/sessions.ts` | Эндпоинты сессий |
| `a2a-client/server/src/services/session-store.ts` | Хранение сессий |

### Исправить
| Файл | Что исправить |
|------|---------------|
| `a2a-client/web/js/web-api-client.js` | Обращаться к Client API, не Server |
| `simulations/*/1/request.json` | Первый запрос — только task (см. simulations/SCHEMA.md) |

---

## Как тестировать

1. Запустить Client API: `cd a2a-client/server && npm run dev`
2. Запустить Server: `cd a2a-server && npm run dev`  
3. Запустить Web: `cd a2a-client/web && npm run dev`
4. Открыть http://localhost:5173

## Ports

| Сервис | Порт | Описание |
|--------|------|----------|
| Server | 3000 | Основной API |
| Client API | 3001 | API для Web |
| Web UI | 5173 | Vite dev server |
