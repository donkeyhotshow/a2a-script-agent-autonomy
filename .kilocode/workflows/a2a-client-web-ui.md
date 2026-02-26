# Workflow: Разработка и улучшение Web UI для A2A Client

## Выбор библиотеки для быстрой веб-развертки

### Глубокий анализ

После анализа существующего [`variant4.html`](a2a-client/web/variant4.html:1) и требований к функциональности:

**Требования:**
- Быстрая развертка (rapid development)
- Каждая "долька" (компонент) должна работать стабильно
- Граф рабочего процесса (VueFlow)
- Множественные панели (Actions, Chat, Graph, Project, Sessions)
- SSE для real-time
- JSON-редактор
- Drag-and-drop

### Выбор: Vue 3 + Vite + Pinia

**Обоснование:**
| Критерий | Vue 3 + Vite | React + Next.js | Alpine.js | Svelte |
|----------|--------------|-----------------|-----------|--------|
| VueFlow интеграция | ✅ Нативная | ❌ требует адаптеров | ❌ | ❌ |
| Скорость разработки | ✅ Высокая | ✅ Высокая | ✅ Очень высокая | ✅ Высокая |
| State management | Pinia (родная) | Redux/Zustand | Не требуется | Не требуется |
| Стабильность | ✅ Отличная | ✅ Хорошая | ⚠️ Ограниченная | ⚠️ Менее популярна |
| Vite HMR | ✅ Мгновенный | ✅ Мгновенный | ✅ | ✅ |

**Итог:** Vue 3 + Vite - оптимальный выбор, так как:
1. VueFlow - это Vue библиотека (нативная поддержка)
2. Vite обеспечивает мгновенную пересборку
3. Pinia - официальное state решение для Vue 3
4. Лучшая стабильность для сложных UI

---

## State Файл (UI State Architecture)

### Глобальное состояние

```typescript
// a2a-client/web/src/stores/ui-state.ts
interface UIState {
  // Текущая активная панель
  activePanel: 'chat' | 'actions' | 'graph' | 'project' | 'sessions';
  
  // Состояние графа
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedNodeId: string | null;
    viewport: { x: number; y: number; zoom: number };
  };
  
  // Сессии
  sessions: {
    currentSessionId: string | null;
    list: Session[];
    history: Message[];
  };
  
  // SSE соединение
  connection: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastEventId: string | null;
  };
  
  // UI состояние панелей
  panels: {
    chat: { isOpen: boolean; width: number };
    actions: { isOpen: boolean; width: number };
    graph: { isOpen: boolean };
    project: { isOpen: boolean };
    sessions: { isOpen: boolean; width: number };
  };
}
```

### Store структура

```
a2a-client/web/src/
├── stores/
│   ├── ui-state.ts      # Глобальное UI состояние (Pinia)
│   ├── graph-store.ts   # Состояние графа
│   ├── session-store.ts # Управление сессиями
│   └── connection-store.ts # SSE соединение
├── components/
│   ├── panels/
│   │   ├── ChatPanel.vue
│   │   ├── ActionsPanel.vue
│   │   ├── GraphPanel.vue
│   │   ├── ProjectPanel.vue
│   │   └── SessionsPanel.vue
│   ├── graph/
│   │   ├── WorkflowGraph.vue
│   │   ├── ActionNode.vue
│   │   └── StateNode.vue
│   └── common/
│       ├── JsonEditor.vue
│       └── DragDrop.vue
└── composables/
    ├── useSSE.ts        # SSE клиент
    ├── useGraph.ts      # Граф операции
    └── useDragDrop.ts   # Drag and drop
```

---

## Компоненты UI

### 1. Граф рабочего процесса (Workflow Graph)

- **Библиотека:** VueFlow 1.48+
- **Узлы:** ActionNode, StateNode, EventNode
- **Функции:** drag, zoom, pan, select, connect
- **Сохранение:** JSON в localStorage

### 2. Панели управления

| Панель | Функционал | Компонент |
|--------|-----------|-----------|
| Actions Panel | Список действий, выполнение | `ActionsPanel.vue` |
| Chat Panel | Чат с агентом | `ChatPanel.vue` |
| Graph Panel | Визуализация графа | `GraphPanel.vue` |
| Project Panel | Файловая навигация | `ProjectPanel.vue` |
| Sessions Panel | История сессий | `SessionsPanel.vue` |

### 3. Функциональные возможности

- **SSE Client:** `@vue-flow/core` + custom EventSource
- **JSON Editor:** Monaco Editor или CodeMirror 6
- **Drag-and-drop:** HTML5 Drag API + Vue directives
- **Адаптивность:** CSS Grid + Flexbox + Media Queries

---

## Чеклист задач

### Phase 1: Базовая инфраструктура
- [ ] Настроить Vite проект с Vue 3
- [ ] Установить зависимости (Pinia, VueFlow, etc)
- [ ] Создать базовую структуру компонентов

### Phase 2: State Management
- [ ] Реализовать Pinia stores
- [ ] Настроить persistence (localStorage)
- [ ] Создать SSE connection store

### Phase 3: Панели
- [ ] Chat Panel с историей сообщений
- [ ] Actions Panel со списком команд
- [ ] Sessions Panel с историей сессий

### Phase 4: Граф
- [ ] Интегрировать VueFlow
- [ ] Создать кастомные узлы
- [ ] Реализовать drag-and-drop узлов

### Phase 5: Дополнительно
- [ ] JSON Editor с валидацией
- [ ] Real-time обновления через SSE
- [ ] Адаптивный дизайн

---

## Технические требования

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "@vue-flow/core": "^1.48.0",
    "@vue-flow/background": "^1.3.0",
    "@vue-flow/controls": "^1.1.0",
    "@codemirror/view": "^6.0.0",
    "@codemirror/lang-json": "^6.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Конфигурация Vite

```javascript
// a2a-client/vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/sse': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
});
```

---

## Примеры использования

### Добавление узла в граф

```typescript
// stores/graph-store.ts
import { defineStore } from 'pinia';

export const useGraphStore = defineStore('graph', {
  actions: {
    addNode(node: GraphNode) {
      this.nodes.push(node);
      this.saveToStorage();
    },
    removeNode(nodeId: string) {
      this.nodes = this.nodes.filter(n => n.id !== nodeId);
      this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
      this.saveToStorage();
    }
  }
});
```

### Отправка сообщения через Chat

```typescript
// composables/useSSE.ts
export function useSSE() {
  const sendMessage = async (text: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId: currentSessionId.value })
    });
    return response.json();
  };

  const subscribeToEvents = (sessionId: string) => {
    const eventSource = new EventSource(`/sse/${sessionId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      messages.value.push(data);
    };
    return eventSource;
  };

  return { sendMessage, subscribeToEvents };
}
```

---

## Файлы проекта

```
a2a-client/
├── web/
│   ├── index.html          # Точка входа
│   ├── src/
│   │   ├── main.ts         # Vue app initialization
│   │   ├── App.vue         # Root component
│   │   ├── stores/         # Pinia stores
│   │   ├── components/     # Vue components
│   │   └── composables/    # Vue composables
│   ├── vite.config.js
│   └── package.json
```

---

## Метрики стабильности

| Компонент | Статус | Примечания |
|-----------|--------|-----------|
| Vue 3 + Vite | ✅ Стабильно | Официальный релиз |
| Pinia | ✅ Стабильно | Рекомендованное решение |
| VueFlow | ✅ Стабильно | Активная разработка |
| CodeMirror 6 | ✅ Стабильно | Популярный редактор |
| SSE | ✅ Стабильно | Нативный browser API |
