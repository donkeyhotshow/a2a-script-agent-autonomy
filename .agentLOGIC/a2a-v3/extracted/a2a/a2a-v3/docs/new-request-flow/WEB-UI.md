# Web UI Documentation

---
doc:
  id: new-request-flow/web-ui
  type: spec
  machine_readable: true
  tags: [web-ui, browser, panels, rag, terminal]
  references:
    - docs/DOCUMENTATION-MACHINE-READABLE.md
    - docs/new-request-flow/PROTOCOL.md
---

> **⚠️ Важно:** Это документация для Web UI компонентов (a2a-client/web).
> 
> **См.:** [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md), [API-SERVER.md](API-SERVER.md)
>
> **Транспорт:** Web общается с Client API через HTTP. Client API проксирует на Server, получает `promiseId`,
> опрашивает статус до `completed`, затем возвращает `execute.*` в Web.

## Обзор

Web UI — клиентское приложение на Vite (**5173**), ходит в Client API по **`/api/a2a/*`** (same-origin). Отдельный SDK-сервер может быть на **3001** — см. [API-SERVER.md](API-SERVER.md). Обеспечивает:

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
│   ├── api-integration.js        # HTTP запросы к Client API
│   ├── action-handler.js         # Отправка result на сервер
│   ├── session-store.js          # Состояние сессии, события execute
│   ├── app/                      # Основные модули
│   │   ├── session-manager.js    # Управление сессиями
│   │   ├── windows/               # Оконная подсистема
│   │   │   ├── window-events.js    # События окон
│   │   │   ├── window-position.js  # Позиционирование
│   │   │   ├── window-registry.js  # Реестр окон
│   │   │   └── window-state.js     # Состояние окон
│   ├── components/               # UI компоненты
│   ├── task-flow/                # Поток задач
│   │   ├── index.js               # Точка входа
│   │   ├── init.js               # Инициализация
│   │   ├── core.js               # TaskFlow логика
│   │   ├── render.js             # Рендеринг execute
│   │   ├── tasks.js             # Задачи
│   │   ├── messages.js          # Сообщения
│   │   ├── loader.js            # Загрузчик
│   │   └── utils.js             # Утилиты
│   ├── error-handler.js          # Обработка ошибок
│   └── loader.js                # Индикаторы загрузки
└── examples/
    └── advanced-features.html     # Примеры
```

## JavaScript модули

### SessionManager

Модуль управления сессиями. Обеспечивает создание, загрузку и удаление сессий.

**Файл:** [`js/app/session-manager.js`](a2a-client/web/js/app/session-manager.js)

#### Конфигурация

```javascript
SessionManager.init({
    apiBase: '/api/a2a',       // same-origin на Vite 5173; SDK — см. API-SERVER.md (:3001)
    projectId: 'p_1234567890'    // ID проекта
});
```

#### Методы

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

**Файл:** [`task-flow/`](../../a2a-client/web/js/task-flow/) (модуль управления потоком задач)

#### Конфигурация

```javascript
TaskFlow.init({
    apiBase: '/api',
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

### Loader

Модуль визуального отображения прогресса длительных операций.

**Файл:** [`loader.js`](../../a2a-client/web/js/task-flow/loader.js)

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



#### Конфигурация

```javascript
TerminalEmulator.configure({
    apiBase: '/api',                    // API базовый URL
    fontSize: 14,                      // Размер шрифта
    fontFamily: 'Monaco, monospace',   // Шрифт
    theme: 'dark'                      // Тема (dark/light)
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

### TaskFlow (task-flow)

Модуль управления потоком задач.

**Файл:** [`task-flow/index.js`](../../a2a-client/web/js/task-flow/index.js)

#### Конфигурация

```javascript
RAGSearchUI.configure({
    apiBase: '/api',
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

### TaskFlow Render

Модуль рендеринга execute-ответов.

**Файл:** [`task-flow/render.js`](../../a2a-client/web/js/task-flow/render.js)

#### Конфигурация

```javascript
FileTransfer.configure({
    apiBase: '/api',
    sessionId: 'sess_123',
    chunkSize: 1024 * 1024,           // 1MB
    maxFileSize: 100 * 1024 * 1024,   // 100MB
    allowedTypes: ['.js', '.ts', '.md'], // Разрешённые типы
    maxConcurrent: 3                   // Макс. параллельных загрузок
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
    serverUrl: '', // пусто = same-origin `/api/a2a` на 5173; иначе база Client API (напр. SDK http://localhost:3001/api)
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
<script src="js/app/session-manager.js"></script>
<script src="js/task-flow/index.js"></script>
<script src="js/error-handler.js"></script>
<script src="js/progress-indicators.js"></script>

<!-- Инициализация -->
<script>
document.addEventListener('DOMContentLoaded', async () => {
    // Настройка API (from storage or default)
    const savedUrl = await StorageAPI.config.getItem('serverUrl');
    window.apiIntegration = {
        serverUrl: savedUrl || '/api'
    };
    
    // Инициализация менеджера сессий
    SessionManager.init({ apiBase: '/api' });
    
    // Инициализация обработчика ошибок
    ErrorHandler.init({ autoHideDelay: 5000 });
    
    // Инициализация TaskFlow
    TaskFlow.init();
});
</script>
```

### Обработка событий

```javascript
// Async promiseId flow: TaskFlow опрашивает статус и транслирует прогресс.

function handleTaskProgress(data) {
    ProgressIndicators.handleProgressEvent({
        current: data.progress,
        total: data.total ?? 100,
        message: data.message,
        progressId: data.promiseId
    });
}

function handleTaskComplete(result) {
    ProgressIndicators.complete('Task completed');
    TaskFlow.renderResult(result);
}

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

- Client API: в dev обычно встроен в Vite (**5173**, `/api/a2a/*`); отдельный SDK — порт **3001**
- Для RAG поиска требуется Meilisearch на порту 7700

> **Примечание:** Основной поток использует `promiseId` async polling. SSE/WebSocket опционально для realtime updates.
