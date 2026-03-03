# AI Actions Session Panel - Руководство пользователя

## Обзор

AI Actions Session Panel - это веб-компонент для отображения и управления сессиями AI actions в веб-интерфейсе. Панель предоставляет удобный интерфейс для просмотра истории действий, управления сессиями и взаимодействия с AI actions.

## Функциональные возможности

### Основные функции

- **Управление сессиями**: Создание, переключение и удаление сессий
- **Отображение действий**: Просмотр истории действий в сессии
- **Типы действий**: Поддержка различных типов действий (form, message, script)
- **Состояния действий**: Отображение статусов действий (pending, completed, error)
- **Интеграция**: Легкая интеграция с существующими веб-приложениями
- **Сохранение данных**: Автоматическое сохранение в localStorage

### Типы действий

#### Form Action
- Отображение интерактивных форм
- Поддержка выбора вариантов
- Статусы: pending, completed, error

#### Message Action
- Отображение текстовых сообщений
- Поддержка markdown разметки
- Статусы: pending, completed, error

#### Script Action
- Отображение результатов выполнения скриптов
- Показ входных и выходных данных
- Отображение кода скрипта
- Статусы: pending, completed, error

## Установка и настройка

### 1. Подключение зависимостей

```html
<!-- Подключить стили -->
<link rel="stylesheet" href="css/ai-actions-panel.css">

<!-- Подключить зависимости -->
<script src="js/panel-dock.js"></script>
<script src="js/web-api-client.js"></script>

<!-- Подключить компоненты -->
<script src="js/ai-actions-session-panel.js"></script>
<script src="js/examples/ai-actions-integration.js"></script>
```

### 2. Создание DOM элемента

```javascript
// Создать DOM элемент для панели
const panelDOM = createAIActionsPanelDOM({
    id: 'ai-actions-panel',
    title: 'AI Actions',
    slot: 'right'
});

// Добавить в документ
document.body.appendChild(panelDOM);
```

### 3. Инициализация панели

```javascript
// Создать панель
const panel = new AIActionsSessionPanel(panelDOM, {
    id: 'ai-actions-panel',
    slot: 'right',
    critical: false
});

// Инициализировать
await panel.init();
```

## Использование API

### Управление сессиями

#### Создание сессии
```javascript
const sessionId = panel.createSession('my-session', {
    title: 'My Session',
    description: 'Session description'
});
```

#### Переключение сессий
```javascript
// Переключиться на сессию
panel.switchToSession('my-session');

// Получить текущую сессию
const currentSession = panel.getCurrentSession();
```

#### Управление сессиями
```javascript
// Получить все сессии
const sessions = panel.getAllSessions();

// Получить конкретную сессию
const session = panel.getSession('my-session');

// Удалить сессию
panel.removeSession('my-session');

// Обновить статус сессии
panel.updateSessionStatus('my-session', 'completed');
```

### Управление действиями

#### Добавление действий
```javascript
// Добавить form action
panel.addActionToSession('my-session', {
    type: 'form',
    title: 'Choose option',
    choices: [
        { id: 'opt1', label: 'Option 1' },
        { id: 'opt2', label: 'Option 2' }
    ],
    status: 'pending'
});

// Добавить message action
panel.addActionToSession('my-session', {
    type: 'message',
    content: 'Hello World!',
    status: 'completed'
});

// Добавить script action
panel.addActionToSession('my-session', {
    type: 'script',
    input: { data: 'test' },
    output: 'Script executed successfully',
    code: 'console.log("test");',
    status: 'completed'
});
```

#### Управление действиями
```javascript
// Получить все действия сессии
const actions = panel.getActionsFromSession('my-session');

// Обновить статус действия
panel.updateActionStatus('my-session', actionId, 'completed');

// Удалить действие
panel.removeActionFromSession('my-session', actionId);

// Очистить все действия сессии
panel.clearActionsFromSession('my-session');
```

### Работа с данными

#### Экспорт и импорт
```javascript
// Экспортировать сессию
const exportedData = panel.exportSession('my-session');

// Импортировать сессию
const importResult = panel.importSession(exportedData);

// Экспортировать все сессии
const allSessions = panel.exportAllSessions();
```

#### Сохранение в localStorage
```javascript
// Сохранить данные
panel.saveToStorage();

// Загрузить данные
const loadedData = panel.loadFromStorage();

// Очистить сохраненные данные
panel.clearStorage();
```

## События

### События панели

#### Сессионные события
```javascript
// Событие создания сессии
panel.on('session-created', (session) => {
    console.log('Session created:', session);
});

// Событие переключения сессии
panel.on('session-switch', (session) => {
    console.log('Switched to session:', session);
});

// Событие обновления статуса сессии
panel.on('session-status-update', (data) => {
    console.log('Session status updated:', data);
});
```

#### События действий
```javascript
// Событие добавления действия
panel.on('action-added', (data) => {
    console.log('Action added:', data);
});

// Событие выполнения AI action
panel.on('ai-action-executed', (data) => {
    console.log('AI action executed:', data);
});

// Событие ошибки AI action
panel.on('ai-action-error', (data) => {
    console.log('AI action error:', data);
});
```

### Глобальные события

```javascript
// Слушать глобальные события
document.addEventListener('ai-actions-session-created', (event) => {
    const { sessionId, sessionData } = event.detail;
    console.log('Global session created:', sessionId, sessionData);
});

document.addEventListener('ai-actions-action-added', (event) => {
    const { sessionId, actionData } = event.detail;
    console.log('Global action added:', sessionId, actionData);
});
```

## Интеграция

### Интеграция с PanelDock

```javascript
// PanelDock автоматически управляет панелью
const dock = new PanelDock();
dock.addPanel(panel);

// Управление видимостью
dock.showPanel('ai-actions-panel');
dock.hidePanel('ai-actions-panel');
```

### Интеграция с WebApiClient

```javascript
// Автоматическая интеграция через WebApiClient
const apiClient = new WebApiClient();
apiClient.on('ai-action-executed', (data) => {
    // Автоматически добавляется в панель
    console.log('AI action executed:', data);
});
```

### Интеграция с существующим приложением

```javascript
// Интеграция с вашим приложением
class MyApplication {
    constructor() {
        this.panel = null;
        this.initPanel();
    }

    async initPanel() {
        // Создать и инициализировать панель
        const panelDOM = createAIActionsPanelDOM({
            id: 'my-app-panel',
            title: 'My App Actions',
            slot: 'right'
        });

        this.panel = new AIActionsSessionPanel(panelDOM, {
            id: 'my-app-panel',
            slot: 'right',
            critical: false
        });

        await this.panel.init();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Обработка событий вашего приложения
        this.panel.on('session-created', (session) => {
            this.handleSessionCreated(session);
        });

        this.panel.on('action-added', (data) => {
            this.handleActionAdded(data);
        });
    }

    handleSessionCreated(session) {
        // Ваша логика обработки создания сессии
        console.log('Session created in app:', session);
    }

    handleActionAdded(data) {
        // Ваша логика обработки добавления действия
        console.log('Action added in app:', data);
    }
}
```

## Примеры использования

### Простой пример

```html
<!DOCTYPE html>
<html>
<head>
    <title>AI Actions Panel Example</title>
    <link rel="stylesheet" href="css/ai-actions-panel.css">
</head>
<body>
    <div id="app">
        <h1>My Application</h1>
        <button id="create-session">Create Session</button>
        <button id="add-action">Add Action</button>
    </div>

    <script src="js/panel-dock.js"></script>
    <script src="js/web-api-client.js"></script>
    <script src="js/ai-actions-session-panel.js"></script>
    <script>
        // Инициализация
        async function init() {
            const panelDOM = createAIActionsPanelDOM({
                id: 'example-panel',
                title: 'Example Actions',
                slot: 'right'
            });

            const panel = new AIActionsSessionPanel(panelDOM, {
                id: 'example-panel',
                slot: 'right',
                critical: false
            });

            await panel.init();

            // Обработчики кнопок
            document.getElementById('create-session').addEventListener('click', () => {
                panel.createSession('example-session');
            });

            document.getElementById('add-action').addEventListener('click', () => {
                panel.addActionToSession('example-session', {
                    type: 'message',
                    content: 'Hello from example!',
                    status: 'completed'
                });
            });
        }

        init();
    </script>
</body>
</html>
```

### Расширенный пример

```javascript
// Расширенный пример интеграции
class AdvancedExample {
    constructor() {
        this.panel = null;
        this.currentSessionId = null;
        this.init();
    }

    async init() {
        await this.createPanel();
        this.setupEventHandlers();
        this.createExampleData();
    }

    async createPanel() {
        const panelDOM = createAIActionsPanelDOM({
            id: 'advanced-panel',
            title: 'Advanced Example',
            slot: 'right'
        });

        this.panel = new AIActionsSessionPanel(panelDOM, {
            id: 'advanced-panel',
            slot: 'right',
            critical: false
        });

        await this.panel.init();
    }

    setupEventHandlers() {
        // Обработка событий панели
        this.panel.on('session-created', (session) => {
            console.log('Session created:', session);
            this.onSessionCreated(session);
        });

        this.panel.on('action-added', (data) => {
            console.log('Action added:', data);
            this.onActionAdded(data);
        });

        this.panel.on('session-switch', (session) => {
            console.log('Session switched:', session);
            this.currentSessionId = session.id;
        });
    }

    onSessionCreated(session) {
        // Добавить приветственное сообщение
        this.panel.addActionToSession(session.id, {
            type: 'message',
            content: `Добро пожаловать в сессию ${session.title}!`,
            status: 'completed'
        });
    }

    onActionAdded(data) {
        // Логировать все добавленные действия
        console.log(`Action added to session ${data.sessionId}:`, data.action);
    }

    createExampleData() {
        // Создать примеры сессий и действий
        const sessionId1 = this.panel.createSession('example-1', {
            title: 'Example Session 1',
            description: 'First example session'
        });

        const sessionId2 = this.panel.createSession('example-2', {
            title: 'Example Session 2',
            description: 'Second example session'
        });

        // Добавить примеры действий
        this.panel.addActionToSession(sessionId1, {
            type: 'form',
            title: 'Choose an option',
            choices: [
                { id: 'opt1', label: 'Option 1' },
                { id: 'opt2', label: 'Option 2' }
            ],
            status: 'pending'
        });

        this.panel.addActionToSession(sessionId2, {
            type: 'message',
            content: 'This is a test message',
            status: 'completed'
        });

        this.panel.addActionToSession(sessionId2, {
            type: 'script',
            input: { data: 'test input' },
            output: 'Script executed successfully',
            code: 'console.log("Hello World");',
            status: 'completed'
        });
    }

    // Методы для управления извне
    createNewSession(title, description) {
        return this.panel.createSession(`session-${Date.now()}`, {
            title: title,
            description: description
        });
    }

    addMessageToCurrentSession(content) {
        if (this.currentSessionId) {
            this.panel.addActionToSession(this.currentSessionId, {
                type: 'message',
                content: content,
                status: 'completed'
            });
        }
    }

    addFormToCurrentSession(title, choices) {
        if (this.currentSessionId) {
            this.panel.addActionToSession(this.currentSessionId, {
                type: 'form',
                title: title,
                choices: choices,
                status: 'pending'
            });
        }
    }
}

// Использование
const example = new AdvancedExample();

// Глобальные функции для тестирования
window.example = example;
</script>
```

## Конфигурация

### Параметры панели

```javascript
const panel = new AIActionsSessionPanel(container, {
    id: 'my-panel',           // Идентификатор панели
    slot: 'right',            // Позиция (left, right, top, bottom)
    critical: false,          // Критическая ли панель
    autoSave: true,           // Автоматическое сохранение
    debug: false,             // Режим отладки
    theme: 'default',         // Тема оформления
    maxActions: 100,          // Максимальное количество действий
    maxSessions: 50           // Максимальное количество сессий
});
```

### Параметры сессии

```javascript
const session = {
    id: 'session-id',
    title: 'Session Title',
    description: 'Session Description',
    status: 'active',         // active, completed, archived
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actions: []               // Массив действий
};
```

### Параметры действия

```javascript
const action = {
    id: 'action-id',
    type: 'message',          // form, message, script
    title: 'Action Title',    // Для form actions
    content: 'Message content', // Для message actions
    choices: [],              // Для form actions
    input: {},                // Для script actions
    output: '',               // Для script actions
    code: '',                 // Для script actions
    status: 'pending',        // pending, completed, error
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
```

## Тестирование

### Запуск тестов

```javascript
// Запустить все тесты
const results = await runAIActionsTests();
console.log('Test results:', results);

// Проверить результаты
if (results.failed === 0) {
    console.log('✅ All tests passed!');
} else {
    console.log(`❌ ${results.failed} tests failed`);
}
```

### Тестирование вручную

```javascript
// Создать тестовую сессию
const testSessionId = panel.createSession('test-session');

// Добавить тестовые действия
panel.addActionToSession(testSessionId, {
    type: 'message',
    content: 'Test message',
    status: 'completed'
});

// Проверить результаты
const actions = panel.getActionsFromSession(testSessionId);
console.log('Test actions:', actions);
```

## Отладка

### Режим отладки

```javascript
// Включить отладку
const panel = new AIActionsSessionPanel(container, {
    debug: true
});

// Проверить состояние панели
console.log('Panel state:', panel.getState());

// Проверить DOM элементы
console.log('Panel DOM:', panel.container);
console.log('Session list:', panel.container.querySelector('.session-list'));
console.log('Session content:', panel.container.querySelector('.session-content'));
```

### Логирование событий

```javascript
// Логировать все события
panel.on('*', (eventName, data) => {
    console.log(`Event: ${eventName}`, data);
});

// Логировать только определенные события
panel.on('session-created', (session) => {
    console.log('Session created:', session);
});
```

## Ограничения и рекомендации

### Ограничения

- **Производительность**: Рекомендуется не более 100 действий на сессию
- **Память**: Большие сессии могут занимать много памяти
- **localStorage**: Ограничен объемом localStorage (обычно 5-10MB)
- **Браузеры**: Поддержка современных браузеров (ES6+)

### Рекомендации

- **Очистка данных**: Регулярно очищайте старые сессии
- **Ограничение размера**: Ограничивайте размер действий
- **Сохранение**: Используйте autoSave для важных данных
- **Отладка**: Включайте debug режим только при разработке
- **Тестирование**: Регулярно тестируйте интеграцию

## Поддержка и развитие

### Сообщество

- **GitHub Issues**: Для багов и предложений
- **Discussions**: Для вопросов и обсуждений
- **Documentation**: Актуальная документация

### Вклад

- **Pull Requests**: Для улучшений и исправлений
- **Tests**: Обязательны для нового функционала
- **Documentation**: Обновляйте документацию при изменениях

### Версии

- **Semantic Versioning**: Следуем semver
- **Backward Compatibility**: Поддерживаем обратную совместимость
- **Migration Guide**: Для перехода между версиями

## Лицензия

Этот компонент распространяется под лицензией MIT. Подробнее см. в файле LICENSE.

## Контакты

- **Разработчик**: [Имя разработчика]
- **Email**: [email@example.com]
- **GitHub**: [ссылка на репозиторий]

---

**Последнее обновление**: [дата]  
**Версия**: 1.0.0  
**Совместимость**: ES6+, современные браузеры