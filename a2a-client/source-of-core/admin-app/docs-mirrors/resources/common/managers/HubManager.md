# HubManager.js

**Source:** `resources/common/managers/HubManager.js`

## Purpose

The `HubManager` serves as the central coordinating instance for the entire UI management system. It acts as a
singleton, instantiated during the Vue application setup (`main.js`). It initializes, holds references to, and provides
access (`app.provide('hub', this)`) to all other specialized managers.

It also manages a central state (built on `StateManager` - *base class, no specific doc found*), handles system-wide
events, debugging configurations, and custom hook management.

## Core Functions

1. **Manager Initialization:** In its `install(app)` method, it creates instances of all other managers (`LogManager`,
   `PropsManager`, `NotifyManager`, `FormManager`, `ComponentManager`, `LayoutManager`, `MenuManager`, `ModalManager`,
   `SplitterManager`, `TimerManager`, `ThemeManager`, `AlertManager`, `ToastManager`, `ActionManager`) and passes its
   own instance (`this`) to their constructors, establishing the central hub connection.
   *(See links below for individual manager docs)*
2. **Dependency Injection:** Provides itself (`hub`) via Vue's `provide` mechanism, making it accessible to all
   components through `inject: ['hub']`.
3. **State Management:** Inherits from `StateManager`, providing `get(path)` and `update(path, value)` methods for
   accessing a reactive central state (`this.state`).
4. **Custom Hooks:** Manages a `Map` (`this.customHooks`) for registering and finding event listeners defined in
   component JSON (`customHooks` property - see [Module Actions Documentation]), primarily handled by `Presets.vue`.
5. **Debugging Control:**
    - Maintains debug settings in `state.eventSettings`.
    - Provides a central `debug(module, name, message)` method used by other managers (e.g., [LogManager]).
    - Includes `allowedItemsToOutput` regex array to filter debug messages.
6. **Event Handling (Conceptual):**
    - Includes setup for standard event handling (`setupEventCustomHooks`, `handleStandardEvent`, `handleSystemEvent`),
      although the specific flow and usage of `STANDARD_EVENTS` might need further clarification based on usage
      patterns.
    - Relies heavily on [NotifyManager] for event emission and subscription between components and managers.

## Key Managers Instantiated

- **Log/Notification:** [LogManager], [NotifyManager], [AlertManager], [ToastManager]
- **Component/Rendering:** [ComponentManager], [PropsManager]
- **Data/Actions:** [FormManager], [ActionManager]
- **UI/Layout:** [ThemeManager], [LayoutManager], [MenuManager], [ModalManager], [SplitterManager]
- **Timing:** [TimerManager]

## State Structure (`this.state`)

- `events`: (Map) Likely intended for event state, usage may vary.
- `eventHistory`: (Array) Logs past events.
- `eventSettings`: (Object) Contains flags like `debug`, `logLevel`, `toast`.
- `requestQueue`: (Array) Likely for managing asynchronous requests.

## Usage

Typically accessed within components or other managers via injection:

```javascript
// Within a Vue component setup or method
const hub = inject('hub');
hub.formManager.getData('myForm');
hub.notifyManager.emit('someEvent', { data: 'payload' });
hub.debug('MyComponent', 'myMethod', 'Some debug info');
```

## Dependencies

- `./private/log/LogManager.js` ([LogManager])
- `./NotifyManager.js` ([NotifyManager])
- `./FormManager.js` ([FormManager])
- `./constants/events.js` (STANDARD_EVENTS)
- `./ThemeManager.js` ([ThemeManager])
- `./private/log/AlertManager.js` ([AlertManager])
- `./private/log/ToastManager.js` ([ToastManager])
- `./ComponentManager.js` ([ComponentManager])
- `./LayoutManager.js` ([LayoutManager])
- `./MenuManager.js` ([MenuManager])
- `./ModalManager.js` ([ModalManager])
- `./SplitterManager.js` ([SplitterManager])
- `./TimerManager.js` ([TimerManager])
- `./PropsManager.js` ([PropsManager])
- `./ActionManager.js` ([ActionManager])
- `./include/StateManager.js` (Base class - *no specific doc found*)

// --- Link Definitions ---
[Module Actions Documentation]: ../../json-ui/core-concepts/module-actions.md
[LogManager]: ./private/log/LogManager.md // Placeholder - Verify Path
[PropsManager]: ./PropsManager.md // Placeholder - Verify Path
[NotifyManager]: ./NotifyManager.md // Placeholder - Verify Path
[FormManager]: ./FormManager.md // Placeholder - Verify Path
[ComponentManager]: ./ComponentManager.md // Placeholder - Verify Path
[LayoutManager]: ./LayoutManager.md // Placeholder - Verify Path
[MenuManager]: ./MenuManager.md // Placeholder - Verify Path
[ModalManager]: ./ModalManager.md // Placeholder - Verify Path
[SplitterManager]: ./SplitterManager.md // Placeholder - Verify Path
[TimerManager]: ./TimerManager.md // Placeholder - Verify Path
[ThemeManager]: ./ThemeManager.md // Placeholder - Verify Path
[AlertManager]: ./private/log/AlertManager.md // Placeholder - Verify Path
[ToastManager]: ./private/log/ToastManager.md // Placeholder - Verify Path
[ActionManager]: ./ActionManager.md // Placeholder - Verify Path

- **[FormManager](./FormManager.md):** Manages form states, field values, validation, and submission status.
- **[PropsManager](./PropsManager.md):** Handles dynamic properties and configurations for components.
- **[LayoutManager](./LayoutManager.md):** Controls the overall layout structure and responsiveness.
- **[ThemeManager](./ThemeManager.md):** Manages application themes and styling.
- **[TimerManager](./TimerManager.md):** Handles timed events and intervals.
- **[ActionManager](./ActionManager.md):** Coordinates actions triggered by user interactions or events.
- **[ModalManager](./ModalManager.md):** Manages the display and state of modal dialogs.
- **[MenuManager](./MenuManager.md):** Controls navigation menus and their states.
- **StateManager:** (Base class/functionality - Documentation TBD)
- **EventManager:** (Base class/functionality - Documentation TBD)
- **StorageManager:** (Base class/functionality - Documentation TBD)
- **CacheManager:** (Base class/functionality - Documentation TBD)

<!-- mirror-status: outdated -->
<!-- source-size: 13064 -->

