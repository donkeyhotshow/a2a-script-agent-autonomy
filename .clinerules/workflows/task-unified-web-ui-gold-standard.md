# Task: Создание детальной унифицированной документации "Gold Standard" для A2A Client Web UI

## Цель

Создать единую, детальную документацию, описывающую "золотой стандарт" (gold standard) веб-интерфейса A2A Client. Документация должна объединить A2A Server , выявить лучшие практики и сформировать окончательную спецификацию для реализации.

## Входные данные

### Существующие варианты UI

1. **index.html** - Основной вариант 

### Существующие компоненты

- **CSS**:
  - `css/plasticine-ui.css` - Основные стили
  - `css/json-ui.css` - JSON UI
  - `css/style.css` - Базовые стили
  - `css/base/` - Сброс, типографика, переменные
  - `css/components/` - Панели, хедер, футер
  - `css/layouts/` - Основные layout
  - `css/utils/` - Миксины, утилиты

- **JavaScript**:
  - `js/plasticine-ui.js` - UI компоненты
  - `js/plasticine-workflow.js` - Workflow логика
  - `js/web-api-client.js` - API клиент
  - `js/sse-client.js` - SSE клиент
  - `js/sessions.js` - Управление сессиями
  - `js/components/` - Floating Panel, Panel Cube, Panel Dock
  - `js/flow/` - VueFlow интеграция (nodes, panel-node, protocol, search)
  - `js/json/` - JSON адаптер и UI

- **Шаблоны**:
  - `templates/header.html`
  - `templates/footer.html`
  - `templates/floating-panel.html`
  - `templates/panel-cube.html`
  - `templates/panel-dock.html`
  - `templates/mini-zones.html`

## Чеклист задач

### Этап 1: Анализ существующих вариантов

- [ ] Изучить все HTML
- [ ] Сравнить структуру HTML 
- [ ] Выявить общие паттерны и различия
- [ ] Определить лучшие практики из каждого варианта
- [ ] Документировать уникальные фичи каждого варианта

### Этап 2: Анализ CSS и JavaScript

- [ ] Проанализировать все CSS файлы
- [ ] Выявить дублирование стилей
- [ ] Определить константы и CSS переменные
- [ ] Проанализировать JavaScript модули
- [ ] Выявить архитектурные паттерны
- [ ] Определить точки расширения

### Этап 3: Анализ компонентов

- [ ] Документировать Floating Panel систему
- [ ] Документировать Panel Cube компонент
- [ ] Документировать Panel Dock компонент
- [ ] Документировать Mini Zones
- [ ] Документировать VueFlow интеграцию
- [ ] Документировать SSE/API клиенты

### Этап 4: Создание Gold Standard спецификации

- [ ] Определить финальную структуру HTML
- [ ] Определить финальную архитектуру CSS (слои, модули)
- [ ] Определить финальную архитектуру JavaScript
- [ ] Документировать API компонентов
- [ ] Создать диаграммы архитектуры
- [ ] Определить гайдлайны стилизации

### Этап 5: Выходная документация

- [ ] Создать единый документ спецификации
- [ ] Включить примеры кода для каждого компонента
- [ ] Добавить чеклисты для реализации
- [ ] Определить критерии качества
- [ ] Добавить рекомендации по миграции

## Структура выходного документа

### 1. Обзор (Overview)

- Цель и назначение документа
- Текущее состояние проекта
- Целевая аудитория

### 2. Архитектура (Architecture)

- Высокоуровневая диаграмма компонентов
- Слои приложения (UI, Business Logic, Data)
- Паттерны проектирования

### 3. Компоненты UI (UI Components)

#### 3.1 Layout System
- Основной контейнер
- Header
- Main Area (Canvas + Panels)
- Footer

#### 3.2 Floating Panel System
- Состояния (expanded, minimized, docked)
- Drag & Drop
- Resize
- Z-index management

#### 3.3 VueFlow Integration
- Настройка Canvas
- Custom Nodes
- Edges
- Controls
- Background

#### 3.4 Task Workflow Panel
- Состояния (idle, task form, proposed, executing, result)
- Формы ввода
- Отображение прогресса

#### 3.5 Дополнительные компоненты
- Panel Cube (minimized state)
- Mini Zones (dock targets)
- Debug Panel

### 4. CSS Архитектура

#### 4.1 Организация
- Базовые стили (reset, variables, typography)
- Компоненты
- Утилиты
- Layouts

#### 4.2 CSS Variables
- Цветовая схема
- Отступы и размеры
- Анимации
- Темизация

#### 4.3 Best Practices
- Mobile-first
- Accessibility
- Performance

### 5. JavaScript Архитектура

#### 5.1 Модули
- plasticine-ui.js (основной)
- plasticine-workflow.js
- web-api-client.js
- sse-client.js

#### 5.2 API компонентов
- FloatingPanel class
- PanelCube class
- PanelDock class

#### 5.3 State Management
- Panel state
- Task state
- Session state

### 6. API Интеграция

#### 6.1 Server Communication
- REST endpoints
- SSE для real-time
- Polling fallback

#### 6.2 Task Flow
- Task request
- Proposed actions
- Approval
- Execution
- Completion

### 7. Accessibility

- ARIA атрибуты
- Keyboard navigation
- Screen reader support

### 8. Примеры кода

#### 8.1 Создание панели
```javascript
const panel = new FloatingPanel({
  id: 'my-panel',
  title: 'My Panel',
  content: '<div>Content</div>'
});
```

#### 8.2 VueFlow интеграция
```javascript
import { VueFlow } from '@vue-flow/core';
// Настройка кастомных узлов
```

#### 8.3 API вызовы
```javascript
const result = await apiClient.createTask(input);
```

### 9. Чеклист реализации

- [ ] Базовый HTML skeleton
- [ ] CSS архитектура
- [ ] Header компонент
- [ ] VueFlow canvas
- [ ] Floating Panel система
- [ ] Task workflow states
- [ ] API клиент
- [ ] SSE клиент
- [ ] Accessibility
- [ ] Тестирование

### 10. Критерии качества

- Lighthouse score > 90
- Accessibility score > 95
- Cross-browser compatibility
- Mobile responsive
- Performance < 3s load

## Doc Panels (Gold Standard)

### Назначение
Один ввод текста в header → открытие одного из корневых документов. Каждая панель соответствует одному документу. Документ не открывается повторно — если уже открыт, панель фокусируется.

### Документы (панели)
Каждая панель = ссылка на документ в корне репо:

| Doc key    | File        |
|------------|-------------|
| ACTIONS    | ACTIONS.md  |
| ENTITY_TYPES | ENTITY_TYPES.md |
| FEATURES   | FEATURES.md |
| NODES      | NODES.md    |
| PACKAGES   | PACKAGES.md |
| README     | README.md   |
| SCRIPTS    | SCRIPTS.md  |
| SERVICES   | SERVICES.md |
| SOLUTIONS  | SOLUTIONS.md |
| SYSTEMS    | SYSTEMS.md  |
| TASKS      | TASKS.md    |
| TERMINATORS | TERMINATORS.md |
| TODO       | TODO.md     |

### Реализация
- **Модуль:** `a2a-client/web/js/doc-panels.js` — `DOC_LIST`, `normalizeDocKey()`, `openDocPanel(docKey, container)`.
- **ID панели:** `doc-{docKey}` (например `doc-ACTIONS`). По нему проверяется «уже открыт».
- **Контент:** fetch `/api/a2a/projects/default/files/{path}` (vite-plugin-a2a). Project `default` = workspace root (cwd при запуске dev).
- **Header:** форма `#docOpenForm`, input `#docOpenInput`, placeholder «ACTIONS, TODO, README…», datalist из ключей. Submit → открыть doc или фокус существующей панели.
- **Контейнер панелей:** `#panels-container`. Панели — обычные `.pui-panel` с заголовком, контентом (pre с текстом), кнопками minimize/close.

### Пути отхода / мелочи
- **Нет проекта default / 404:** показывать в панели текст ошибки (уже есть в doc-panels.js).
- **Запуск не из корня репо:** настроить `.a2a-client/projects.json` — project `default` с `path` = абсолютный путь к корню репо.
- **Добавить новый doc:** добавить запись в `DOC_LIST` в `doc-panels.js` и при необходимости в datalist (уже заполняется из `getDocKeys()`).
- **Рендер Markdown:** сейчас отображается raw text в `<pre>`. Для рендера MD — подключить marked/remark и вставлять HTML в `.pui-doc-content` (санобработка обязательна).
- **Несколько проектов:** передавать `options.projectId` в `openDocPanel()`; список проектов — из `/api/a2a/projects`.
- **Клавиатура:** Enter в input = submit формы; Escape — очистить input или закрыть панель (при желании доработать).
- **A11y:** форма с `role="search"`, input с `aria-label`, кнопка «Open» с понятным label.
- **Минимизация:** кнопка minimize сворачивает панель в заголовок (высота 40px, контент скрыт); повторный клик разворачивает.

## Результат

Создать файл `docs/web-ui-gold-standard.md` с полной спецификацией "Gold Standard" веб-интерфейса A2A Client, которая будет использоваться как справочник для всех будущих разработок и улучшений UI.
