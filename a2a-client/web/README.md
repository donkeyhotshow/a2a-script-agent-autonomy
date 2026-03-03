# A2A Web UI

Веб-интерфейс для взаимодействия с A2A Server через Client API Server.

## Требования к документации (machine-readable)

Все документы в этом проекте должны быть адаптированы под **машинное чтение** (парсинг и/или индексация RAG-системой). **Чтение человеком не требуется.**

## Структура проекта

```
web/
├── index.html              # Главная страница
├── css/                    # Стили
│   ├── app.css            # Основные стили
│   ├── plasticine-ui.css  # Стили пластилинового UI
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
│   ├── plasticine-ui.js     # Пластилиновый UI
│   ├── progress-indicators.js # Индикаторы прогресса
│   ├── rag-search-ui.js     # RAG поиск UI
│   ├── session-manager.js   # Управление сессиями
│   ├── sse-client.js       # SSE клиент
│   ├── task-flow.js        # Поток задач
│   ├── terminal-emulator.js # Терминал
│   ├── ui-components.js    # UI компоненты
│   ├── web-api-client.js   # Web API клиент
│   ├── websocket-client.js # WebSocket клиент
│   └── components/         # Дополнительные компоненты
├── templates/              # HTML шаблоны
└── examples/              # Примеры
```

## Использование

### Запуск

```bash
# Убедитесь что API Server запущен
cd a2a-client/packages/api-server
npm start

# Затем откройте web/index.html в браузере
# Или используйте dev server
cd a2a-client
npm run dev
```

### Конфигурация

Настройка API URL в localStorage:
```javascript
localStorage.setItem('a2a_serverUrl', 'http://localhost:3001/api/v1');
```

### Основные модули

#### SessionManager
Управление сессиями проекта.
```javascript
SessionManager.init({ apiBase: '/api/v1' });
const sessions = await SessionManager.loadSessions();
```

#### TaskFlow
Поток задач от создания до выполнения.
```javascript
const result = await TaskFlow.sendTask('Create a file');
TaskFlow.sendChoice('confirm_action', containerElement);
```

#### SSEClient
Real-time обновления через Server-Sent Events.
```javascript
SSEClient.connect(sessionId, promiseId);
SSEClient.on('progress', (data) => { /* handle */ });
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
| `/api/projects` | Управление проектами |
| `/api/sessions` | Управление сессиями |
| `/api/v1/invoke` | Вызов A2A Server |
| `/api/terminal/execute` | Выполнение команд |
| `/api/fs/*` | Файловые операции |
| `/api/rag/search` | RAG поиск |

## Требования

- Node.js 18+
- API Server на порту 3001
- A2A Server на порту 3000 (для проксирования)
- Meilisearch на порту 7700 (для RAG)

## Документация

Подробная документация:
- [API Server](../docs/new-request-flow/API-SERVER.md)
- [Web UI Components](../docs/new-request-flow/WEB-UI.md)
- [API Client](../docs/new-request-flow/API-CLIENT.md)
