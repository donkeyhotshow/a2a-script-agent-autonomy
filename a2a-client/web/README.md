# A2A Web UI

Веб-интерфейс для взаимодействия с A2A Server через Client API Server.

## Требования к документации (machine-readable)

Все документы в этом проекте должны быть адаптированы под **машинное чтение** (парсинг и/или индексация RAG-системой). **Чтение человеком не требуется.**

## Структура проекта

```
web/
├── index.html              # Главная страница
├── css/                    # Стили
│   ├── app.css            # Основные стили (macOS UI, включает Plasticine-панели)
│   ├── base/              # Базовые стили
│   │   ├── typography.css
│   │   ├── variables.css
│   │   ├── reset.css
│   │   └── theme.css
│   ├── components/        # Стили компонентов
│   │   ├── errors.css
│   │   ├── file-transfer.css
│   │   ├── floating-panel.css
│   │   ├── header.css
│   │   ├── progress.css
│   │   ├── rag-search.css
│   │   ├── session-manager.css
│   │   ├── terminal-emulator.css
│   │   └── ...
│   └── layouts/           # Макеты
├── js/                    # JavaScript модули
│   ├── api-integration.js    # Интеграция с API
│   ├── app-task.js          # Инициализация приложения
│   ├── error-handler.js     # Обработка ошибок
│   ├── file-transfer.js     # Передача файлов
│   ├── progress-indicators.js # Индикаторы прогресса
│   ├── rag-search-ui.js     # RAG поиск UI
│   ├── terminal-emulator.js # Терминал
│   ├── ui-components.js    # UI компоненты
│   ├── web-api-client.js   # Web API клиент
│   ├── components/         # Дополнительные компоненты
│   ├── task-flow/          # Модульный TaskFlow
│   │   ├── api.js          # HTTP запросы
│   │   ├── render.js       # Рендеринг UI
│   │   ├── core.js         # Основной объект TaskFlow
│   │   └── index.js        # Точка входа
│   └── archive/            # Архив устаревших файлов
├── templates/              # HTML шаблоны
└── examples/              # Примеры
```

## Использование

### Запуск

```bash
# Убедитесь что API Server запущен
cd a2a-client/packages/sdk
npm start

# Затем откройте web/index.html в браузере
# Или используйте dev server
cd a2a-client
npm run dev
```

### Конфигурация

Настройка Client API URL через Storage API:
```javascript
await StorageAPI.config.setItem('clientApiUrl', 'http://localhost:3001/api');
```

### Основные модули

#### SessionStore
Управление сессиями проекта (заменяет session-manager.js).
```javascript
SessionStore.init();
const state = SessionStore.getState();
await SessionStore.restoreAndReconnect();
```

#### TransportManager
Унифицированный транспорт SSE/WebSocket (заменяет sse-client.js и websocket-client.js).
```javascript
TransportManager.init();
TransportManager.connect(sessionId, promiseId);
TransportManager.on('message', (data) => { /* handle */ });
```

#### PanelManager
Управление панелями UI (заменяет plasticine-ui.js и session-panel-manager.js).
```javascript
await PanelManager.init().syncWithSessionStore();
PanelManager.open(config);
```

#### TaskFlow
Модульный поток задач от создания до выполнения.
```javascript
const result = await TaskFlow.run('Create a file');
TaskFlow.sendChoice('confirm_action', containerElement);
```

#### TerminalEmulator
Эмулятор терминала в браузере.
```javascript
TerminalEmulator.init('#terminal');
await TerminalEmulator.execute('ls -la');
```

#### RAGSearchUI
Интерфейс для RAG поиска.
```javascript
RAGSearchUI.init('#rag-search');
const results = await RAGSearchUI.search('query');
```

## API интеграция

Модули взаимодействуют с API Server (порт 3001):

| Эндпоинт | Описание |
|----------|----------|
| `/api/projects` | Управление проектами через Client API |
| `/api/sessions` | Управление сессиями через Client API |
| `/api/terminal/execute` | Выполнение команд (через Client API) |
| `/api/files/*` | Файловые операции |
| `/api/rag/search` | RAG поиск |

Все запросы веб-интерфейса идут в `/api/*` на Client API (порт 3001); прямых вызовов `/api/v1/*` из браузера нет.

## Требования

- Node.js 18+
- Client API Server (порт 3001, проксирует запросы A2A Server на 3000)
- Meilisearch на порту 7700 (для RAG)

## Новый Протокол A2A

### Action-Key Shape

Новый протокол использует формат с ключом типа действия вместо generic `content` или `action` полей.

**Правильный формат:**
```javascript
// Execute с типом действия
{ execute: { "script": { code: "...", input: {} } } }
{ execute: { "read-file": { path: "..." } } }
{ execute: { "write-file": { path: "...", content: "..." } } }

// Result с типом действия
{ result: { "script": { output: "...", success: true } } }
{ result: { "read-file": { path: "...", content: "..." } } }
```

**Устаревший формат (не рекомендуется):**
```javascript
// Неправильно: плоская структура
{ result: { content: "..." } }

// Неправильно: generic поле action
{ execute: { action: "read-file", file: "..." } }
```

### execute.form.choices

Интерактивные формы с вариантами выбора:
```javascript
{
    execute: {
        form: {
            title: "Выберите действие",
            choices: [
                { id: "fix_imports", label: "Исправить импорты" },
                { id: "skip", label: "Пропустить" }
            ]
        }
    }
}
```

### execute.form.input

Формы с полями ввода:
```javascript
{
    execute: {
        form: {
            title: "Введите данные",
            input: [
                { name: "filename", type: "text", label: "Имя файла" },
                { name: "content", type: "textarea", label: "Содержимое" }
            ]
        }
    }
}
```

### execute.message

Отображаемые сообщения пользователю:
```javascript
{
    execute: {
        message: {
            content: "Операция завершена успешно",
            type: "success"
        }
    }
}
```

### Типы Execute действий

| Тип | Описание | Пример |
|-----|----------|--------|
| `script` | Выполнение JavaScript | `{ script: { code: "...", input: {} } }` |
| `read-file` | Чтение файла | `{ "read-file": { path: "/src/index.js" } }` |
| `write-file` | Запись файла | `{ "write-file": { path: "...", content: "..." } }` |
| `execute-command` | Выполнение команд | `{ "execute-command": { command: "npm install" } }` |
| `rag-search` | RAG поиск | `{ "rag-search": { query: "...", topK: 5 } }` |
| `form` | Интерактивная форма | `{ form: { title: "...", choices: [...] } }` |
| `message` | Сообщение | `{ message: { content: "...", type: "info" } }` |

## Документация

Подробная документация:
- [API Server](../docs/new-request-flow/API-SERVER.md)
- [Web UI Components](../docs/new-request-flow/WEB-UI.md)
- [API Client](../docs/new-request-flow/API-CLIENT.md)
