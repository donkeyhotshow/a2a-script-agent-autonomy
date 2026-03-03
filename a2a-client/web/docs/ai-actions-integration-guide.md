# AI Actions Session Panel - Руководство по интеграции

## Обзор

Это руководство поможет вам интегрировать AI Actions Session Panel в ваше веб-приложение. Панель предоставляет удобный интерфейс для отображения и управления сессиями AI actions.

## Требования

### Минимальные требования

- **Браузер**: Современный браузер с поддержкой ES6+
- **JavaScript**: ES6+ (классы, async/await, модули)
- **CSS**: Поддержка CSS Grid и Flexbox
- **localStorage**: Для сохранения данных

### Рекомендуемые браузеры

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Быстрый старт

### 1. Подключение файлов

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App with AI Actions</title>
    
    <!-- Стили -->
    <link rel="stylesheet" href="css/ai-actions-panel.css">
    
    <!-- Зависимости -->
    <script src="js/panel-dock.js"></script>
    <script src="js/web-api-client.js"></script>
    
    <!-- Компоненты -->
    <script src="js/ai-actions-session-panel.js"></script>
    <script src="js/examples/ai-actions-integration.js"></script>
</head>
<body>
    <!-- Ваш контент -->
    <div id="app">
        <h1>My Application</h1>
    </div>
    
    <!-- Скрипт инициализации -->
    <script>
        // Инициализация будет описана ниже
    </script>
</body>
</html>
```

### 2. Инициализация панели

```javascript
// Дождаться загрузки всех зависимостей
window.addEventListener('load', async () => {
    try {
        // Создать DOM элемент для панели
        const panelDOM = createAIActionsPanelDOM({
            id: 'ai-actions-panel',
            title: 'AI Actions',
            slot: 'right'
        });

        // Создать панель
        const panel = new AIActionsSessionPanel(panelDOM, {
            id: 'ai-actions-panel',
            slot: 'right',
            critical: false
        });

        // Инициализировать
        await panel.init();

        console.log('AI Actions Panel initialized successfully');

        // Теперь панель готова к использованию
        global.aiActionsPanel = panel;

    } catch (error) {
        console.error('Failed to initialize AI Actions Panel:', error);
    }
});
```

### 3. Простое использование

```javascript
// Создать сессию
const sessionId = global.aiActionsPanel.createSession('my-session', {
    title: 'My First Session',
    description: 'Testing AI Actions'
});

// Добавить действие
global.aiActionsPanel.addActionToSession(sessionId, {
    type: 'message',
    content: 'Hello World!',
    status: 'completed'
});

// Переключиться на сессию
global.aiActionsPanel.switchToSession(sessionId);
```

## Пошаговая интеграция

### Шаг 1: Подготовка проекта

#### Создание структуры файлов

```
your-project/
├── index.html
├── css/
│   └── ai-actions-panel.css
├── js/
│   ├── panel-dock.js
│   ├── web-api-client.js
│   ├── ai-actions-session-panel.js
│   └── examples/
│       └── ai-actions-integration.js
└── assets/
    └── icons/
```

#### Подключение стилей

```html
<head>
    <!-- Другие стили вашего приложения -->
    <link rel="stylesheet" href="css/ai-actions-panel.css">
</head>
```

#### Подключение скриптов

```html
<body>
    <!-- Ваш контент -->
    
    <!-- Зависимости -->
    <script src="js/panel-dock.js"></script>
    <script src="js/web-api-client.js"></script>
    
    <!-- Компоненты -->
    <script src="js/ai-actions-session-panel.js"></script>
    <script src="js/examples/ai-actions-integration.js"></script>
    
    <!-- Ваш скрипт -->
    <script src="js/app.js"></script>
</body>
```

### Шаг 2: Создание панели

#### Вариант 1: Автоматическая инициализация

```javascript
// В ai-actions-integration.js уже есть автоматическая инициализация
// Просто дождитесь загрузки
window.addEventListener('load', () => {
    if (global.aiActionsPanel) {
        console.log('Panel ready:', global.aiActionsPanel);
    }
});
```

#### Вариант 2: Ручная инициализация

```javascript
// app.js
class MyApp {
    constructor() {
        this.panel = null;
        this.init();
    }

    async init() {
        try {
            await this.createPanel();
            this.setupEventHandlers();
            this.createDefaultSession();
            console.log('MyApp initialized with AI Actions Panel');
        } catch (error) {
            console.error('Failed to initialize MyApp:', error);
        }
    }

    async createPanel() {
        // Создать DOM элемент
        const panelDOM = createAIActionsPanelDOM({
            id: 'my-app-panel',
            title: 'My App Actions',
            slot: 'right'
        });

        // Создать панель
        this.panel = new AIActionsSessionPanel(panelDOM, {
            id: 'my-app-panel',
            slot: 'right',
            critical: false
        });

        // Инициализировать
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
    }

    onSessionCreated(session) {
        // Ваша логика при создании сессии
        this.panel.addActionToSession(session.id, {
            type: 'message',
            content: `Добро пожаловать в сессию ${session.title}!`,
            status: 'completed'
        });
    }

    onActionAdded(data) {
        // Ваша логика при добавлении действия
        console.log(`Action added to ${data.sessionId}:`, data.action);
    }

    createDefaultSession() {
        const sessionId = this.panel.createSession('default-session', {
            title: 'Default Session',
            description: 'Default session for my app'
        });
        
        this.panel.switchToSession(sessionId);
    }
}

// Запустить приложение
window.addEventListener('load', () => {
    new MyApp();
});
```

### Шаг 3: Интеграция с вашим приложением

#### Интеграция с существующими событиями

```javascript
class AppIntegration {
    constructor(app, panel) {
        this.app = app;
        this.panel = panel;
        this.currentSessionId = null;
        this.setupIntegration();
    }

    setupIntegration() {
        // Интеграция с событиями вашего приложения
        this.app.on('task-started', (task) => {
            this.handleTaskStarted(task);
        });

        this.app.on('task-completed', (task) => {
            this.handleTaskCompleted(task);
        });

        this.app.on('task-error', (task, error) => {
            this.handleTaskError(task, error);
        });

        // Интеграция с панелью
        this.panel.on('session-switch', (session) => {
            this.currentSessionId = session.id;
        });
    }

    handleTaskStarted(task) {
        if (!this.currentSessionId) {
            this.currentSessionId = this.panel.createSession(`task-${task.id}`, {
                title: `Task: ${task.name}`,
                description: task.description
            });
        }

        this.panel.addActionToSession(this.currentSessionId, {
            type: 'message',
            content: `Task started: ${task.name}`,
            status: 'pending'
        });
    }

    handleTaskCompleted(task) {
        if (this.currentSessionId) {
            this.panel.addActionToSession(this.currentSessionId, {
                type: 'message',
                content: `Task completed: ${task.name}`,
                status: 'completed'
            });
        }
    }

    handleTaskError(task, error) {
        if (this.currentSessionId) {
            this.panel.addActionToSession(this.currentSessionId, {
                type: 'message',
                content: `Task error: ${task.name} - ${error.message}`,
                status: 'error'
            });
        }
    }
}
```

#### Интеграция с API

```javascript
class APIIntegration {
    constructor(panel, apiClient) {
        this.panel = panel;
        this.apiClient = apiClient;
        this.setupAPIIntegration();
    }

    setupAPIIntegration() {
        // Интеграция с WebApiClient
        this.apiClient.on('ai-action-executed', (data) => {
            this.handleAIActionExecuted(data);
        });

        this.apiClient.on('ai-action-error', (data) => {
            this.handleAIActionError(data);
        });
    }

    handleAIActionExecuted(data) {
        const sessionId = this.panel.getCurrentSession()?.id || 'api-session';
        
        if (!this.panel.getSession(sessionId)) {
            this.panel.createSession(sessionId, {
                title: 'API Session',
                description: 'Session for API actions'
            });
        }

        this.panel.addActionToSession(sessionId, {
            type: 'message',
            content: `API action executed: ${data.actionType}`,
            status: 'completed'
        });
    }

    handleAIActionError(data) {
        const sessionId = this.panel.getCurrentSession()?.id || 'api-session';
        
        this.panel.addActionToSession(sessionId, {
            type: 'message',
            content: `API action error: ${data.actionType} - ${data.error}`,
            status: 'error'
        });
    }
}
```

### Шаг 4: Настройка под ваш проект

#### Настройка стилей

```css
/* custom-styles.css */
.ai-actions-panel {
    /* Ваши кастомные стили */
    background-color: #f8f9fa;
    border-left: 1px solid #dee2e6;
}

.ai-actions-panel .session-item.active {
    background-color: #e9ecef;
}

.ai-actions-panel .action-item.message {
    border-left: 3px solid #007bff;
}

.ai-actions-panel .action-item.form {
    border-left: 3px solid #28a745;
}

.ai-actions-panel .action-item.script {
    border-left: 3px solid #ffc107;
}
```

#### Настройка конфигурации

```javascript
// config.js
const AI_ACTIONS_CONFIG = {
    panel: {
        id: 'my-app-ai-actions',
        slot: 'right',
        critical: false,
        autoSave: true,
        debug: process.env.NODE_ENV === 'development',
        theme: 'default',
        maxActions: 100,
        maxSessions: 50
    },
    session: {
        defaultTitle: 'Default Session',
        defaultDescription: 'Default session for the application',
        autoCreate: true
    },
    actions: {
        defaultStatus: 'pending',
        maxContentLength: 1000,
        autoTrim: true
    }
};

// Использование конфигурации
const panel = new AIActionsSessionPanel(panelDOM, AI_ACTIONS_CONFIG.panel);
```

## Примеры интеграции

### Интеграция с React

```javascript
import React, { useEffect, useRef } from 'react';
import './ai-actions-panel.css';

const AIActionsPanel = () => {
    const panelRef = useRef(null);
    const panelInstance = useRef(null);

    useEffect(() => {
        const initPanel = async () => {
            try {
                const panelDOM = createAIActionsPanelDOM({
                    id: 'react-ai-actions',
                    title: 'React AI Actions',
                    slot: 'right'
                });

                panelInstance.current = new AIActionsSessionPanel(panelDOM, {
                    id: 'react-ai-actions',
                    slot: 'right',
                    critical: false
                });

                await panelInstance.current.init();
                
                // Добавить в DOM
                if (panelRef.current) {
                    panelRef.current.appendChild(panelDOM);
                }

            } catch (error) {
                console.error('Failed to initialize AI Actions Panel in React:', error);
            }
        };

        initPanel();
    }, []);

    return <div ref={panelRef} className="ai-actions-panel-container" />;
};

export default AIActionsPanel;
```

### Интеграция с Vue.js

```javascript
// AiActionsPanel.vue
<template>
    <div ref="panelContainer" class="ai-actions-panel-container"></div>
</template>

<script>
export default {
    name: 'AiActionsPanel',
    mounted() {
        this.initPanel();
    },
    methods: {
        async initPanel() {
            try {
                const panelDOM = createAIActionsPanelDOM({
                    id: 'vue-ai-actions',
                    title: 'Vue AI Actions',
                    slot: 'right'
                });

                this.panel = new AIActionsSessionPanel(panelDOM, {
                    id: 'vue-ai-actions',
                    slot: 'right',
                    critical: false
                });

                await this.panel.init();
                
                this.$refs.panelContainer.appendChild(panelDOM);

            } catch (error) {
                console.error('Failed to initialize AI Actions Panel in Vue:', error);
            }
        }
    }
}
</script>

<style scoped>
.ai-actions-panel-container {
    /* Ваши стили */
}
</style>
```

### Интеграция с Angular

```typescript
// ai-actions-panel.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

@Component({
    selector: 'app-ai-actions-panel',
    template: '<div #panelContainer class="ai-actions-panel-container"></div>',
    styleUrls: ['./ai-actions-panel.component.css']
})
export class AiActionsPanelComponent implements OnInit, AfterViewInit {
    @ViewChild('panelContainer', { static: true }) panelContainer!: ElementRef;

    private panel: any;

    ngOnInit() {
        // Инициализация Angular компонента
    }

    async ngAfterViewInit() {
        await this.initPanel();
    }

    async initPanel() {
        try {
            const panelDOM = createAIActionsPanelDOM({
                id: 'angular-ai-actions',
                title: 'Angular AI Actions',
                slot: 'right'
            });

            this.panel = new AIActionsSessionPanel(panelDOM, {
                id: 'angular-ai-actions',
                slot: 'right',
                critical: false
            });

            await this.panel.init();
            
            this.panelContainer.nativeElement.appendChild(panelDOM);

        } catch (error) {
            console.error('Failed to initialize AI Actions Panel in Angular:', error);
        }
    }
}
```

## Расширенные возможности

### Кастомизация интерфейса

```javascript
class CustomAIActionsPanel extends AIActionsSessionPanel {
    constructor(container, options) {
        super(container, options);
        this.customStyles = options.customStyles || {};
        this.setupCustomUI();
    }

    setupCustomUI() {
        // Добавить кастомные элементы
        this.addCustomControls();
        this.applyCustomStyles();
    }

    addCustomControls() {
        const controls = document.createElement('div');
        controls.className = 'custom-controls';
        controls.innerHTML = `
            <button class="btn-clear-all">Clear All</button>
            <button class="btn-export">Export</button>
            <button class="btn-import">Import</button>
        `;

        this.container.appendChild(controls);

        // Обработчики событий
        controls.querySelector('.btn-clear-all').addEventListener('click', () => {
            this.clearAllSessions();
        });

        controls.querySelector('.btn-export').addEventListener('click', () => {
            this.exportAllSessions();
        });
    }

    applyCustomStyles() {
        Object.keys(this.customStyles).forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(element => {
                Object.assign(element.style, this.customStyles[selector]);
            });
        });
    }
}
```

### Интеграция с системой логирования

```javascript
class LoggingIntegration {
    constructor(panel, logger) {
        this.panel = panel;
        this.logger = logger;
        this.setupLogging();
    }

    setupLogging() {
        // Логировать все события панели
        this.panel.on('*', (eventName, data) => {
            this.logger.info(`AI Actions Panel: ${eventName}`, data);
        });

        // Логировать ошибки
        this.panel.on('error', (error) => {
            this.logger.error('AI Actions Panel Error:', error);
        });
    }

    logSessionActivity(sessionId, action, details) {
        this.logger.info(`Session ${sessionId}: ${action}`, details);
    }
}
```

### Интеграция с системой аналитики

```javascript
class AnalyticsIntegration {
    constructor(panel, analytics) {
        this.panel = panel;
        this.analytics = analytics;
        this.setupAnalytics();
    }

    setupAnalytics() {
        this.panel.on('session-created', (session) => {
            this.analytics.track('session_created', {
                session_id: session.id,
                session_title: session.title
            });
        });

        this.panel.on('action-added', (data) => {
            this.analytics.track('action_added', {
                session_id: data.sessionId,
                action_type: data.action.type,
                action_id: data.action.id
            });
        });

        this.panel.on('session-switch', (session) => {
            this.analytics.track('session_switched', {
                session_id: session.id
            });
        });
    }
}
```

## Отладка и тестирование

### Режим отладки

```javascript
// Включить отладку
const panel = new AIActionsSessionPanel(container, {
    debug: true
});

// Проверить состояние
console.log('Panel state:', panel.getState());
console.log('All sessions:', panel.getAllSessions());
console.log('Current session:', panel.getCurrentSession());
```

### Тестирование интеграции

```javascript
// test-integration.js
class IntegrationTester {
    constructor(panel) {
        this.panel = panel;
        this.tests = [];
    }

    async runAllTests() {
        console.log('🧪 Running integration tests...');
        
        await this.testPanelCreation();
        await this.testSessionManagement();
        await this.testActionManagement();
        await this.testEventHandling();
        
        this.printResults();
    }

    async testPanelCreation() {
        const success = this.panel !== null && this.panel.id === 'test-panel';
        this.addTest('Panel Creation', success);
    }

    async testSessionManagement() {
        const sessionId = this.panel.createSession('test-session');
        const sessions = this.panel.getAllSessions();
        const success = sessionId === 'test-session' && sessions.length > 0;
        this.addTest('Session Management', success);
    }

    async testActionManagement() {
        this.panel.addActionToSession('test-session', {
            type: 'message',
            content: 'Test message',
            status: 'completed'
        });
        
        const actions = this.panel.getActionsFromSession('test-session');
        const success = actions.length > 0;
        this.addTest('Action Management', success);
    }

    async testEventHandling() {
        let eventFired = false;
        
        this.panel.on('test-event', () => {
            eventFired = true;
        });
        
        this.panel.emit('test-event');
        const success = eventFired;
        this.addTest('Event Handling', success);
    }

    addTest(name, success) {
        this.tests.push({ name, success });
        console.log(`${success ? '✅' : '❌'} ${name}: ${success ? 'Passed' : 'Failed'}`);
    }

    printResults() {
        const passed = this.tests.filter(t => t.success).length;
        const total = this.tests.length;
        console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    }
}
```

## Оптимизация производительности

### Оптимизация рендеринга

```javascript
class PerformanceOptimizer {
    constructor(panel) {
        this.panel = panel;
        this.setupOptimization();
    }

    setupOptimization() {
        // Ограничение количества действий
        this.panel.on('action-added', (data) => {
            const actions = this.panel.getActionsFromSession(data.sessionId);
            if (actions.length > 50) {
                // Удалить старые действия
                const actionsToRemove = actions.slice(0, actions.length - 50);
                actionsToRemove.forEach(action => {
                    this.panel.removeActionFromSession(data.sessionId, action.id);
                });
            }
        });

        // Оптимизация рендеринга
        this.panel.on('render', () => {
            // Использовать requestAnimationFrame для рендеринга
            requestAnimationFrame(() => {
                this.panel.render();
            });
        });
    }
}
```

### Оптимизация памяти

```javascript
class MemoryOptimizer {
    constructor(panel) {
        this.panel = panel;
        this.setupMemoryManagement();
    }

    setupMemoryManagement() {
        // Регулярная очистка старых сессий
        setInterval(() => {
            this.cleanupOldSessions();
        }, 600000); // Каждые 10 минут

        // Очистка при закрытии вкладки
        window.addEventListener('beforeunload', () => {
            this.cleanupOnUnload();
        });
    }

    cleanupOldSessions() {
        const sessions = this.panel.getAllSessions();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа

        sessions.forEach(session => {
            if (now - new Date(session.updatedAt).getTime() > maxAge) {
                this.panel.removeSession(session.id);
            }
        });
    }

    cleanupOnUnload() {
        // Сохранить важные данные
        this.panel.saveToStorage();
        
        // Очистить временные данные
        this.panel.clearTempData();
    }
}
```

## Поддержка и развитие

### Обновление панели

```javascript
class PanelUpdater {
    constructor(panel) {
        this.panel = panel;
        this.checkForUpdates();
    }

    async checkForUpdates() {
        try {
            const response = await fetch('/api/ai-actions/version');
            const latestVersion = await response.json();
            
            if (this.panel.version < latestVersion.version) {
                this.updatePanel(latestVersion);
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    async updatePanel(version) {
        // Логика обновления панели
        console.log('Updating panel to version:', version.version);
        
        // Сохранить текущие данные
        const currentData = this.panel.exportAllSessions();
        
        // Загрузить новые версии файлов
        await this.loadNewVersion(version);
        
        // Восстановить данные
        this.panel.importSession(currentData);
        
        console.log('Panel updated successfully');
    }
}
```

### Мониторинг и логирование

```javascript
class PanelMonitor {
    constructor(panel) {
        this.panel = panel;
        this.setupMonitoring();
    }

    setupMonitoring() {
        // Мониторинг производительности
        this.panel.on('render', () => {
            const startTime = performance.now();
            
            // Рендеринг происходит в основном коде
            setTimeout(() => {
                const endTime = performance.now();
                const renderTime = endTime - startTime;
                
                if (renderTime > 100) { // Если рендеринг занимает больше 100ms
                    console.warn(`Slow render detected: ${renderTime}ms`);
                }
            }, 0);
        });

        // Мониторинг памяти
        setInterval(() => {
            this.checkMemoryUsage();
        }, 30000); // Каждые 30 секунд
    }

    checkMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = memory.usedJSHeapSize / 1024 / 1024;
            
            if (usedMB > 100) { // Если используется больше 100MB
                console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
            }
        }
    }
}
```

## Заключение

AI Actions Session Panel предоставляет мощный и гибкий инструмент для интеграции с вашим веб-приложением. Следуя этому руководству, вы сможете:

- Быстро интегрировать панель в ваше приложение
- Настроить панель под свои нужды
- Интегрировать с различными фреймворками
- Оптимизировать производительность
- Обеспечить надежную работу

Для дополнительной помощи и поддержки:

- **Документация**: [ссылка на документацию]
- **Примеры**: [ссылка на примеры]
- **Поддержка**: [контакты поддержки]

---

**Последнее обновление**: [дата]  
**Версия**: 1.0.0  
**Совместимость**: ES6+, современные браузеры

</final_file_content>

IMPORTANT: For any future changes to this file, use the final_file_content shown above as your reference. This content reflects the current state of the file, including any auto-formatting (e.g., if you used single quotes but the formatter converted them to double quotes). Always base your SEARCH/REPLACE operations on this final version to ensure accuracy.

 <environment_details>
# Visual Studio Code Visible Files
a2a-server/src/services/core/request-processor/neuron-request-processor.ts

# Visual Studio Code Open Tabs
tasks/server/32-simulation-actions-map-alignment.md
a2a-client/web/docs/ai-actions-session-panel.md
a2a-client/web/docs/ai-actions-integration-guide.md
a2a-server/src/services/core/request-processor/neuron-request-processor.ts
a2a-server/tests/neurons-v2/neuron-registry.test.ts
../../../Users/dev/AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/1772577514293/focus_chain_taskid_1772577514293.md
a2a-client/web/js/task-flow.js
a2a-client/web/js/web-api-client.js

# Current Time
3/4/2026, 1:18:05 AM (Europe/Kiev, UTC+2:00)

# Context Window Usage
120,020 / 256K tokens used (47%)

# Current Mode
ACT MODE
</environment_details>