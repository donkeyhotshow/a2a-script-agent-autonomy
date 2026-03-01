# Руководство по расположению файлов

## Обзор

Этот документ показывает где должен находится код в проекте.

## Основные директории

### a2a-client/

Клиентская часть системы.

```
a2a-client/
├── packages/              # Node.js пакеты
│   ├── api-client/       # HTTP клиент для Server
│   │   └── src/index.ts
│   ├── agent/            # Агент
│   ├── fs-utils/         # Файловые утилиты
│   ├── rag/              # RAG
│   ├── script-runner/    # Запуск скриптов
│   ├── terminal/         # Терминал
│   └── types/            # Общие типы
│
├── web/                  # Web UI
│   ├── js/
│   │   ├── app-boot.js      # Инициализация
│   │   ├── app-init.js     # Настройка
│   │   ├── app-state.js    # Состояние
│   │   ├── sessions.js     # Управление сессиями (UI)
│   │   ├── actions-manager.js
│   │   ├── web-api-client.js  # API для Server (ПЕРЕПИСАТЬ!)
│   │   ├── sse-client.js
│   │   ├── flow/           # Flow UI
│   │   └── json/           # JSON UI
│   └── css/
│       └── components/     # UI компоненты
│
└── server/               # Client API сервер (СОЗДАТЬ!)
    ├── src/
    │   ├── index.ts        # Точка входа
    │   ├── routes/
    │   │   ├── sessions.ts
    │   │   ├── projects.ts
    │   │   └── config.ts
    │   └── services/
    │       ├── session-store.ts
    │       └── api-client.ts
    └── package.json
```

### a2a-server/

Серверная часть (должен быть STATELESS).

```
a2a-server/
├── src/
│   ├── routes/
│   │   ├── actions.routes.ts
│   │   ├── requests.routes.ts
│   │   └── sse.routes.ts
│   ├── services/
│   │   ├── action-service.ts
│   │   ├── message.service.ts
│   │   └── ...
│   ├── neurons/          # AI логика
│   │   ├── lint-php.neuron.ts
│   │   └── ...
│   └── protocol/         # Обработка протокола
│       ├── context-parser.ts
│       └── message-builder.ts
└── prisma/
    └── schema.prisma     # База данных
```

### external-ai-hub/

Прокси для Ollama с поддержкой promiseId.

```
external-ai-hub/
├── app/
│   └── main.py           # FastAPI приложение
├── docs/
├── plans/
└── requirements.txt
```

---

## Какой код куда класть

### Нужно добавить функционал в Web UI?

**Папка:** `a2a-client/web/js/`

- Новые UI компоненты → `components/`
- Управление сессиями → `sessions.js`
- Flow интерфейс → `flow/`
- JSON интерфейс → `json/`
- API вызовы → `web-api-client.js` (переписать!)

### Нужно добавить новый API endpoint на Server?

**Папка:** `a2a-server/src/routes/`

- Добавить в существующий route файл
- Или создать новый файл

### Нужно добавить AI логику?

**Папка:** `a2a-server/src/neurons/`

- Создать `.neuron.ts` файл
- Зарегистрировать в `index.ts`

### Нужно создать Client API?

**Папка:** `a2a-client/server/`

- Создать новую папку
- Добавить routes и services

---

## Порты

| Сервис | Порт | Описание |
|--------|------|----------|
| Server | 3000 | Основной API |
| Client API | 3001 | API для Web |
| Web UI | 5173 | Vite dev server |
| External AI Hub | 11434 | Прокси для Ollama |
| Ollama | 11435 | Локальная LLM |

---

## Важные правила

1. **Web не знает адрес Server** - только Client API
2. **Server не хранит сессии** - только обрабатывает запросы
3. **Client API хранит сессии** - и общается с Server
4. **External AI Hub** - для асинхронных LLM запросов
