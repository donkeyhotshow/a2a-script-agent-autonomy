# Single Scene VueFlow UI - План реализации

## Концепция

Всё UI на одной VueFlow сцене:
- Единый канвас (холст)
- Перетаскиваемые панели (draggable panels)
- Панель проекта по умолчанию

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VueFlow Canvas (полный экран)                    │
│                                                                         │
│    ┌──────────────┐        ┌──────────────┐        ┌──────────────┐   │
│    │   Sessions   │        │     Chat     │        │    Graph     │   │
│    │    Panel     │        │    Panel     │        │    Panel     │   │
│    │  (draggable) │        │  (draggable) │        │  (draggable) │   │
│    └──────────────┘        └──────────────┘        └──────────────┘   │
│                                                                         │
│                              ┌──────────────┐                          │
│                              │   Actions    │                          │
│                              │    Panel     │                          │
│                              │  (draggable) │                          │
│                              └──────────────┘                          │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

Header (всегда сверху): [Logo] [Project Selector ▼] [Search] [Status]
```

---

## Компоненты UI

### 1. Header (фиксированный)
- Логотип
- **Project Selector** (выпадающий список проектов)
- Поиск
- Статус подключения

### 2. Панели на Canvas (draggable)

#### Sessions Panel
```
┌─────────────────────┐
│ 📜 Sessions    [×]  │
├─────────────────────┤
│ 🔍 [Filter ▼]      │
├─────────────────────┤
│ ▶ Session #1       │
│ ▶ Session #2       │
│ ▶ Session #3       │
├─────────────────────┤
│ [+ New Session]     │
└─────────────────────┘
```
- Заголовок с кнопкой закрытия
- Фильтр (All/Active/Waiting/Completed)
- Список сессий
- Кнопка новой сессии

#### Chat Panel
```
┌─────────────────────┐
│ 💬 Chat        [×]  │
├─────────────────────┤
│                     │
│  You: message...    │
│  Server: response   │
│                     │
│  (scroll)           │
│                     │
├─────────────────────┤
│ [Type message...]   │
│          [Send]     │
└─────────────────────┘
```
- История сообщений (скролл)
- Input поле
- Кнопка Send

#### Graph Panel
```
┌─────────────────────┐
│ 🔀 Protocol Flow [×]│
├─────────────────────┤
│ [🔍] [Type▼] [▼]   │
├─────────────────────┤
│                     │
│   VueFlow Graph     │
│   (embedded)        │
│                     │
├─────────────────────┤
│ [+] [-] [Fit] [🎲] │
└─────────────────────┘
```
- Поиск по графу
- Фильтры
- VueFlow внутри панели
- Controls

#### Actions Panel
```
┌─────────────────────┐
│ ⚡ Actions     [×]  │
├─────────────────────┤
│ Current: Action #1 │
│ Status: Running     │
├─────────────────────┤
│ ☐ Step 1           │
│ ▶ Step 2 (active)  │
│ ☐ Step 3           │
├─────────────────────┤
│ Logs:               │
│ > Starting...       │
│ > Processing...     │
├─────────────────────┤
│ [✓ Approve] [Run]   │
└─────────────────────┘
```
- Текущее действие
- Прогресс шагов
- Логи
- Кнопки действий

#### Project Panel (дефолтная)
```
┌─────────────────────┐
│ 📁 Project    [×]  │
├─────────────────────┤
│ Name: My Project    │
│ Path: C:\project    │
│                      │
│ Entities: 42        │
│ Sessions: 3         │
│ Last Active: 2m ago │
└─────────────────────┘
```
- Показывается когда проект выбран
- Основная информация о проекте

---

## Техническая реализация

### 1. VueFlow Custom Nodes

Каждая панель = Custom Node в VueFlow:
```
javascript
{
  id: 'sessions-panel',
  type: 'panel',
  position: { x: 50, y: 100 },
  data: {
    panelType: 'sessions',
    title: 'Sessions',
    icon: '📜',
    ...
  }
}
```

### 2. Drag & Drop

Использовать @vue-flow/draggable или свой CSS:
```
css
.panel-node {
  position: absolute;
  cursor: move;
}
.panel-node:active {
  cursor: grabbing;
}
```

### 3. Panel Component

```
vue
<template>
  <div class="vue-flow__node-panel">
    <div class="panel-header" @mousedown="startDrag">
      <span>{{ title }}</span>
      <button @click="$emit('close')">×</button>
    </div>
    <div class="panel-content">
      <slot></slot>
    </div>
  </div>
</template>
```

### 4. Ресайз панелей

Добавить resize handle в углу панелей.

---

## Файлы для изменения

### Новые файлы:
1. `a2a-client/web/js/flow/panels/sessions-panel.js` - панель сессий
2. `a2a-client/web/js/flow/panels/chat-panel.js` - панель чата
3. `a2a-client/web/js/flow/panels/graph-panel.js` - панель графа
4. `a2a-client/web/js/flow/panels/actions-panel.js` - панель действий
5. `a2a-client/web/js/flow/panels/project-panel.js` - панель проекта
6. `a2a-client/web/js/flow/panels/panel-manager.js` - управление панелями

### Изменения:
1. `a2a-client/web/index.html` - упростить layout
2. `a2a-client/web/css/style.css` - стили панелей
3. `a2a-client/web/js/flow/nodes.js` - добавить panel node тип

---

## Порядок реализации

### Этап 1: Базовая структура
- [ ] Создать panel node тип в VueFlow
- [ ] Обновить index.html - убрать старый layout
- [ ] Добавить базовые стили для панелей

### Этап 2: Панель проекта (дефолтная)
- [ ] Создать project-panel.js
- [ ] Интегрировать с Project Selector
- [ ] Показать данные выбранного проекта

### Этап 3: Панель сессий
- [ ] Создать sessions-panel.js
- [ ] Перенести функциональность из sessions.js
- [ ] Сделать draggable

### Этап 4: Панель чата
- [ ] Создать chat-panel.js
- [ ] Перенести чат функциональность
- [ ] Сделать draggable

### Этап 5: Панель графа
- [ ] Создать graph-panel.js
- [ ] Интегрировать VueFlow
- [ ] Добавить controls

### Этап 6: Панель действий
- [ ] Создать actions-panel.js
- [ ] Перенести Action Progress
- [ ] Добавить логи

### Этап 7: Drag & Drop + Ресайз
- [ ] Реализовать перетаскивание панелей
- [ ] Добавить ресайз
- [ ] Сохранять позиции в localStorage

---

## Утвержденные требования

1. ✅ **Фиксированный канвас** с горизонтальным скроллом вправо
2. ✅ **Только Project Panel** показывается по умолчанию
3. ✅ **Данные хранятся в файлах проекта** (на сервере), не в localStorage
4. ✅ **Пользователь добавляет новые панели и связывает их**

---

## Концепция (обновлено)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header: [Logo] [Project Selector ▼]              [Search] [Status]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ╔═══════════════════╗                                                    │
│   ║   Project Panel   ║                                                    │
│   ║   (дефолтная)     ║                                                    │
│   ║                   ║                                                    │
│   ║   Name: ...       ║                                                    │
│   ║   Path: ...       ║                                                    │
│   ║   [+ Add Panel]   ║                                                    │
│   ╚═══════════════════╝                                                    │
│                                                                             │
│   ╔═══════════════════╗     ╔═══════════════════╗                          │
│   ║   Sessions Panel  ║────▶│    Chat Panel    ║                          │
│   ║   (добавляется)   ║     │   (добавляется)  ║                          │
│   ╚═══════════════════╝     ╚═══════════════════╝                          │
│                                                                             │
│   ╔═══════════════════╗     ╔═══════════════════╗                          │
│   ║   Graph Panel     ║◀────│   Actions Panel  ║                          │
│   ║   (добавляется)   ║     │   (добавляется)  ║                          │
│   ╚═══════════════════╝     ╚═══════════════════╝                          │
│                                                                             │
│ ← horizontal scroll →                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Техническая реализация

### Canvas настройки (фиксированный + горизонтальный скролл)
```
javascript
const vueflowOptions = {
  // Фиксированный канвас
  width: 3000,  // или больше
  height: 800,
  
  // Горизонтальный скролл
  panOnScroll: true,
  panOnScrollSpeed: 0.5,
  scrollZoom: true,
  zoomOnScroll: true,
  
  minZoom: 0.3,
  maxZoom: 2,
  
  // Отключаем fitView чтобы был фиксированный размер
  fitView: false,
};
```

### Panel Node тип (каждая панель = VueFlow узел)
```
javascript
import { Handle, Position } from '@vue-flow/core';

const PanelNode = {
  props: ['data', 'id'],
  template: `
    <div class="panel-node" :class="data.panelType">
      <Handle type="target" :position="Position.Left" />
      <div class="panel-header" @mousedown="startDrag">
        <span>{{ data.icon }} {{ data.title }}</span>
        <button @click="$emit('close', id)">−</button>
      </div>
      <div class="panel-content">
        <slot></slot>
      </div>
      <Handle type="source" :position="Position.Right" />
    </div>
  `
};
```

### Структура данных панелей (сохраняется в файлах проекта)
```
javascript
// В проекте: .a2a/panels.json
{
  "panels": [
    {
      "id": "project-panel",
      "type": "project",
      "position": { "x": 50, "y": 100 },
      "size": { "width": 320, "height": 280 }
    },
    {
      "id": "sessions-panel", 
      "type": "sessions",
      "position": { "x": 450, "y": 100 },
      "size": { "width": 300, "height": 350 }
    }
  ],
  "connections": [
    { "from": "sessions-panel", "to": "chat-panel" }
  ]
}
```

---

## Файлы для реализации

### Новые файлы:

1. **`a2a-client/web/js/flow/panel-node.js`** - VueFlow custom node тип для панелей
2. **`a2a-client/web/js/flow/panels/project-panel.js`** - Панель проекта (дефолтная)
3. **`a2a-client/web/js/flow/panels/sessions-panel.js`** - Панель сессий
4. **`a2a-client/web/js/flow/panels/chat-panel.js`** - Панель чата
5. **`a2a-client/web/js/flow/panels/graph-panel.js`** - Панель графа
6. **`a2a-client/web/js/flow/panels/actions-panel.js`** - Панель действий
7. **`a2a-client/web/js/flow/panels/panel-manager.js`** - Управление панелями

### Изменения:

1. **`a2a-client/web/index.html`** - Новый layout (только header + canvas)
2. **`a2a-client/web/css/style.css`** - Стили панелей
3. **`a2a-client/web/js/flow/nodes.js`** - Добавить panel node

---

## Порядок реализации

### Этап 1: Базовая структура (header + canvas)
- [x] Создать план
- [ ] Обновить index.html - новый layout (только header + vueflow контейнер)
- [ ] Настроить VueFlow с фиксированным размером и горизонтальным скроллом
- [ ] Добавить базовые стили для панелей

### Этап 2: Project Panel (дефолтная)
- [ ] Создать panel-node.js - базовый компонент панели
- [ ] Создать project-panel.js - панель проекта
- [ ] Интегрировать с Project Selector
- [ ] Показать данные выбранного проекта

### Этап 3: Panel Manager
- [ ] Создать panel-manager.js
- [ ] Функции: addPanel, removePanel, connectPanels
- [ ] Сохранение/загрузка в файлы проекта (.a2a/panels.json)

### Этап 4: Остальные панели
- [ ] Sessions Panel - добавляется кнопкой
- [ ] Chat Panel - добавляется кнопкой
- [ ] Graph Panel - добавляется кнопкой
- [ ] Actions Panel - добавляется кнопкой

### Этап 5: Drag & Drop + Connections
- [ ] Перетаскивание панелей (используем VueFlow позиционирование)
- [ ] Соединение панелей edge-ами
- [ ] Ресайз панелей

---

## Следующий шаг

