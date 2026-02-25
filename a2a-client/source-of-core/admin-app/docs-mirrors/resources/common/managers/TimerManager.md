# TimerManager.js

**Source:** `resources/common/managers/TimerManager.js`

## Purpose

The `TimerManager` provides utilities for managing timed operations within the application, such as timeouts and
intervals, as well as debouncing and throttling function calls.

## Core Functions

1. **Timer Management (Stateful):**
    - `createTimer(id, callback, delay, type = 'timeout')`: Creates a standard JavaScript `setTimeout` or `setInterval`,
      stores its ID and type (`timeout`/`interval`) under the given `id` key using the base `StateManager`'s `create`
      method.
    - `clearTimer(id)`: Clears the timeout or interval associated with the given `id` using `clearTimeout`/
      `clearInterval` and removes it from the manager's state using `delete`.
    - `clearTimers()`: Clears all timers currently managed by the instance.
2. **Timer Control (Simplified - *May be incomplete/less used*):**
    - `register(id, timer)`: Stores an external timer object (structure not defined) in a separate `this.timers` Map.
    - `start(id)`: Sets `running = true` on a timer object retrieved from `this.timers`.
    - `stop(id)`: Sets `running = false` on a timer object retrieved from `this.timers`.
      *Note: The connection between `createTimer` and the `register/start/stop` methods using `this.timers` is
      unclear. `createTimer` uses the base `StateManager` state, while `register/start/stop` use a separate `Map`.*
3. **Function Execution Control:**
    - `debounce(fn, delay)`: Returns a debounced version of the function `fn`. The debounced function will only execute
      after `delay` milliseconds have passed without any new calls.
    - `throttle(fn, delay)`: Returns a throttled version of the function `fn`. The throttled function will execute at
      most once every `delay` milliseconds.

## Usage

- Instantiated by `HubManager`.
- Accessed via `hub.timerManager`.
- `createTimer` and `clearTimer` can be used for managing standard timeouts/intervals needed by components or other
  managers.
- `debounce` and `throttle` are useful for rate-limiting event handlers (e.g., window resize, input events).

```javascript
// Example: Debounce an input handler
const hub = inject('hub');

const handleInputDebounced = hub.timerManager.debounce((event) => {
  console.log('Input value (debounced):', event.target.value);
}, 500); // Wait 500ms after last input

// In template:
// <input @input="handleInputDebounced" />

// Example: Create and clear a timeout
let myTimerId = null;

function startOperation() {
  // ... start something ...
  myTimerId = hub.timerManager.createTimer('myOperationTimeout', () => {
    console.log('Operation timed out!');
  }, 5000); // 5 second timeout
}

function cancelOperation() {
  if (myTimerId) {
    hub.timerManager.clearTimer(myTimerId);
    myTimerId = null;
    console.log('Operation timeout cancelled.');
  }
}
```

## Dependencies

- `./include/StateManager.js` (Base class)
- Relies on `HubManager` (`this.hub`).

<!-- mirror-status: outdated -->
<!-- source-size: 1809 -->

