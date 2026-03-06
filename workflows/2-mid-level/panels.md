# Panel Manager Workflow

> **Files:** `panel-manager.js`, `css/components/panel-manager.css`

## Overview

Panel system manages floating UI panels (task, chat, debug, etc.). Handles creation, positioning, resizing, and lifecycle.

## Architecture

```
PanelManager (singleton)
    ├── TaskPanel
    ├── ChatPanel
    ├── DebugPanel
    └── Custom Panels
            ↓
    CSS Transitions + Event Bus
```

## When to Edit

| Task | File | Area |
|------|------|------|
| Add panel type | `panel-manager.js` | `createPanel()` |
| Change layout | `panel-manager.js` | Position/size logic |
| Modify styles | `css/components/panel-manager.css` | Panel classes |
| Add animations | `panel-manager.js` + CSS | Transition handlers |

## Core Flow: Create Panel

```javascript
// 1. Request panel creation
PanelManager.createPanel({
  id: 'my-panel',
  type: 'custom',
  title: 'My Panel',
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  content: HTMLElement | string
});

// 2. PanelManager creates DOM
const panel = document.createElement('div');
panel.className = 'panel panel-custom';
panel.innerHTML = renderTemplate(options);

// 3. Apply positioning
panel.style.left = options.x + 'px';
panel.style.top = options.y + 'px';

// 4. Add to container
document.getElementById('panel-container').appendChild(panel);

// 5. Register in manager
this.panels.set(options.id, {
  element: panel,
  state: 'visible',
  options: options
});

// 6. Emit event
EventBus.emit('panel:created', { id: options.id });
```

## Adding New Panel Type

```javascript
// panel-manager.js

class PanelManager {
  createPanel(options) {
    switch (options.type) {
      case 'task':
        return this.createTaskPanel(options);
      case 'chat':
        return this.createChatPanel(options);
      case 'new-type':  // Add new type
        return this.createNewTypePanel(options);
    }
  }

  createNewTypePanel(options) {
    const panel = this.createBasePanel(options);

    // Add type-specific features
    panel.classList.add('panel-new-type');

    // Add custom controls
    const controls = this.renderNewTypeControls(options);
    panel.querySelector('.panel-header').appendChild(controls);

    // Register type-specific event handlers
    this.attachNewTypeHandlers(panel, options);

    return panel;
  }
}
```

## Panel States

```javascript
const PanelState = {
  VISIBLE: 'visible',
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  HIDDEN: 'hidden',
  CLOSED: 'closed'
};
```

## State Transitions

```
hidden → visible (show)
visible → hidden (hide)
visible → minimized (minimize)
visible → maximized (maximize)
minimized/maximized → visible (restore)
any → closed (close, removes DOM)
```

## Event System

```javascript
// Panel events
EventBus.on('panel:show', ({ id }) => { ... });
EventBus.on('panel:hide', ({ id }) => { ... });
EventBus.on('panel:move', ({ id, x, y }) => { ... });
EventBus.on('panel:resize', ({ id, width, height }) => { ... });
EventBus.on('panel:close', ({ id }) => { ... });
```

## Styling Guidelines

```css
/* Base panel styles */
.panel {
  position: absolute;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Type-specific */
.panel-task { border-top: 3px solid #4CAF50; }
.panel-chat { border-top: 3px solid #2196F3; }
.panel-debug { border-top: 3px solid #FF9800; }
```

## Testing

```bash
# Test panel manager
npm run test:panels

# Visual regression
npm run test:panels:visual
```
