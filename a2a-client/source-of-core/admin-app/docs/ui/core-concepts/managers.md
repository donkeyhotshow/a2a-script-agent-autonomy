# Global Managers (`hub`)

The JSON UI system provides access to a set of global managers via the `hub` object, initialized in
[`HubManager`](../../resources/managers/HubManager.md). These managers are responsible for various aspects of the
application's operation and provide
centralized state and event management.

**Note:** Interaction with managers from JSON templates occurs via **client hooks (`customHooks`)**.
These hooks can directly call manager methods (e.g., `navigateTo`) or use the
`NotifyManager` (event bus) to publish events that other managers
(e.g., `ToastManager` for notifications, `FormManager` for form data processing) are subscribed to.

## Key Managers

### `hub.notifyManager` (Event Bus)

* **Implementation:** `resources/common/managers/NotifyManager.js`
* **Documentation:** *Documentation missing*
* **Purpose:** Centralized **event bus** for communication between components and managers. Allows
  subscribing (`on`) to events and publishing (`emit`) events.
* **Usage in JSON UI:** [`ActionManager`](../../resources/managers/ActionManager.md) or `customHooks` can publish (
  `emit`)
  events. Other parts of the system or managers/components subscribe (`on`) to these events.

### `hub.toastManager` (UI Notifications)

* **Implementation:** `resources/common/managers/private/log/ToastManager.js`
* **Documentation:** *Documentation missing*
* **Purpose:** Displaying global **notifications (toasts)** to the user (`success`, `info`, `warn`, `error`).
* **Usage in JSON UI:** [`ActionManager`](../../resources/managers/ActionManager.md) (e.g., after successful data
  saving)
  calls methods of this manager.

### `hub.formManager`

* **Implementation:** `resources/common/managers/FormManager.js`
* **Documentation:** [`FormManager`](../../resources/managers/form/formManager.md)
* **Purpose:** Managing the state of forms (field data, `pending` status, errors), their registration, and data
  retrieval.
* **Usage in JSON UI:** Input components with `model` interact with it. [
  `ActionManager`](../../resources/managers/ActionManager.md)
  uses it to get data before sending and to update status/errors after the server response.

### `hub.actionManager`

* **Implementation:** `resources/common/managers/ActionManager.js`
* **Documentation:** [`ActionManager`](../../resources/managers/ActionManager.md)
* **Purpose:** The main manager responsible for **parsing and executing client commands** defined in the **`customHooks`
  ** property
  of JSON UI components (e.g., `sendData`, `navigateTo`).
* **Principle:** Receives the action description from `customHooks`, executes the logic, interacting with other
  managers (`FormManager`,
  `NotifyManager`, `ToastManager`) and Inertia (`router`).
* **Usage in JSON UI:** Key element for UI interactivity.

### `hub` (as StateManager)

* **Implementation:** `resources/common/managers/HubManager.js` (which `extends StateManager`)
* **Documentation:** [`HubManager`](../../resources/managers/HubManager.md)
* **Purpose:** Managing the **common application state**, accessible via `hub.get(path)` and
  `hub.update(path, value)`.
* **Usage in JSON UI:** Storing global settings, UI state, user data.

## Other Initialized Managers

`HubManager` also initializes other managers, each responsible for its own area:

* **Logging:**
    * [`hub.logManager`](../../resources/managers/LogManager.md): *Documentation missing*. Implementation:
      `resources/common/managers/private/log/LogManager.js`
    * [`hub.alertManager`](../../resources/managers/AlertManager.md): *Documentation missing*. Implementation:
      `resources/common/managers/private/log/AlertManager.js`
* **Components & Properties:**
    * [`hub.propsManager`](../../resources/managers/PropsManager.md): Documentation: [
      `PropsManager`](../../resources/managers/PropsManager.md). Implementation:
      `resources/common/managers/PropsManager.js`
    * [`hub.componentManager`](../../resources/managers/ComponentManager.md): *Documentation missing*. Implementation:
      `resources/common/managers/ComponentManager.js`
* **Layout:**
    * [`hub.layoutManager`](../../resources/managers/LayoutManager.md): Documentation: [
      `LayoutManager`](../../resources/managers/LayoutManager.md). Implementation:
      `resources/common/managers/LayoutManager.js`
    * [`hub.menuManager`](../../resources/managers/MenuManager.md): Documentation: [
      `MenuManager`](../../resources/managers/MenuManager.md). Implementation:
      `resources/common/managers/MenuManager.js`
    * [`hub.modalManager`](../../resources/managers/ModalManager.md): Documentation: [
      `ModalManager`](../../resources/managers/ModalManager.md). Implementation:
      `resources/common/managers/ModalManager.js`
* **Theme:**
    * [`hub.themeManager`](../../resources/managers/ThemeManager.md): Documentation: [
      `ThemeManager`](../../resources/managers/ThemeManager.md). Implementation:
      `resources/common/managers/ThemeManager.js`
    * [`hub.splitterManager`](../../resources/managers/SplitterManager.md): *Documentation missing*. Implementation:
      `resources/common/managers/SplitterManager.js`
* **Miscellaneous:**
    * [`hub.timerManager`](../../resources/managers/TimerManager.md): Documentation: [
      `TimerManager`](../../resources/managers/TimerManager.md). Implementation:
      `resources/common/managers/TimerManager.js`

**For detailed information about the API and operation details of each manager, follow the links to their documentation.
** 
