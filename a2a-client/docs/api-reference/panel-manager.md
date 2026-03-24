# PanelManager API Reference

> **⚠️ Deprecated**: This module was planned but never implemented. UI panel lifecycle is now managed by **WindowRegistry** and window-state.js. See [window-registry.md](window-registry.md) for actual implementation.

The PanelManager provides unified UI panel lifecycle management, consolidating panels, cubes, and modals into a single hierarchy.

## Overview

```javascript
const panels = PanelManager.init({
  mount: document.body
});
```

## Initialization

### `PanelManager.init(options)`

Initializes the PanelManager singleton.

**Parameters:**
- `options.mount` (Element): DOM element to mount panels to (default: document.body)

**Returns:** PanelManager instance

**Example:**
```javascript
const panels = PanelManager.init({
  mount: document.querySelector('#app-panels')
});
```

## Panel Types

Predefined panel configurations:

```javascript
const PANEL_TYPES = {
  task: { slot: 'floating', title: 'Task', critical: true },
  chat: { slot: 'right', title: 'Chat', critical: false },
  logs: { slot: 'bottom', title: 'Logs', critical: false },
  sessions: { slot: 'left', title: 'Sessions', critical: false },
  settings: { slot: 'modal', title: 'Settings', critical: false },
  projects: { slot: 'modal', title: 'Projects', critical: false },
  debug: { slot: 'floating', title: 'Debug', critical: false }
};
```

### Panel Configuration

Each panel type has:
- **slot**: Layout position (`'floating'`, `'left'`, `'right'`, `'bottom'`, `'modal'`)
- **title**: Default panel title
- **critical**: Whether panel can be closed (affects lifecycle)

## Panel States

```javascript
const PANEL_STATES = {
  CREATED: 'created',     // Panel created but not shown
  VISIBLE: 'visible',     // Panel is visible and active
  MINIMIZED: 'minimized', // Panel minimized to indicator
  DOCKED: 'docked',       // Panel docked in slot
  CLOSED: 'closed'        // Panel closed/hidden
};
```

## Core API

### `PanelManager.create(type, options)`

Creates a new panel instance without showing it.

**Parameters:**
- `type` (string): Panel type from PANEL_TYPES
- `options.id` (string, optional): Custom panel ID
- `options.title` (string, optional): Panel title
- `options.critical` (boolean, optional): Override critical flag
- `options.onClose` (Function, optional): Close callback
- `options.onStateChange` (Function, optional): State change callback
- `options.x`, `options.y` (number, optional): Position for floating panels
- `options.width`, `options.height` (number, optional): Size for floating panels

**Returns:** Panel instance

### `PanelManager.open(type, options)`

Creates and immediately shows a panel.

**Parameters:** Same as `create()`, plus show options

**Returns:** Panel instance

**Side Effects:** Calls `panel.show()` and `bringToFront(id)`

### `PanelManager.close(id)`

Closes a panel by ID.

**Parameters:**
- `id` (string): Panel ID

**Returns:** PanelManager instance

### `PanelManager.remove(id)`

Destroys and removes a panel completely.

**Parameters:**
- `id` (string): Panel ID

**Returns:** PanelManager instance

## Query Methods

### `PanelManager.get(id)`

Gets a panel instance by ID.

**Parameters:**
- `id` (string): Panel ID

**Returns:** Panel instance or null

### `PanelManager.getByType(type)`

Gets all panels of a specific type.

**Parameters:**
- `type` (string): Panel type

**Returns:** Array<Panel>

### `PanelManager.getVisible()`

Gets all currently visible panels.

**Returns:** Array<Panel>

### `PanelManager.getMinimized()`

Gets all minimized panels.

**Returns:** Array<Panel>

## Global Actions

### `PanelManager.bringToFront(id)`

Brings a panel to the front (highest z-index).

**Parameters:**
- `id` (string): Panel ID

**Returns:** PanelManager instance

**Side Effects:** Updates z-index, sets as active panel

### `PanelManager.minimizeAll()`

Minimizes all non-critical visible panels.

**Returns:** PanelManager instance

### `PanelManager.closeAll(type)`

Closes all panels, optionally filtered by type.

**Parameters:**
- `type` (string, optional): Panel type filter

**Returns:** PanelManager instance

## Panel Instance API

Each panel instance provides methods for individual control:

### State Transitions

#### `panel.show()`
Shows the panel and brings it to front.

**Returns:** Panel instance

**Side Effects:** Sets state to VISIBLE, mounts to DOM

#### `panel.minimize()`
Minimizes the panel to indicator.

**Returns:** Panel instance

**Side Effects:**
- Critical panels: Minimize to indicator
- Non-critical panels: Close instead

#### `panel.restore()`
Restores a minimized panel to visible state.

**Returns:** Panel instance

**Side Effects:** Brings to front

#### `panel.close()`
Closes the panel.

**Returns:** Panel instance

**Side Effects:**
- Critical panels in non-modal slots: Minimize instead
- Others: Hide and potentially destroy

#### `panel.destroy()`
Completely removes the panel from DOM and memory.

### Content API

#### `panel.setContent(html)`
Sets the panel content.

**Parameters:**
- `html` (string): HTML content

**Returns:** Panel instance

#### `panel.getContentEl()`
Gets the content DOM element.

**Returns:** HTMLElement

#### `panel.setTitle(title)`
Updates the panel title.

**Parameters:**
- `title` (string): New title

**Returns:** Panel instance

#### `panel.setStatus(status)`
Sets the indicator status.

**Parameters:**
- `status` (string): Status class (e.g., 'unread', 'error')

**Returns:** Panel instance

## Event System

### PanelManager Events

PanelManager itself doesn't emit events, but panels do through their callbacks.

### Panel Callbacks

Panels accept callback functions in options:

```javascript
const panel = PanelManager.open('task', {
  onClose: () => console.log('Panel closed'),
  onStateChange: (state) => console.log('State changed to:', state)
});
```

## DOM Structure

Each panel has a standardized DOM structure:

```html
<div class="pm-panel pm-type-{type}" data-panel-id="{id}">
  <div class="pm-header">
    <span class="pm-title">{title}</span>
    <div class="pm-controls">
      <button class="pm-btn pm-btn-minimize">−</button>
      <button class="pm-btn pm-btn-close">×</button>
    </div>
  </div>
  <div class="pm-content">
    <!-- Panel content -->
  </div>
</div>

<!-- Indicator (when minimized) -->
<div class="pm-indicator" data-panel-id="{id}">
  <span class="pm-indicator-title">{title.slice(0,2)}</span>
  <span class="pm-indicator-status"></span>
</div>

<!-- Modal backdrop (for modal panels) -->
<div class="pm-modal-backdrop"></div>
```

## Z-Index Management

PanelManager manages stacking order:

- **Base z-index**: 1000
- **Increment**: +1 per `bringToFront()` call
- **Modal panels**: Always above floating panels
- **Active panel**: Highest z-index

## Integration with SessionStore

### `PanelManager.syncWithSessionStore()`

Sets up automatic synchronization with SessionStore.

**Returns:** PanelManager instance

**Integration:**
```javascript
// Auto-restore task panel on new execute
store.on('execute', (execute) => {
  const taskPanel = panels.getByType('task')[0];
  if (execute && taskPanel?.state === PANEL_STATES.MINIMIZED) {
    taskPanel.restore();
  }
});

// Update chat panel indicator
store.on('message', () => {
  const chatPanel = panels.getByType('chat')[0];
  if (chatPanel?.state === PANEL_STATES.MINIMIZED) {
    chatPanel.setStatus('unread');
  }
});
```

## Legacy Adapter Methods

For backward compatibility with existing code:

### `PanelManager.addPanel(opts)`

Legacy adapter for PlasticineUI.addPanel() calls.

**Parameters:**
- `opts.id` (string): Panel ID
- `opts.title` (string): Panel title
- `opts.contentHTML` (string): Initial content
- `opts.critical` (boolean): Critical flag
- `opts.onClose` (Function): Close callback

**Returns:** Panel instance

**Mapping:**
```javascript
const typeMap = {
  'task-flow-panel': 'task',
  'logs-panel': 'logs',
  'chat-panel': 'chat',
  'debug-panel': 'debug',
  'sessions-panel': 'sessions',
  'settings-panel': 'settings'
};
```

### `PanelManager.getContentEl(id)`

Gets the content element of a panel (legacy compatibility).

**Parameters:**
- `id` (string): Panel ID

**Returns:** HTMLElement or null

### `PanelManager.removePanel(id)`

Alias for `remove(id)`.

## Drag & Drop (Floating Panels)

Floating panels support mouse drag:

- **Start**: mousedown on header (non-button area)
- **Move**: mousemove updates position
- **End**: mouseup stops dragging
- **Constraints**: Position clamped to viewport bounds

## Modal Behavior

Modal panels have special behavior:

- **Backdrop**: Click closes the modal
- **Z-index**: Higher than floating panels
- **Exclusive**: Only one modal visible at a time (by default)

## Critical Panels

Critical panels have restricted lifecycle:

- **Cannot be closed**: Close attempts minimize instead
- **Always accessible**: Available for restoration
- **System panels**: Task, Chat (typically critical)

## Usage Examples

### Basic Panel Management
```javascript
// Create and show a panel
const taskPanel = PanelManager.open('task', {
  title: 'My Task'
});

// Set content
taskPanel.setContent('<p>Task content here</p>');

// Close later
PanelManager.close(taskPanel.id);
```

### Panel State Handling
```javascript
const panel = PanelManager.open('logs', {
  onStateChange: (state) => {
    console.log('Panel state:', state);
    switch (state) {
      case PANEL_STATES.VISIBLE:
        // Panel became visible
        break;
      case PANEL_STATES.MINIMIZED:
        // Panel minimized
        break;
      case PANEL_STATES.CLOSED:
        // Panel closed
        break;
    }
  }
});
```

### SessionStore Integration
```javascript
// Set up integration
PanelManager.syncWithSessionStore();

// Panels will now auto-update based on session state
SessionStore.on('execute', () => {
  // Task panel will auto-restore if new execute arrives
});
```

### Custom Panel Creation
```javascript
const customPanel = PanelManager.create('floating', {
  id: 'my-custom-panel',
  title: 'Custom Panel',
  x: 100,
  y: 100,
  width: 500,
  height: 400,
  critical: false,
  onClose: () => console.log('Custom panel closed')
});

// Show when ready
customPanel.show();
```

### Panel Querying
```javascript
// Get specific panel
const taskPanel = PanelManager.get('task-panel-1');

// Get all visible panels
const visiblePanels = PanelManager.getVisible();

// Get panels by type
const chatPanels = PanelManager.getByType('chat');

// Check if any panels minimized
const minimizedCount = PanelManager.getMinimized().length;
```

### Global Panel Actions
```javascript
// Minimize everything except critical panels
PanelManager.minimizeAll();

// Close all debug panels
PanelManager.closeAll('debug');

// Bring specific panel to front
PanelManager.bringToFront('important-panel');
```

## CSS Classes

PanelManager uses CSS classes for styling:

| Class | Description |
|-------|-------------|
| `pm-panel` | Base panel class |
| `pm-type-{type}` | Type-specific styling |
| `pm-modal` | Modal panel styling |
| `pm-slot-{slot}` | Slot-specific styling |
| `pm-floating` | Floating panel styling |
| `pm-critical` | Critical panel styling |
| `pm-dragging` | Panel being dragged |
| `pm-header` | Panel header |
| `pm-title` | Panel title |
| `pm-controls` | Control buttons container |
| `pm-btn` | Control button base |
| `pm-btn-minimize` | Minimize button |
| `pm-btn-close` | Close button |
| `pm-content` | Panel content area |
| `pm-indicator` | Minimized indicator |
| `pm-indicator-title` | Indicator title |
| `pm-indicator-status` | Indicator status |
| `pm-modal-backdrop` | Modal backdrop |

## Error Handling

PanelManager operations are generally safe:

- **Invalid IDs**: Methods return null/empty arrays
- **Missing panels**: Graceful degradation
- **DOM errors**: Logged but don't crash
- **Critical panel protection**: Automatic minimization instead of closure

## Related Components

- **[SessionStore](./session-store.md)** - State synchronization
- **[TransportManager](./transport-manager.md)** - Real-time updates
