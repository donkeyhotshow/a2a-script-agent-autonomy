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

## Порядок загрузки скриптов

Некоторые скрипты проксируют глобальные зависимости (например, `window.escapeHtml`, `window.executeHasActionableForm`, `window.WindowEvents` и `window.WindowPosition`). Чтобы избежать ошибок при сборке UI, соблюдайте следующий порядок:

1. `js/html-utils.js` — регистрирует `escapeHtml`, `escapeHtmlAttr`, `executeHasActionableForm` и другие утилиты. Загружайте его до любого модуля, который вызывает эти функции через `global.*`.
2. `js/install-normalizers.mjs` — предоставляет `global.Normalizers` до создания `SessionStore`.
3. `js/daemons/*` (emitter, dialog-loader, dialog-promise-poll) — устанавливают `global.__a2aDaemons`.
4. `js/session-data.js`, `js/project-store.js`, `js/session-store.js` — зависят от предыдущих шагов.
5. `js/app/windows/window-events.js`, `js/app/windows/window-position.js` — подключаются до `js/app/windows/window-state.js`, т.к. последнему требуется registries/handlers.

Если порядок нарушен, публичные объекты `WindowState`, `SessionStore` и другие вызовут исключение при инициализации.

## Использование

### Запуск

```bash
cd a2a-client
npm run dev   # Vite + vite-plugin-a2a serves /api/a2a/* in-process (see docs/CLIENT_API_WEB_SDK.md)
```

Optional: run `@a2a/sdk` on 3001 if you proxy `/api` there; not required for default dev.

### Конфигурация

Session/project calls use relative **`/api/a2a/...`** (`api-integration.js`). See [`docs/CLIENT_API_WEB_SDK.md`](../docs/CLIENT_API_WEB_SDK.md) before changing SDK vs plugin.

### Основные модули

#### SessionStore
Управление сессиями проекта (заменяет session-manager.js).
```javascript
SessionStore.init();
const state = SessionStore.getState();
await SessionStore.restoreAndReconnect();
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

Primary paths used by this tree: **`/api/a2a/projects`**, **`/api/a2a/sessions`**, step files under same base. Vite dev handles these via **vite-plugin-a2a** (not necessarily port 3001). Full map: [`docs/CLIENT_API_WEB_SDK.md`](../docs/CLIENT_API_WEB_SDK.md).

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
