# Web UI Documentation

> **⚠️ Важно:** Это документация для Web UI компонентов (a2a-client/web).
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md), [API-SERVER.md](API-SERVER.md)

## Обзор

Web UI — это клиентское веб-приложение, работающее в браузере и взаимодействующее с API Server (порт 3001). Оно обеспечивает пользовательский интерфейс для:

- Управления задачами и сессиями
- Выполнения терминальных команд
- Поиска по документам (RAG)
- Отображения прогресса выполнения
- Обработки ошибок
- Передачи файлов

## Структура файлов

```
a2a-client/web/
├── index.html                    # Главная HTML страница
├── css/
│   ├── app.css                   # Основные стили
│   ├── plasticine-ui.css         # Стили пластилинового UI
│   ├── base/
│   │   ├── typography.css        # Типографика
│   │   └── variables.css         # CSS переменные
│   ├── components/               # Стили компонентов
│   │   ├── errors.css            # Ошибки
│   │   ├── file-transfer.css     # Передача файлов
│   │   ├── floating-panel.css    # Плавающие панели
│   │   ├── header.css            # Шапка
│   │   ├── progress.css          # Прогресс
│   │   ├── rag-search.css        # RAG поиск
│   │   ├── session-manager.css   # Менеджер сессий
│   │   ├── terminal-emulator.css # Терминал
│   │   └── ...
│   └── layouts/                  # Макеты
├── js/
│   ├── app-task.js               # Инициализация приложения
│   ├── api-integration.js        # Интеграция с API
│   ├── session-manager.js        # Управление сессиями
│   ├── task-flow.js              # Поток задач
│   ├── sse-client.js             # SSE клиент
│   ├── error-handler.js          # Обработка ошибок
│   ├── progress-indicators.js    # Индикаторы прогресса
│   ├── terminal-emulator.js      # Эмулятор терминала
│   ├── rag-search-ui.js          # UI для RAG поиска
│   ├── file-transfer.js          # Передача файлов
│   ├── plasticine-ui.js          # Пластилиновый UI
│   ├── plasticine-workflow.js    # Workflow компонент
│   ├── ui-components.js          # UI компоненты
│   ├── web-api-client.js         # Web API клиент
│   └── components/               # Дополнительные компоненты
└── examples/
    └── advanced-features.html     # Примеры
```

## JavaScript модули

### SessionManager

Модуль управления сессиями. Обеспечивает создание, загрузку и удаление сессий.

**Файл:** [`session-manager.js`](../../a2a-client/web/js/session-manager.js)

#### Конфигурация

```javascript
SessionManager.init({
    apiBase: '/api/v1',           // Базовый API URL
    projectId: 'p_123456 // ID проекта
});
```

####7890'    Методы

| Метод | Описание |
|-------|----------|
| `init(options)` | Инициализация менеджера |
| `configure(options)` | Настройка конфигурации |
| `loadSessions(projectId?)` | Загрузка списка сессий |
| `createSession(projectId, title, task?)` | Создание сессии |
| `getSession(sessionId)` | Получение сессии |
| `deleteSession(sessionId)` | Удаление сессии |
| `updateSession(sessionId, data)` | Обновление сессии |

#### Пример использования

```javascript
// Инициализация
SessionManager.init({ projectId: 'p_123' });

// Загрузка сессий
const sessions = await SessionManager.loadSessions();

// Создание новой сессии
const session = await SessionManager.createSession('p_123', 'New Task', 'Do something');

// Удаление сессии
await SessionManager.deleteSession('sess_123');
```

---

### TaskFlow

Модуль потока задач. Управляет созданием задач, отправкой на сервер и отображением результатов.

**Файл:** [`task-flow.js`](../../a2a-client/web/js/task-flow.js)

#### Конфигурация

```javascript
TaskFlow.init({
    apiBase: '/api/v1',
    projectId: 'p_1234567890'
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `init(options)` | Инициализация потока задач |
| `sendTask(taskText, projectId?)` | Отправка задачи |
| `sendChoice(choiceId, containerElement)` | Отправка выбора формы |
| `cancel()` | Отмена текущей задачи |
| `pollStatus(promiseId)` | Опрос статуса задачи |

#### Пример использования

```javascript
// Отправка задачи
const result = await TaskFlow.sendTask('Create a new file');

// Обработка формы (выбор действия)
TaskFlow.sendChoice('confirm_action', containerElement);
```

---

### SSEClient

Клиент для Server-Sent Events. Обеспечивает real-time получение обновлений от сервера.

**Файл:** [`sse-client.js`](../../a2a-client/web/js/sse-client.js)

#### Конфигурация

```javascript
SSEClient.configure({
    apiBase: '/api/v1',
    sessionId: 'sess_123',
    promiseId: 'promise_456'
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `connect(sessionId, promiseId)` | Подключение к SSE потоку |
| `disconnect()` | Отключение от потока |
| `on(event, handler)` | Подписка на событие |
| `off(event, handler)` | Отписка от события |

#### События

| Событие | Описание |
|---------|----------|
| `connected` | Установлено соединение |
| `message` | Получено сообщение |
| `progress` | Обновление прогресса |
| `complete` | Выполнение завершено |
| `error` | Ошибка |

#### Пример использования

```javascript
// Подключение к SSE
SSEClient.connect('sess_123', 'promise_456');

// Обработка событий
SSEClient.on('progress', (data) => {
    console.log('Progress:', data.progress, data.message);
});

SSEClient.on('complete', (result) => {
    console.log('Result:', result);
});
```

---

### ErrorHandler

Централизованная обработка ошибок. Обеспечивает统一ный интерфейс для отображения и логирования ошибок.

**Файл:** [`error-handler.js`](../../a2a-client/web/js/error-handler.js)

#### Конфигурация

```javascript
ErrorHandler.init({
    showDismissButton: true,      // Показывать кнопку закрытия
    autoHideDelay: 8000,          // Автоскрытие через 8 сек
    showStackTrace: false,        // Показывать стектрейс
    logToConsole: true,           // Логировать в консоль
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `init(options)` | Инициализация обработчика |
| `handle(error, context?)` | Обработка ошибки |
| `handleApiError(response, context?)` | Обработка API ошибки |
| `displayError(error)` | Отображение ошибки |
| `on(event, handler)` | Подписка на событие ошибки |
| `getErrors()` | Получение списка ошибок |
| `clearErrors()` | Очистка списка ошибок |

#### Пример использования

```javascript
// Обработка ошибки
try {
    await someAsyncOperation();
} catch (error) {
    ErrorHandler.handle(error, { context: 'operationName' });
}

// Обработка API ошибки
ErrorHandler.handleApiError(response, { endpoint: '/api/sessions' });
```

---

### ProgressIndicators

Модуль визуального отображения прогресса длительных операций.

**Файл:** [`progress-indicators.js`](../../a2a-client/web/js/progress-indicators.js)

#### Конфигурация

```javascript
ProgressIndicators.defaults = {
    animated: true,               // Анимация
    showPercentage: true,         // Показывать процент
    showMessage: true,            // Показывать сообщение
    indeterminateSpeed: 300,      // Скорость неопределённого прогресса
    autoRemove: true              // Автоудаление после завершения
};
```

#### Методы

| Метод | Описание |
|-------|----------|
| `create(id, options)` | Создание индикатора прогресса |
| `get(id)` | Получение индикатора по ID |
| `remove(id)` | Удаление индикатора |
| `handleProgressEvent(eventData)` | Обработка события прогресса |
| `on(event, handler)` | Подписка на событие |

#### Пример использования

```javascript
// Создание индикатора
const tracker = ProgressIndicators.create('my-task', {
    showPercentage: true,
    showMessage: true
});

// Обновление прогресса
tracker.update(50, 'Processing...');

// Завершение
tracker.complete('Done!');

// Удаление
tracker.remove();
```

---

### TerminalEmulator

Эмулятор терминала в браузере. Обеспечивает выполнение команд и отображение вывода.

**Файл:** [`terminal-emulator.js`](../../a2a-client/web/js/terminal-emulator.js)

#### Конфигурация

```javascript
TerminalEmulator.configure({
    wsUrl: 'ws://localhost:3002',      // WebSocket URL
    apiBase: '/api/v1',               // API базовый URL
    fontSize: 14,                     // Размер шрифта
    fontFamily: 'Monaco, monospace',  // Шрифт
    theme: 'dark'                     // Тема (dark/light)
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `init(containerSelector)` | Инициализация терминала |
| `connect(sessionId)` | Подключение к сессии |
| `disconnect()` | Отключение |
| `execute(command)` | Выполнение команды |
| `clear()` | Очистка вывода |
| `getHistory()` | Получение истории команд |
| `writeOutput(text)` | Запись в вывод |

#### Пример использования

```javascript
// Инициализация
TerminalEmulator.init('#terminal-container');

// Подключение к сессии
await TerminalEmulator.connect('sess_123');

// Выполнение команды
const result = await TerminalEmulator.execute('ls -la');

// Очистка
TerminalEmulator.clear();
```

---

### RAGSearchUI

Пользовательский интерфейс для RAG поиска.

**Файл:** [`rag-search-ui.js`](../../a2a-client/web/js/rag-search-ui.js)

#### Конфигурация

```javascript
RAGSearchUI.configure({
    apiBase: '/api/v1',
    searchEndpoint: '/rag/search',
    indexEndpoint: '/rag/index'
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `init(containerSelector)` | Инициализация UI |
| `search(query, options?)` | Поиск по запросу |
| `clearResults()` | Очистка результатов |
| `getHistory()` | Получение истории поиска |

#### Пример использования

```javascript
// Инициализация
RAGSearchUI.init('#rag-search-container');

// Выполнение поиска
const results = await RAGSearchUI.search('How to use API');
console.log(results);
```

---

### FileTransfer

Модуль передачи файлов. Обеспечивает загрузку и скачивание файлов.

**Файл:** [`file-transfer.js`](../../a2a-client/web/js/file-transfer.js)

#### Конфигурация

```javascript
FileTransfer.configure({
    apiBase: '/api/v1',
    sessionId: 'sess_123',
    chunkSize: 1024 * 1024,           // 1MB
    maxFileSize: 100 * 1024 * 1024,    // 100MB
    allowedTypes: ['.js', '.ts', '.md'], // Разрешённые типы
    maxConcurrent: 3                    // Макс. параллельных загрузок
});
```

#### Методы

| Метод | Описание |
|-------|----------|
| `init()` | Инициализация |
| `uploadFile(file, options?)` | Загрузка файла |
| `uploadFiles(files, options?)` | Загрузка нескольких файлов |
| `downloadFile(fileId, filename)` | Скачивание файла |
| `getProgress(fileId)` | Получение прогресса загрузки |
| `cancelUpload(fileId)` | Отмена загрузки |

#### События

| Событие | Описание |
|---------|----------|
| `upload-progress` | Прогресс загрузки |
| `upload-complete` | Загрузка завершена |
| `upload-error` | Ошибка загрузки |
| `download-progress` | Прогресс скачивания |

#### Пример использования

```javascript
// Загрузка файла
const input = document.getElementById('fileInput');
input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    await FileTransfer.uploadFile(file, {
        onProgress: (progress) => {
            console.log('Progress:', progress);
        }
    });
});

// Обработка событий
FileTransfer.on('upload-complete', (data) => {
    console.log('File uploaded:', data.fileId);
});
```

---

### ApiIntegration

Интеграция с API. Обеспечивает统一的 интерфейс для HTTP запросов.

**Файл:** [`api-integration.js`](../../a2a-client/web/js/api-integration.js)

#### Конфигурация

```javascript
window.apiIntegration = {
    serverUrl: 'http://localhost:3001/api/v1',
    token: 'jwt-token'
};
```

#### Методы

| Метод | Описание |
|-------|----------|
| `configure(options)` | Настройка конфигурации |
| `request(method, path, body?)` | HTTP запрос |
| `get(path)` | GET запрос |
| `post(path, body)` | POST запрос |
| `put(path, body)` | PUT запрос |
| `delete(path)` | DELETE запрос |

#### Пример использования

```javascript
// GET запрос
const projects = await apiIntegration.get('/projects');

// POST запрос
const session = await apiIntegration.post('/sessions', {
    projectId: 'p_123',
    title: 'New Session'
});
```

---

## CSS компоненты

### Основные классы

| Класс | Описание |
|-------|----------|
| `.app-container` | Главный контейнер приложения |
| `.header` | Шапка приложения |
| `.panel` | Панель контента |
| `.modal` | Модальное окно |
| `.btn` | Кнопка |
| `.input` | Поле ввода |
| `.notification` | Уведомление |

### Специфические компоненты

| Класс | Описание |
|-------|----------|
| `.progress-bar` | Индикатор прогресса |
| `.terminal-output` | Вывод терминала |
| `.rag-results` | Результаты RAG поиска |
| `.error-message` | Сообщение об ошибке |
| `.session-card` | Карточка сессии |

---

## Интеграция

### Инициализация приложения

```html
<!-- Подключение скриптов -->
<script src="js/api-integration.js"></script>
<script src="js/session-manager.js"></script>
<script src="js/task-flow.js"></script>
<script src="js/sse-client.js"></script>
<script src="js/error-handler.js"></script>
<script src="js/progress-indicators.js"></script>

<!-- Инициализация -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    // Настройка API
    window.apiIntegration = {
        serverUrl: localStorage.getItem('a2a_serverUrl') || '/api/v1'
    };
    
    // Инициализация менеджера сессий
    SessionManager.init({ apiBase: '/api/v1' });
    
    // Инициализация обработчика ошибок
    ErrorHandler.init({ autoHideDelay: 5000 });
    
    // Инициализация TaskFlow
    TaskFlow.init();
});
</script>
```

### Обработка событий

```javascript
// Обработка прогресса через SSE
SSEClient.on('progress', (data) => {
    ProgressIndicators.handleProgressEvent({
        current: data.progress,
        total: 100,
        message: data.message,
        progressId: data.promiseId
    });
});

// Обработка завершения
SSEClient.on('complete', (result) => {
    ProgressIndicators.complete('Task completed');
    TaskFlow.renderResult(result);
});

// Обработка ошибок
ErrorHandler.on('error', (error) => {
    console.error('Error occurred:', error);
});
```

---

## Примеры

### Создание простой задачи

```javascript
async function createTask(taskText) {
    try {
        // Создаём индикатор прогресса
        const progress = ProgressIndicators.create('task-progress');
        progress.update(0, 'Creating session...');
        
        // Создаём сессию
        const session = await SessionManager.createSession(
            'p_123',
            'Task: ' + taskText.substring(0, 30),
            taskText
        );
        
        progress.update(30, 'Sending task...');
        
        // Отправляем задачу
        const result = await TaskFlow.sendTask(taskText);
        
        progress.update(100, 'Done!');
        progress.remove();
        
        return result;
    } catch (error) {
        ErrorHandler.handle(error, { action: 'createTask' });
    }
}
```

### Использование терминала

```javascript
// Инициализация терминала
TerminalEmulator.configure({
    wsUrl: 'ws://localhost:3002',
    theme: 'dark'
});

TerminalEmulator.init('#terminal');

// Подключение к сессии
TerminalEmulator.connect('sess_123').then(() => {
    // Выполнение команды
    TerminalEmulator.execute('ls -la');
});

// Прослушивание вывода
TerminalEmulator.on('output', (text) => {
    console.log('Terminal output:', text);
});
```

---

## Требования

- API Server должен быть запущен на порту 3001
- Для WebSocket соединений требуется порт 3002
- Для RAG поиска требуется Meilisearch на порту 7700
