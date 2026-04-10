# A2A Web UI

Веб-интерфейс для взаимодействия с A2A Server через Client API Server.

**Live stack:** Full-system start/restart is only from the repository root (`.\start-all.bat` / `./start-all.sh`), not from this folder alone.

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
│   ├── session-data.js      # Данные сессии
│   ├── session-store.js     # Хранилище сессий
│   ├── storage.js           # Универсальное хранилище
│   ├── active-session-storage.js # Активная сессия
│   ├── template-loader.js  # Загрузчик шаблонов
│   ├── resolve-web-script-url.js # Разрешение URL скриптов
│   ├── config.js           # Конфигурация
│   ├── app/                # Основные модули приложения
│   │   ├── project-manager.js   # Управление проектами
│   │   ├── session-manager.js   # Управление сессиями
│   │   ├── event-handlers.js    # Обработчики событий
│   │   ├── initialization.js    # Инициализация
│   │   ├── state-managers.js    # Управление состоянием
│   │   ├── taskbar-manager.js   # Менеджер панели задач
│   │   ├── ui-managers.js       # UI менеджеры
│   │   └── windows/            # Оконная подсистема
│   ├── task-flow/          # Модульный TaskFlow
│   │   ├── index.js        # Точка входа
│   │   ├── init.js         # Инициализация
│   │   ├── loader.js       # Загрузчик
│   │   ├── render.js       # Рендеринг UI
│   │   ├── tasks.js        # Задачи
│   │   ├── messages.js     # Сообщения
│   │   └── utils.js        # Утилиты
│   ├── daemons/            # Фоновые процессы
│   ├── utils/             # Утилиты нормализации
│   └── core/              # Основные модули
├── templates/              # HTML шаблоны
└── examples/              # Примеры
```

## Порядок загрузки скриптов

Некоторые скрипты проксируют глобальные зависимости (например, `window.escapeHtml`, `window.executeHasActionableForm`, `window.WindowEvents` и `window.WindowPosition`). Чтобы избежать ошибок при сборке UI, соблюдайте следующий порядок:

1. `js/html-utils.js` — регистрирует `escapeHtml`, `escapeHtmlAttr`, `executeHasActionableForm` и другие утилиты. Загружайте его до любого модуля, который вызывает эти функции через `global.*`.
2. `js/install-normalizers.mjs` — предоставляет `global.Normalizers` до создания `SessionStore`.
3. `js/daemons/*` (emitter, dialog-loader, dialog-promise-poll) — устанавливают `global.__a2aDaemons`.
4. `js/session-data.js`, `js/app/project-manager.js`, `js/session-store.js` — зависят от предыдущих шагов.
5. `js/app/windows/window-events.js`, `js/app/windows/window-position.js`, `js/app/windows/window-session-gateway.js`, `js/app/windows/window-recovery.js` — подключаются до `js/app/windows/window-state.js`, т.к. последнему требуются handlers + gateways.

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

#### Window Registry
Управление окнами UI (window-registry.js, window-state.js, window-position.js).
```javascript
await WindowRegistry.init().syncWithSessionStore();
WindowRegistry.open(config);
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
- Dev: Vite (default **5173**) + **vite-plugin-a2a** — Client API under `/api/a2a`; A2A Server stays on **3000** (called from the plugin). Standalone SDK server may use another port — see [`docs/CLIENT_API_WEB_SDK.md`](../docs/CLIENT_API_WEB_SDK.md).
- Meilisearch на порту 7700 (для RAG)

## A2A Protocol & Implementation

The Web UI follows the mandatory A2A Protocol for all interactions. Core specifications are located in the centralized documentation directory to ensure consistency with the Client API and SDK:

- **[Action-Key Shape & Form Specs](../docs/DIALOG-FRONTEND.md)** - Mandatory result formats and form interaction details
- **[Task Execution & Auto-Responses](../docs/workflows/task-execution/)** - Details on auto-executed actions (script, RAG) and system loops
- **[Process Visualization](../docs/DIALOG-FRONTEND.md#визуализация-процесса-process-visualization)** - How `context.execution` and `attachments` are rendered in the UI
- **[Session Storage](../docs/SESSION-STORAGE.md)** - Details on the `N+1` step storage pattern

## Documentation

- **[Central Documentation Root](../docs/README.md)** - Entry point for all A2A Client specifications
- **[Client API & Web SDK](../docs/CLIENT_API_WEB_SDK.md)** - Integration details and transport strategy
