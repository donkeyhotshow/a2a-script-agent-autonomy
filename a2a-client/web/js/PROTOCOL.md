# Протокол работы веб-клиента A2A

> **Версия:** 1.1  
> **Расположение:** `a2a-client/web/js/`  
> **Зависимости:** A2A Protocol, Client API Server (SDK, порты 3001), Server (порт 3000)

---

## Ключевой принцип разделения ответственности

> **ВАЖНО:** Web UI делает **ТОЛЬКО** отображение форм и сообщений. Вся работа с кодовой базой выполняется в SDK.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB UI (port 5173)                              │
│                                                                             │
│  ТОЛЬКО:                                                                   │
│  ├── Отображение execute.form (choices/input)                              │
│  ├── Отображение execute.message                                           │
│  ├── Сбор данных от пользователя (выбор, ввод текста)                     │
│  └── Отправка result обратно в SDK                                        │
│                                                                             │
│  НЕ делает:                                                               │
│  ├── Выполнение скриптов                                                   │
│  ├── Файловые операции (read/write)                                       │
│  ├── Выполнение команд                                                     │
│  ├── RAG поиск                                                            │
│  └── Обработку результатов действий                                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTP
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SDK (Client API Server, port 3001)                       │
│                                                                             │
│  ВСЯ работа с кодовой базой:                                               │
│  ├── handleScriptAction()     - выполнение DSL скриптов                    │
│  ├── handleReadFileAction()   - чтение файлов                             │
│  ├── handleWriteFileAction()  - запись файлов                             │
│  ├── handleExecuteCommandAction() - выполнение shell команд               │
│  ├── handleRagSearchAction()  - RAG поиск                                 │
│  └── sendContinue()          - отправка result на Server                 │
│                                                                             │
│  Также:                                                                   │
│  ├── Управление сессиями                                                   │
│  ├── Проксирование к Server (port 3000) для LLM запросов                 │
│  └── Опрашивание promiseId                                                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Server (port 3000) - STATELESS                       │
│  Обработка AI запросов, формирование execute форм                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Execute обработка: кто что делает

| execute тип | Где обрабатывается | Что делает Web UI | Что делает SDK |
|-------------|-------------------|-------------------|----------------|
| `form` | Web UI | Рендерит кнопки/поля ввода, собирает данные от пользователя | Ничего (UI-only) |
| `message` | Web UI | Рендерит и показывает сообщение | Ничего (UI-only) |
| `script` | SDK | Показывает "Выполняется..." | Выполняет код, возвращает result |
| `read-file` | SDK | Показывает "Читаю файл..." | Читает файл, возвращает content |
| `write-file` | SDK | Показывает "Записываю..." | Записывает файл, возвращает success |
| `execute-command` | SDK | Показывает "Выполняю команду..." | Запускает команду, возвращает stdout |
| `rag-search` | SDK | Показывает "Ищу..." | Выполняет поиск, возвращает results |

---

## Полный поток данных: от Server до Web UI и обратно

```
1. SERVER (port 3000)
       │
       │ execute с action-key shape
       ▼
2. SDK (Client API Server, port 3001)
       │
       │ detectResponseType(execute)
       │
       ├──► UI ТИП (form/message)
       │         │
       │         │ handleFormAction() / handleMessageAction()
       │         │ Возвращает: { uiNeeded: true, formData/messageData }
       │         │
       │         ▼
       │    HTTP ответ в Web UI
       │         │
       │         ▼
       │    Web UI рендерит форму/сообщение
       │    Пользователь вводит данные
       │    Web UI отправляет result
       │
       │
       └──► ACTION ТИП (script/read/write/command/rag)
                 │
                 │ handleScriptAction() и т.д.
                 │ Выполняет работу локально
                 │ Возвращает: { handled: true, result: { "script": {...} } }
                 │
                 │ sendContinue(sessionId, result)
                 │ Отправляет result на Server
                 │
                 ▼
       Server получает result
       Формирует следующий execute
       Цикл повторяется
```

### Детализация: Web UI → SDK → Server

```
Web UI                           SDK (Client API)              Server
   │                                  │                           │
   │  POST /sessions                  │                           │
   │  { projectId, task }             │                           │
   │─────────────────────────────────►│                           │
   │                                  │  POST /api/v1/invoke      │
   │                                  │  { context, result }      │
   │                                  │──────────────────────────►│
   │                                  │                           │
   │                                  │  ◄───────────────────────│
   │                                  │  { execute: { form: ... }│
   │                                  │    или promiseId          │
   │                                  │                           │
   │  ◄──────────────────────────────│                           │
   │  { execute: { form: ... } }     │                           │
   │                                  │                           │
   │  Рендерит форму/сообщение        │                           │
   │                                  │                           │
   │  Пользователь выбирает           │                           │
   │  POST /sessions/:id/next         │                           │
   │  { result: { choice: ... } }   │                           │
   │─────────────────────────────────►│                           │
   │                                  │  POST /api/v1/invoke      │
   │                                  │  { context, result }     │
   │                                  │──────────────────────────►│
   │                                  │                           │
   │                                  │  ◄───────────────────────│
   │                                  │  { execute: { script: }  │
   │                                  │    или promiseId          │
   │                                  │                           │
   │  Если UI-тип:                   │                           │
   │  ◄──────────────────────────────│                           │
   │  { execute: { form: ... } }     │                           │
   │                                  │                           │
   │                                  │  Если Action-тип:        │
   │                                  │  handleScriptAction()     │
   │                                  │  (выполняет локально)     │
   │                                  │                           │
   │                                  │  sendContinue()          │
   │                                  │  POST /api/v1/invoke      │
   │                                  │  { context, result }     │
   │                                  │──────────────────────────►│
   │                                  │                           │
   │                                  │  ◄───────────────────────│
   │                                  │  Следующий execute        │
```

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Инициализация приложения](#2-инициализация-приложения)
3. [Управление проектами](#3-управление-проектами)
4. [Управление сессиями](#4-управление-сессиями)
5. [Поток задач (TaskFlow)](#5-поток-задач-taskflow)
6. [Обработка execute-ответов](#6-обработка-execute-ответов)
7. [Отправка result на сервер](#7-отправка-result-на-сервер)
8. [Событийная модель](#8-событийная-модель)
9. [Обработка ошибок](#9-обработка-ошибок)
10. [HTTP-взаимодействие](#10-http-взаимодействие)

---

## 1. Обзор архитектуры

### 1.1 Компонентная схема

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEB CLIENT (a2a-client/web)                     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  AppTask    │  │ ProjectMgr  │  │SessionMgr   │  │ TaskbarMgr  │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │           │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐    │
│  │                      SessionStore                               │    │
│  │  (единый источник истины: context, execute, messages, status)  │    │
│  └────────────────────────────┬───────────────────────────────────┘    │
│                               │                                         │
│  ┌───────────────────────────┴───────────────────────────────────┐    │
│  │                    APIIntegration                               │    │
│  │            (HTTP-запросы к Client API)                         │    │
│  └────────────────────────────┬───────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         CLIENT API (порт 3001)                           │
│  - Хранит сессии                                                        │
│  - Проксирует запросы к Server                                          │
│  - Опрашивает promiseId                                                  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         SERVER (порт 3000) - STATELESS                   │
│  - Обрабатывает invoke-запросы                                           │
│  - Возвращает execute с action-key shape                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Ключевые принципы

| Принцип | Описание |
|---------|---------|
| **Stateless Server** | Сервер не хранит сессии, только обрабатывает запросы |
| **Action-Key Shape** | Все execute/result используют формат `{ "action-name": { ... } }` |
| **Async Flow** | Используется promiseId polling для асинхронных операций |
| **Single Source of Truth** | SessionStore - единое хранилище состояния на клиенте |
| **Event-Driven** | Компоненты общаются через события |

---

## 2. Инициализация приложения

### 2.1 Последовательность инициализации

```
AppTask.init()
    │
    ├── 1. TemplateLoader.initTaskOnly()
    │       └── Загружает header template (Settings/Projects кнопки)
    │
    ├── 2. loadModules()
    │       ├── project-manager.js
    │       ├── window-manager.js
    │       └── taskbar-manager.js
    │
    ├── 3. ProjectManager.init()
    │       └── Инициализация управления проектами
    │
    ├── 4. SessionManager.init()
    │       └── Инициализация управления сессиями
    │
    ├── 5. WindowManager.init()
    │       └── Инициализация управления окнами
    │
    ├── 6. TaskbarManager.init()
    │       └── Инициализация таскбара
    │
    ├── 7. setupUI()
    │       ├── Глобальные клавиатурные сокращения (Ctrl+N, Ctrl+W)
    │       ├── Window resize handler
    │       └── Modal buttons (Settings, Projects)
    │
    └── 8. restoreState()
            └── Восстановление окон сессий
```

### 2.2 Глобальные объекты

```javascript
// Основные глобальные объекты
window.AppTask          // Главная точка входа
window.ProjectManager   // Управление проектами
window.SessionManager   // Управление сессиями
window.TaskbarManager   // Управление таскбаром
window.WindowManager    // Управление окнами
window.SessionStore     // Единое хранилище состояния
window.apiIntegration   // HTTP-клиент
window.TaskFlow         // Поток задач
window.ErrorHandler     // Обработка ошибок
window.PanelManager     // Управление панелями
window.ActionHandler    // Обработка действий
```

---

## 3. Управление проектами

### 3.1 Операции с проектами

| Операция | Метод API | Описание |
|----------|-----------|---------|
| Получить список | `GET /api/a2a/projects` | Загрузка всех проектов |
| Создать проект | `POST /api/a2a/projects` | Создание нового проекта |
| Выбрать проект | `ProjectManager.setSelectedProjectId()` | Установка активного проекта |
| Получить текущий | `ProjectManager.getSelectedProjectId()` | ID текущего проекта |

### 3.2 Выбор проекта в UI

```javascript
// При изменении проекта в dropdown
document.getElementById('projectSelect').addEventListener('change', async (e) => {
    const projectId = e.target.value;
    await global.ProjectManager?.setSelectedProjectId(projectId);
    
    // Обновить URL API для этого проекта
    if (global.apiIntegration) {
        global.apiIntegration.configure({ apiBase: base });
    }
    
    // Перезагрузить сессии
    await global.SessionManager?.loadSessions(projectId);
});
```

---

## 4. Управление сессиями

### 4.1 Жизненный цикл сессии с Router формой

После создания сессии Client API Server **сразу возвращает** `execute.form` с полем ввода для task (router форма):

```
Создание сессии
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/sessions { projectId }                              │
│       │                                                          │
│       ▼                                                          │
│  Client API Server                                              │
│  - Создает сессию                                               │
│  - СРАЗУ возвращает execute.form с input для ввода task       │
│       │                                                          │
│       ▼                                                          │
│  ◄── { sessionId, execute: { form: { input: [...] } } }      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────┐
│   Ожидает      │  ◄── execute.form.input (поле для ввода task)
│   (waiting)    │      Пользователь вводит task
└────────┬────────┘
         │
         │ POST /sessions/:id/next { result: { message: task } }
         ▼
┌─────────────────┐
│   Активна      │  ──► Server обрабатывает task
│   (active)     │      Возвращает execute.form.choices (роутер)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Выбор       │  ◄── execute.form.choices
│   (waiting)    │      Пользователь выбирает действие
└────────┬────────┘
         │
         │ POST /sessions/:id/next { result: { choice: ... } }
         ▼
┌─────────────────┐
│   Выполнение   │  ◄── SDK выполняет script/read/write/command/rag
│   (active)     │      и отправляет result на Server
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Завершена    │  ◄── execute.finalResult
│   (completed)  │
└─────────────────┘
```

### 4.2 Создание сессии - Client API Server возвращает Router форму

```javascript
// При создании сессии Client API Server СРАЗУ возвращает форму для ввода task
// Это router форма!

async function createSessionRouter(projectId) {
    // POST /api/sessions
    const response = await apiIntegration.createSession({
        projectId: projectId
        // НЕ передаем task!
    });
    
    const sessionId = response.sessionId || response.id;
    
    // Server возвращает execute.form с полем ввода для task
    // Это router форма!
    const execute = response.execute;  // { form: { input: [...] } }
    
    // Сохранить в SessionStore
    if (global.SessionStore?.createSession) {
        global.SessionStore.createSession({
            id: sessionId,
            projectId: projectId,
            execute: execute
        });
    }
    
    // Web UI рендерит форму ввода task
    if (execute?.form) {
        renderForm(execute.form);  // <- input поле для ввода task
    }
    
    return { sessionId, execute };
}
```

### 4.3 Отправка введенного task на Server

```javascript
// Пользователь вводит task в форму и отправляет
// Это отправляется как result.message на Server

async function submitTaskToSession(sessionId, taskText) {
    // Отправляем task как message result
    // POST /sessions/:id/next { result: { message: { content: taskText } } }
    const response = await ActionHandler.submit(sessionId, projectId, {
        message: { content: taskText }
    }, context);
    
    // Server обрабатывает task и возвращает:
    // - execute.form.choices (роутер) - выбор действия
    // - или сразу execute.script (выполнение)
    return response;
}
```
    });
    
    const sessionId = response.sessionId || response.id;
    const serverResponse = response.serverResponse;  // sync ответ от сервера
    
    // Обработка sync ответа
    if (serverResponse?.data?.execute) {
        renderExecute(serverResponse.data.execute);
    } else if (serverResponse?.execute) {
        renderExecute(serverResponse.execute);
    }
    
    return { sessionId };
}
```

### 4.4 Отправка task на существующую сессию (append)

```javascript
// Если сессия уже создана, можно отправить task как result
// Используется для добавления задачи к уже созданной сессии

async function sendTaskToSession(sessionId, task) {
    // POST /api/sessions/:id/next { result: { message: task } }
    const response = await ActionHandler.submit(sessionId, projectId, {
        message: task
    }, context);
    
    // Ожидаем execute от сервера
    return waitForExecuteResponse();
}
```

### 4.5 Восстановление сессий

```javascript
async function restoreState() {
    // Восстановить окна сессий
    await WindowManager.restoreSessionWindows();
    
    // Обеспечить видимость таскбара
    TaskbarManager.ensureTaskbar();
}
```

---

## 5. Поток задач (TaskFlow)

### 5.1 Варианты запуска задачи

**Вариант А: Сессия создается с execute.form (router)**

```javascript
// Самый частый сценарий:
// 1. Создаем пустую сессию
// 2. Client API Server сам решает какой execute вернуть
// 3. Обычно это router (execute.form.choices)

TaskFlow.run(projectId)
    │
    ├── 1. POST /api/sessions { projectId }
    │       (БЕЗ task!)
    │
    ├── 2. Client API Server:
    │       - Создает сессию
    │       - Анализирует контекст
    │       - Возвращает execute.form (router)
    │
    ├── 3. SessionStore.setSession(sessionId, projectId)
    │
    ├── 4. Если есть execute → renderExecute()
    │       └── execute.form.choices (список действий)
    │
    └── 5. Подписка на события
            SessionStore.on('execute', callback)
```

**Вариант Б: Сессия создается с task**

```javascript
// Используется когда пользователь уже ввел task

TaskFlow.run(task, projectId)
    │
    ├── 1. POST /api/sessions { projectId, task }
    │       (С task)
    │
    ├── 2. Client API Server:
    │       - Создает сессию с task
    │       - Может сразу обработать task
    │       - Возвращает sync execute или promiseId
    │
    └── 3. Обработка ответа
            ├── syncExecute → renderExecute() сразу
            └── promiseId → ожидание через polling
```

### 5.2 Отправка выбора (form.choices)

```javascript
async function sendChoice(choiceId, contentEl) {
    const sessionId = TaskFlow._sessionId;
    const projectId = TaskFlow._projectId;
    
    // Показать состояние "отправка"
    contentEl.innerHTML = `
        <div class="task-flow-sending">
            <p>Sending choice: <strong>${choiceLabel}</strong></p>
        </div>
    `;
    
    // Ожидание ответа ДО отправки (предотвращение race condition)
    const outcomePromise = waitForFirstResponse(60000);
    
    // POST /api/sessions/:id/next { choice: choiceId }
    await ActionHandler.submit(sessionId, projectId, {
        choice: choiceId
    }, TaskFlow._buildContext());
    
    // Ожидание результата
    const outcome = await outcomePromise;
    
    if (outcome.execute) {
        setPanelContent(contentEl, 'execute', { execute: outcome.execute, ... });
    }
}
```

### 5.3 Отправка сообщения (form.input)

```javascript
async function sendMessageResult(messageText, contentEl) {
    const sessionId = TaskFlow._sessionId;
    const projectId = TaskFlow._projectId;
    
    // Добавить сообщение в историю
    SessionStore.pushMessage({ content: messageText }, 'user');
    
    // Ожидание ответа
    const outcomePromise = waitForFirstResponse(60000);
    
    // POST /api/sessions/:id/next { message: messageText }
    await ActionHandler.submit(sessionId, projectId, {
        message: messageText
    }, TaskFlow._buildContext());
    
    const outcome = await outcomePromise;
    
    if (outcome.execute) {
        renderExecute(contentEl, outcome.execute, ...);
    }
}
```

---

## 6. Обработка execute-ответов

### 6.1 Маршрутизация: UI vs Action

```javascript
// В SDK: detectResponseType() определяет тип ответа
// Где обрабатывать - в Web UI или в SDK

function detectResponseType(response) {
    if (!response?.execute) return 'unknown';
    
    const firstKey = Object.keys(response.execute)[0];
    
    // UI-only типы - обрабатывает Web UI
    if (firstKey === 'form' || firstKey === 'message') {
        return firstKey; // 'form' или 'message'
    }
    
    // Action типы - обрабатывает SDK
    const clientActionTypes = ['script', 'read-file', 'write-file', 'rag-search', 'execute-command'];
    if (clientActionTypes.includes(firstKey)) {
        return 'action';
    }
    
    return 'unknown';
}
```

### 6.2 Web UI Responsibilities (ТОЛЬКО UI)

**execute.form** - отображение и сбор данных:

```javascript
// Web UI рендерит форму выбора
function renderForm(contentEl, form, ...) {
    // Только рендеринг и сбор ввода!
    
    // Если есть choices - кнопки выбора
    if (form.choices) {
        const buttons = form.choices.map(c => 
            `<button data-choice-id="${c.id}">${c.label}</button>`
        );
    }
    
    // Если есть input - поля ввода
    if (form.input) {
        const inputs = form.input.map(field => 
            `<input type="${field.type}" name="${field.name}">`
        );
    }
    
    // При отправке - вызов SDK
    btn.addEventListener('click', async () => {
        const result = { choice: choiceId }; // или { message: inputValue }
        await ActionHandler.submit(sessionId, projectId, result, context);
    });
}
```

**execute.message** - только отображение:

```javascript
// Web UI показывает сообщение
function renderMessage(contentEl, message, ...) {
    contentEl.innerHTML = `
        <div class="message">
            ${escapeHtml(message.content)}
        </div>
        <input type="text" placeholder="Ваш ответ...">
        <button>Отправить</button>
    `;
}
```

### 6.3 SDK Responsibilities (ВСЯ РАБОТА)

**execute.script** - выполнение кода:

```javascript
// SDK выполняет скрипт
async function handleScriptAction(payload, options) {
    const { code, input } = payload;
    
    // Выполнение через script-runner
    const result = await options.executeScript(code, input, {
        workingDir: options.projectPath,
        sessionId: options.sessionId
    });
    
    // Возвращает result в формате action-key
    return {
        handled: true,
        result: {
            script: {
                output: result.data
            }
        }
    };
}
```

**execute.read-file / write-file** - файловые операции:

```javascript
// SDK работает с файловой системой
async function handleReadFileAction(payload, options) {
    const { path, startLine, endLine } = payload;
    
    const content = await options.readFile(path, { startLine, endLine });
    
    return {
        handled: true,
        result: {
            'read-file': { path, content }
        }
    };
}
```

**execute.execute-command** - выполнение команд:

```javascript
// SDK выполняет shell команды
async function handleExecuteCommandAction(payload, options) {
    const { command, cwd, env, timeout } = payload;
    
    const result = await options.executeCommand(command, { cwd, env, timeout });
    
    return {
        handled: true,
        result: {
            'execute-command': {
                command,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr
            }
        }
    };
}
```

**execute['rag-search']** - RAG поиск:

```javascript
// SDK выполняет RAG поиск
async function handleRagSearchAction(payload, options) {
    const { query, limit, filters } = payload;
    
    const results = await options.ragSearch(query, { limit, filters });
    
    return {
        handled: true,
        result: {
            'rag-search': {
                query,
                results
            }
        }
    };
}
```

| Тип execute | Обработчик | Описание |
|-------------|------------|----------|
| `execute.form.choices` | `renderForm()` | Кнопки выбора действий |
| `execute.form.input` | `renderForm()` | Поле ввода текста |
| `execute.message` | `renderMessage()` | Сообщение от AI |
| `execute.script` | `renderClientAction()` | Выполнение скрипта |
| `execute['rag-search']` | `renderClientAction()` | RAG поиск |
| `execute['read-file']` | `renderClientAction()` | Чтение файла |
| `execute['write-file']` | `renderClientAction()` | Запись файла |
| `execute['execute-command']` | `renderClientAction()` | Выполнение команды |
| `execute.debug` | `renderDebug()` | Отладочная информация |

### 6.2 Рендеринг формы выбора

```javascript
function renderForm(contentEl, form, ...) {
    const hasChoices = form.choices?.length > 0;
    
    if (hasChoices) {
        const buttons = form.choices.map((c) =>
            `<button type="button" 
                     class="task-flow-choice-btn" 
                     data-choice-id="${c.id}">${c.label}</button>`
        ).join('');
        
        formContent += `<div class="task-flow-choices">${buttons}</div>`;
    }
    
    // Привязка обработчиков
    contentEl.querySelectorAll('.task-flow-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const choiceId = btn.getAttribute('data-choice-id');
            taskFlowRef.sendChoice(choiceId, contentEl);
        });
    });
}
```

### 6.3 Рендеринг сообщения

```javascript
function renderMessage(contentEl, message, ...) {
    const messageContent = typeof message === 'string' 
        ? message 
        : (message.content || message.text || '');
    
    contentEl.innerHTML = `
        ${historyHtml}
        <div class="task-flow-message-container">
            <div class="task-flow-message-display">${escapeHtml(messageContent)}</div>
        </div>
    `;
}
```

---

## 7. Отправка result на сервер

### 7.1 Формат result (Action-Key Shape)

```javascript
// Правильный формат (обязательно!)
const result = {
    // Выбор из form.choices
    result: {
        "choice": { "id": "fix-vue-imports" }
    },
    
    // Сообщение пользователя
    result: {
        "message": { "content": "Продолжить выполнение" }
    },
    
    // Результат скрипта
    result: {
        "script": { "broken_imports": [...] }
    },
    
    // Результат RAG поиска
    result: {
        "rag-search": { "results": [...], "files": [...] }
    },
    
    // Результат чтения файла
    result: {
        "read-file": { "path": "...", "content": "..." }
    },
    
    // Результат записи файла
    result: {
        "write-file": { "path": "...", "success": true }
    },
    
    // Результат выполнения команды
    result: {
        "execute-command": { "command": "...", "exitCode": 0, "stdout": "..." }
    }
};
```

### 7.2 Отправка через ActionHandler

```javascript
// ActionHandler.submit() отправляет result на сервер
await ActionHandler.submit(sessionId, projectId, resultData, context);

// Где resultData содержит:
// - choice: ID выбранного действия
// - message: Текст сообщения
// - script: Результат выполнения скрипта
// - и т.д.
```

---

## 8. Событийная модель

### 8.1 События SessionStore

```javascript
// Подписка на события
SessionStore.on('execute', (execute) => {
    // Получен execute от сервера
    renderExecute(execute);
});

SessionStore.on('message', (message) => {
    // Новое сообщение в истории
    updateMessageHistory(message);
});

SessionStore.on('pendingForm', (form) => {
    // Ожидается ввод пользователя (form.choices или form.input)
    showForm(form);
});

SessionStore.on('error', (error) => {
    // Ошибка при выполнении
    ErrorHandler.handle(error);
});

SessionStore.on('completed', (finalResult) => {
    // Задача завершена
    showCompletion(finalResult);
});

SessionStore.on('status', (status) => {
    // Изменение статуса: idle, created, active, waiting, completed, error
    updateUI(status);
});
```

### 8.2 События APIIntegration

```javascript
apiIntegration.on('networkError', ({ error, context }) => {
    // Ошибка сети
    ErrorHandler.handle(error, context);
});

apiIntegration.on('promiseError', ({ error, context }) => {
    // Ошибка promise (async операция)
    ErrorHandler.handle(error, context);
});
```

---

## 9. Обработка ошибок

### 9.1 Типы ошибок

| Тип | Источник | Обработка |
|------|----------|-----------|
| `networkError` | APIIntegration | Повторная попытка с экспоненциальной задержкой |
| `promiseError` | Async polling | Показать ошибку, предложить повтор |
| `timeoutError` | waitForFirstResponse() | Показать "Превышен таймаут", кнопка повтора |
| `validationError` | Сервер | Показать сообщение валидации |
| `scriptError` | Выполнение скрипта | Логировать, показать пользователю |

### 9.2 Retry логика

```javascript
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

async function fetchWithRetry(url, options = {}, retryCount = 0) {
    // Экспоненциальная задержка: 2s, 4s, 8s
    const delay = BASE_DELAY * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return fetchWithRetry(url, options, retryCount + 1);
}
```

---

## 11. Устранение проблем: почему форма не загружается для существующих сессий

### 11.1 Анализ проблемы

При восстановлении сессий (3 сессии), форма не отображается. Возможные причины:

**Проблема 1: Неправильный метод в window-events.js**

```javascript
// window-events.js, строка 43 - ОШИБКА!
const execute = store.getExecute?.() || store.execute;

// В SessionStore нет метода getExecute()!
// Есть только свойство store.execute (строка 86 в session-store.js)
```

Исправление:
```javascript
// Правильно:
const execute = store.execute;
```

**Проблема 2: API не возвращает execute при GET запросе**

```javascript
// api-integration.js, строка 186-194
async getSession(sessionId, projectId = null) {
    const res = await fetch(`/api/a2a/projects/${projectId}/sessions/${sessionId}`);
    if (!res.ok) return null;
    return res.json();  // <- Не факт что возвращает execute!
}
```

### 11.2 Исправления в коде

**window-events.js - добавить getExecute метод или использовать напрямую:**

```javascript
// Вариант 1: Исправить обращение к execute
const execute = store.execute;

// Вариант 2: Добавить метод getExecute в SessionStore
SessionStore.prototype.getExecute = function() {
    return this._state.execute;
};
```

**Проверить что Client API Server возвращает execute:**

```javascript
// При GET /sessions/:id должен возвращаться объект с полем execute:
{
    id: "session_123",
    projectId: "proj_456",
    status: "waiting",
    context: { task: "...", execution: {...} },
    execute: { form: { input: [...] } }  // <- Это поле критично!
}
```

### 11.3 Диагностика

Добавить логирование для отладки:

```javascript
// В window-state.js после загрузки sessionData
console.log('[WindowState] Session data:', JSON.stringify(sessionData, null, 2));
console.log('[WindowState] Execute:', sessionData?.execute);

// В window-events.js
console.log('[WindowEvents] Store execute:', store.execute);
```

### 10.1 API эндпоинты (Client API)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/a2a/projects` | Список проектов |
| `POST` | `/api/a2a/projects` | Создать проект |
| `GET` | `/api/a2a/projects/:id/sessions` | Список сессий проекта |
| `POST` | `/api/a2a/projects/:id/sessions` | Создать сессию |
| `GET` | `/api/a2a/projects/:id/sessions/:sessionId` | Получить сессию |
| `DELETE` | `/api/a2a/projects/:id/sessions/:sessionId` | Удалить сессию |

### 10.2 Транспортный уровень

```
Web                    Client API              Server
 │                          │                     │
 │ ── POST /sessions ──────►│                     │
 │                          │── POST /invoke ────►│
 │                          │◄── promiseId ───────│
 │◄── sessionId + execute ──│                     │
 │                          │                     │
 │ (опрос promiseId)        │                     │
 │ ── GET /sessions/:id ───►│                     │
 │                          │── GET /promise/id ->│
 │                          │◄── status: done ────│
 │                          │── GET /promise/... │ 
 │                          │◄── result ──────────│
 │◄── execute.* ────────────│                     │
 │                          │                     │
 │ ── POST /sessions/:id/next ───────────────────►│
 │◄── execute.* (следующий шаг) ──────────────────│
```

### 10.3 Sync vs Async режим

**Sync Mode** (используется для простых операций):
- Сервер возвращает `execute` сразу в ответе на создание сессии
- Используется для: form.choices, form.input, простых действий

**Async Mode** (по умолчанию):
- Сервер возвращает `promiseId`
- Client API опрашивает статус до `completed`
- Используется для: LLM запросов, длительных операций

---

## Приложение: Структура файлов

```
a2a-client/web/js/
│
├── app/
│   ├── app-task.js          # Главная инициализация
│   ├── session-manager.js   # Управление сессиями
│   ├── project-manager.js   # Управление проектами
│   ├── taskbar-manager.js   # Управление таскбаром
│   └── window-manager.js    # Управление окнами
│
├── task-flow/
│   ├── api.js               # HTTP fetch + retry
│   ├── core.js              # TaskFlow логика
│   ├── render.js            # Рендеринг execute
│   └── index.js             # Экспорт модуля
│
├── session-store.js         # Единое хранилище состояния
├── api-integration.js       # HTTP клиент
├── error-handler.js         # Обработка ошибок
├── storage.js               # LocalStorage адаптер
├── template-loader.js       # Загрузка шаблонов
└── components/
    └── floating-panel.js    # Плавающие панели
```

---

## Ссылки

- [PROTOCOL.md](../docs/new-request-flow/PROTOCOL.md) - Полный протокол A2A
- [ARCHITECTURE.md](../docs/new-request-flow/ARCHITECTURE.md) - Архитектура системы
- [WEB-UI.md](../docs/new-request-flow/WEB-UI.md) - Документация Web UI
- [SCHEMAS.md](../docs/new-request-flow/SCHEMAS.md) - JSON схемы
