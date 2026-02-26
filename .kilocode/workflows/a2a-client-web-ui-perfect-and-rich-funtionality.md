# Workflow: Разработка и улучшение Web UI для A2A Client

## Архитектура: SPA без развертки

Это **Single Page Application** с использованием:
- **Vue 3** через importmap (ES Modules)
- **VueFlow** для графа рабочего процесса
- **Vanilla JS** для остальной логики
- **Роутинг только для API** (fetch/sse)

### Референсные файлы

| Файл | Назначение |
|------|------------|
| [`a2a-client/web/index.html`](a2a-client/web/index.html:1) | Главная страница (SPA shell) |
| [`plans/plasticine-ui-todos.md`](plans/plasticine-ui-todos.md:1) | Чеклист задач UI |
| [`a2a-client/web/js/plasticine-ui.js`](a2a-client/web/js/plasticine-ui.js:1) | Логика панелей и куба |
| [`a2a-client/web/css/plasticine-ui.css`](a2a-client/web/css/plasticine-ui.css:1) | Стили панелей |

---

## State Файл

### Глобальное состояние (в plasticine-ui.js)

```javascript
// a2a-client/web/js/plasticine-ui.js

const UI_STATE = {
  // Активные панели
  panels: {
    chat: { isOpen: true, isMinimized: false, position: { x: 0, y: 0 } },
    actions: { isOpen: true, isMinimized: false, position: { x: 0, y: 0 } },
    graph: { isOpen: true, isMinimized: false, position: { x: 0, y: 0 } },
    project: { isOpen: true, isMinimized: false, position: { x: 0, y: 0 } },
    sessions: { isOpen: true, isMinimized: false, position: { x: 0, y: 0 } }
  },
  
  // Кубы (закрытые панели)
  cubes: [],
  
  // Свёрнутые в футер панели
  minimizedPanels: [],
  
  // Текущая сессия
  currentSession: null,
  
  // SSE соединение
  sseStatus: 'disconnected'
};
```

---

## Компоненты UI (через Todo из plasticine-ui-todos.md)

### 1. Система панелей (Куб vs Свёртка)

#### 1.1 Кнопка Close (×) → Создание куба
- [ ] При нажатии × панель **не закрывается** полностью
- [ ] Под курсором создаётся **кубик** (маленький квадрат)
- [ ] **Drag куба** - левая кнопка мыши
- [ ] **Правый клик** по кубу - смена цвета куба
- [ ] **Клик по кубу** (левый) - открыть панель; куб пропадает
- [ ] Пока куб есть - панель в состоянии "закрыта через куб"

#### 1.2 Кнопка Minimize (−) → Свёртка в футер
- [ ] Панель **не превращается в куб**
- [ ] Панель **уезжает в футер** (нижняя зона)
- [ ] В футере панель - **узкая полоса**: без шапки, только заголовок
- [ ] Размеры блоков меняются (компактный режим)
- [ ] Шапка панели убирается, остаётся только заголовок

#### Файлы
- [`a2a-client/web/js/plasticine-ui.js`](a2a-client/web/js/plasticine-ui.js:1) - логика куба при Close, логика свёртки в футер при Minimize
- [`a2a-client/web/css/plasticine-ui.css`](a2a-client/web/css/plasticine-ui.css:1) - стили куба, стили панели в футере

---

### 2. Шапка приложения

#### 2.1 Горизонтальная форма «Новая панель»
- [x] Поле ввода: заголовок новой панели
- [x] Кнопка «Добавить» - создаёт панель с введённым заголовком
- [ ] Опционально: выбор типа панели (task / logs / chat / …)

#### Файлы
- [`a2a-client/web/variant4.html`](a2a-client/web/variant4.html:1) - разметка и обработчик

---

### 3. Workflow и типы панелей

- [ ] При добавлении из шапки - использовать тип «custom» или выбор из списка типов
- [ ] Workflow: возможность сохранять/загружать набор панелей
- [ ] Placeholder-контент для каждого типа (логи, чат, дебаг, сессии)

---

### 4. Прочее по проекту

- [ ] Драг куба только левой кнопкой; правый клик - контекстное меню
- [ ] Футер: одна строка с несколькими свёрнутыми панелями
- [ ] Зоны сброса (docked-left/right/bottom) при драге панели
- [ ] A11y: фокус, клавиатура
- [ ] Мобильный вид: форма в шапке сворачивается в иконку «+»

---

## Граф рабочего процесса (VueFlow)

### Реализация в index.html

```javascript
// a2a-client/web/index.html (строки 396-500)
import { createApp, ref, onMounted, h } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';

// Глобальные методы для работы с графом
window.setFlowNodes = (newNodes) => { ... };
window.setFlowEdges = (newEdges) => { ... };
window.getFlowNodes = () => { ... };
window.getFlowEdges = () => { ... };
window.clearFlowView = () => { ... };
window.flowFitView = () => { ... };
window.loadDemoData = () => { ... };
```

### Типы узлов графа

| Тип | Цвет | Описание |
|-----|------|----------|
| agents | #a855f7 | 🤖 AI Agents |
| nodes | #3b82f6 | 🔵 Nodes |
| actions | #f97316 | ⚡ Actions |
| services | #06b6d4 | 🔧 Services |
| tasks | #84cc16 | 📋 Tasks |
| terminators | #ef4444 | 🛑 Terminators |
| packages | #6366f1 | 📦 Packages |
| features | #ec4899 | ✨ Features |
| systems | #14b8a6 | ⚙️ Systems |
| scripts | #f59e0b | 📜 Scripts |
| solutions | #10b981 | 💡 Solutions |

---

## Панели управления

### Chat Panel
- Список сообщений с агентом
- Input для отправки сообщений
- SSE для получения ответов

### Sessions Panel  
- Список сессий
- Фильтры (active/waiting/completed)
- История сессий

### Actions Panel
- Список доступных действий
- Кнопки Run/Approve/Reject

### Project Panel
- Файловая навигация
- Добавление проектов

### Graph Panel
- VueFlow контейнер
- Управление (zoom, fit, demo)

---

## SSE (Server-Sent Events)

```javascript
// a2a-client/web/js/sse-client.js
class SSEClient {
  constructor(sessionId) {
    this.eventSource = new EventSource(`/sse/${sessionId}`);
  }
  
  onMessage(callback) {
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
  }
  
  onError(callback) {
    this.eventSource.onerror = callback;
  }
}
```

---

## Технические требования

### Import Map (из index.html)

```html
<script type="importmap">
{
  "imports": {
    "vue": "https://esm.sh/vue@3.4.0/vue.esm-browser.js",
    "@vue-flow/core": "https://esm.sh/@vue-flow/core@1.48.2",
    "@vue-flow/background": "https://esm.sh/@vue-flow/background@1.3.2",
    "@vue-flow/controls": "https://esm.sh/@vue-flow/controls@1.1.3",
    "@vue-flow/minimap": "https://esm.sh/@vue-flow/minimap@1.5.4"
  }
}
```

### CSS Переменные

```css
:root {
  --panel-bg: #1a1a2e;
  --panel-border: #30363d;
  --task-accent: #6366f1;
  --task-success: #22c55e;
  --task-warning: #f97316;
  --task-info: #3b82f6;
}
```

---

## Приоритет реализации

**Приоритет: Сначала кубы и панели (plasticine-ui)**

---

## Чеклист задач

### Phase 1: Панели и кубы (plasticine-ui) - ПРИОРИТЕТ ✅ ЗАВЕРШЕНО

#### 1.1 Кнопка Close (×) - создание куба ✅
- [x] При нажатии × панель **не закрывается** полностью
- [x] **Под курсором** создаётся **кубик** (маленький квадрат)
- [x] **Drag куба** - левая кнопка мыши (ПРИОРИТЕТ ✅)
- [x] **Правый клик** по кубу - смена цвета куба
- [x] **Клик по кубу** (левый) - открыть панель обратно; куб пропадает
- [x] Пока куб есть - панель в состоянии "закрыта через куб"

#### 1.2 Кнопка Minimize (−) - свёртка в футер ✅
- [x] Панель **не превращается в куб**
- [x] Панель **уезжает в футер** (нижняя зона)
- [x] В футере панель - **узкая полоса**: без шапки, только заголовок
- [x] Размеры блоков меняются (компактный режим)
- [x] Шапка панели убирается, остаётся только заголовок

### Phase 2: Инфраструктура
- [x] Создать базовую структуру SPA в index.html
- [x] Настроить importmap для Vue и VueFlow
- [x] Интегрировать VueFlow контейнер

### Phase 3: Шапка
- [x] Форма "Новая панель" 
- [ ] Выбор типа панели
- [ ] Сохранение/загрузка workflow

### Phase 5: VueFlow Граф ✅ ЗАВЕРШЕНО
- [x] Интегрировать VueFlow контейнер
- [x] Настроить типы узлов (agents, nodes, actions, etc.)
- [x] Добавить управление (zoom, fit, pan)
- [x] Интегрировать с демо-данными

### Phase 6: Edge Cases ✅ ЗАВЕРШЕНО
- [x] Множественные кубы - позиционирование без перекрытия
- [x] Drag за пределы экрана - ограничение границами
- [x] Перекрытие кубов - z-index при drag
- [x] Потеря фокуса
- [x] Resize панели - ограничения (min 180x120)
- [x] Docked зоны - несколько панелей
- [x] Состояния ошибок (SSE disconnect, API error)

---

## Связанные файлы

| Что | Файл |
|-----|------|
| Главная страница | [`a2a-client/web/index.html`](a2a-client/web/index.html:1) |
| Вариант 4 (дополнительно) | [`a2a-client/web/variant4.html`](a2a-client/web/variant4.html:1) |
| Панели, кубы, зоны | [`a2a-client/web/js/plasticine-ui.js`](a2a-client/web/js/plasticine-ui.js:1) |
| Стили | [`a2a-client/web/css/plasticine-ui.css`](a2a-client/web/css/plasticine-ui.css:1) |
| SSE клиент | [`a2a-client/web/js/sse-client.js`](a2a-client/web/js/sse-client.js:1) |
| Workflow логика | [`a2a-client/web/js/plasticine-workflow.js`](a2a-client/web/js/plasticine-workflow.js:1) |
| Чеклист задач | [`plans/plasticine-ui-todos.md`](plans/plasticine-ui-todos.md:1) |
