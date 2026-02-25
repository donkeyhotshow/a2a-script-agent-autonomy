# План: Добавление таблички сессии на VueFlow после подтверждения действия

## Задача
После подтверждения действия (action_proposal → пользователь нажал "Run/Подтвердить") нужно:
1. Добавить табличку сессии на VueFlow сцену
2. Запоминать добавленные таблички в localStorage
3. Восстанавливать таблички при загрузке

---

## Анализ текущего состояния

### Существующий процесс
1. Пользователь отправляет задачу → `send()`
2. Сервер возвращает `action_proposal` с предложением действия
3. В `action-progress` показываются кнопки "Run" и "Cancel"
4. При нажатии "Run" → `runAction()` → выполняется действие

### Проблемы
- Нет кнопки "Approve" для подтверждения action_proposal
- Узлы сессий не добавляются на VueFlow сцену при подтверждении
- Нет сохранения состояния в localStorage

---

## План реализации

### Шаг 1: Добавить кнопку Approve в UI
В `index.html` добавить кнопку Approve в панель action-progress:
```
html
<button class="btn btn-primary" id="action-approve" style="display: none;">✓ Approve</button>
```

### Шаг 2: Обработка Approve в sessions.js
Добавить:
- `approveAction()` метод
- Логику показа кнопки Approve когда есть action_proposal
- Добавление узла на VueFlow после Approve

### Шаг 3: LocalStorage для запоминания
Добавить:
- `SessionFlowStorage` класс для работы с localStorage
- Сохранение узлов при добавлении
- Восстановление при загрузке

### Шаг 4: Добавить тип узла "SessionNode"
Создать новый тип узла в `nodes.js` для отображения сессии:
- Показать ID сессии
- Показать статус (active/completed/failed)
- Показать количество сообщений

---

## Реализация

### Файл: a2a-client/web/js/sessions/flow-storage.js (НОВЫЙ)
```
javascript
/**
 * Session Flow Storage - управление состоянием VueFlow в localStorage
 */

const SessionFlowStorage = {
  STORAGE_KEY: 'a2a-session-flow-nodes',
  
  /**
   * Сохранить узел сессии
   */
  saveNode(node) {
    const nodes = this.getNodes();
    const existing = nodes.findIndex(n => n.id === node.id);
    if (existing >= 0) {
      nodes[existing] = node;
    } else {
      nodes.push(node);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
    return nodes;
  },
  
  /**
   * Получить все сохранённые узлы
   */
  getNodes() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  
  /**
   * Удалить узел
   */
  removeNode(nodeId) {
    const nodes = this.getNodes().filter(n => n.id !== nodeId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
    return nodes;
  },
  
  /**
   * Очистить все узлы
   */
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },
  
  /**
   * Получить узел по ID сессии
   */
  getNodeBySessionId(sessionId) {
    return this.getNodes().find(n => n.data?.sessionId === sessionId);
  }
};

window.SessionFlowStorage = SessionFlowStorage;
```

### Изменения в sessions.js

1. Добавить импорт storage:
```
javascript
// После загрузки sessions.js загрузить storage
if (window.SessionFlowStorage) {
  // Восстановить узлы при инициализации
}
```

2. Добавить метод `addSessionNodeToFlow()`:
```
javascript
addSessionNodeToFlow(session) {
  const node = {
    id: `session-${session.id}`,
    type: 'session',
    position: this.getNextNodePosition(),
    data: {
      sessionId: session.id,
      label: `Session #${session.id.slice(0, 8)}`,
      status: session.status || 'active',
      messageCount: session.messages?.length || 0,
      createdAt: session.createdAt
    }
  };
  
  // Сохранить в localStorage
  if (window.SessionFlowStorage) {
    window.SessionFlowStorage.saveNode(node);
  }
  
  // Добавить на сцену
  if (window.addContextBlock) {
    window.addContextBlock(node);
  }
},

getNextNodePosition() {
  const nodes = window.SessionFlowStorage?.getNodes() || [];
  const index = nodes.length;
  return {
    x: 100 + (index % 3) * 280,
    y: 50 + Math.floor(index / 3) * 200
  };
}
```

3. Добавить обработку Approve кнопки (в init):
```
javascript
document.getElementById('action-approve')?.addEventListener('click', () => this.approveAction());
```

4. Добавить метод `approveAction()`:
```
javascript
async approveAction() {
  if (!this.state.current || !this.state.action.definition) return;
  
  const session = this.state.current;
  
  // Добавить узел сессии на VueFlow
  this.addSessionNodeToFlow(session);
  
  // Продолжить выполнение (原有的 runAction логика)
  this.runAction();
}
```

5. Показать кнопку Approve когда есть action_proposal (в renderActionProgress):
```
javascript
const approveBtn = document.getElementById('action-approve');
if (approveBtn) {
  approveBtn.style.display = definition && !isRunning ? 'block' : 'none';
}
```

### Изменения в nodes.js

Добавить новый тип узла:
```
javascript
/**
 * SessionNode - отображает сессию на графе
 */
export const SessionNode = {
  name: 'SessionNode',
  type: 'session',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      const statusColors = {
        active: { bg: '#dbeafe', color: '#2563eb', text: 'Active' },
        completed: { bg: '#dcfce7', color: '#16a34a', text: 'Completed' },
        failed: { bg: '#fee2e2', color: '#dc2626', text: 'Failed' },
        waiting: { bg: '#fef3c7', color: '#b45309', text: 'Waiting' }
      };
      const statusStyle = statusColors[data.status] || statusColors.active;
      
      return createNodeWrapper(
        props,
        [
          h('div', { style: { fontWeight: '600', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' } }, 'Session:'),
          h('div', { style: { color: '#1e293b', fontSize: '13px', marginBottom: '8px', fontFamily: 'monospace' } }, data.sessionId?.slice(0, 12) || 'N/A'),
          h('div', { style: { display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b' } }, [
            h('span', {}, `Messages: ${data.messageCount || 0}`)
          ]),
          h('div', { 
            style: { 
              marginTop: '8px', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: '600',
              backgroundColor: statusStyle.bg,
              color: statusStyle.color,
              textAlign: 'center'
            }
          }, statusStyle.text)
        ],
        '#8b5cf6', // Purple color for sessions
        '📋',
        'SESSION'
      );
    };
  }
};
```

И зарегистрировать в `registerCustomNodes()`:
```
javascript
session: SessionNode,
```

---

## UI изменения в index.html

Добавить кнопку Approve:
```
html
<div class="action-actions">
  <button class="btn btn-primary" id="action-approve" style="display: none;">✓ Approve</button>
  <button class="btn btn-primary" id="action-run" style="display: none;">▶ Run</button>
  <button class="btn btn-secondary" id="action-cancel" style="display: none;">✕ Cancel</button>
</div>
```

---

## Восстановление при загрузке

В `init()` добавить:
```
javascript
// Восстановить узлы из localStorage при загрузке
setTimeout(() => {
  if (window.SessionFlowStorage && window.setFlowNodes && window.setFlowEdges) {
    const savedNodes = SessionFlowStorage.getNodes();
    if (savedNodes.length > 0) {
      // Добавить сохранённые узлы на сцену
      savedNodes.forEach(node => {
        window.addContextBlock?.(node);
      });
      console.log('Restored', savedNodes.length, 'session nodes from localStorage');
    }
  }
}, 500);
