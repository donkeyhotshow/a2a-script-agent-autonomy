# ActionManager.js

**Source:** `resources/common/managers/ActionManager.js`

## Purpose

The `ActionManager` handles the execution of specific client-side actions triggered by events or component interactions,
often defined within `customHooks` in the JSON UI structure. It orchestrates interactions with other managers like
`FormManager`, `NotifyManager`, `ToastManager`, and the Inertia router.

## Core Functions

1. **Navigation:**
    - `navigateTo(params, instance)`: Navigates to a specified Inertia route using `router.get(params.route)`.
2. **DOM Manipulation:**
    - `changeAttribute(data, element)`: Modifies attributes of a target DOM element. Currently supports adding/removing
      CSS classes (`attribute: "class"`). Emits a `forceUpdate` event via `NotifyManager` for the target component after
      changing class.
    - `toggleClass(data, element)`: Toggles a specific CSS class on the target DOM element. Also emits `forceUpdate`.
3. **User Feedback:**
    - `alert(data)`: Displays a standard browser `alert()` dialog with a specified message.
    - `copyToClipboard(data)`: Copies the value of a specified field (`data.field`) from a specific form (`data.form`)
      managed by `FormManager` to the clipboard using `navigator.clipboard.writeText()`. Shows success/error toasts via
      `ToastManager`.
4. **Component Updates:**
    - `forceUpdate()`: Toggles a (presumably reactive) `forceUpdate` property on the `hub` itself. The exact mechanism
      of how this triggers updates might depend on how it's observed elsewhere.
5. **Data Submission:**
    - `formInputData(inputData)`: Prepares data for submission. Expects `inputData` to match the structure provided in a
      `customHooks.data` object for a `sendData` action. If `inputData.payload` is missing, it attempts to retrieve it
      from `FormManager` using `getModelData` based on `inputData.form` and optionally `inputData.field`.
    - `getModelData(inputData)`: Helper to get data from `FormManager`. Called by `formInputData`.
        - If `inputData` contains both `form` and `field`, returns the value of that specific `field` from the specified
          `form`.
        - If `inputData` contains only `form`, returns the *entire data object* for that `form`.
        - If `inputData` does not contain `form`, returns `null` (or depends on `FormManager.getData(null)`).
    - `sendData(data, options = {}, pathToRequest = window.location.pathname)`: The main function for sending data to
      the backend via Inertia.
        - Accepts single or multiple command objects in the `data` parameter. This `data` typically comes directly from
          the `customHooks.data` definition in the JSON UI.
        - **Target Specification (`sendTo`):** While the function signature takes an optional `pathToRequest`, practical
          examples show that the target backend action/path is typically specified *within* the `data` object using the
          key `"sendTo"`. The value should be the path to the server-side action (e.g., `"module/actions/action-name"`).
        - Each command object is processed by `formInputData` to potentially enrich it with form data using
          `getModelData` based on keys like `"form"`, `"forms"`, or `"field"` present in the `data` object.
        - Uses `router.post` to send the processed command(s) to the specified `pathToRequest` (or the path derived from
          `"sendTo"` if implemented).
        - Handles Inertia lifecycle events (`onStart`, `onFinish`, `onSuccess`, `onError`).
        - Calls `FormManager` methods (`prepareForm`, `handleFormSuccess`, `handleFormError`) to update form state
          during the request lifecycle.
        - Integrates with Spatie's error solutions (`Solutions.handle(errors)` on error - *Note: `Solutions` is not
          defined/imported in this file, suggesting it's a global or injected dependency assumed to be available*).

## Usage

Actions are typically invoked by `Presets.vue` when handling events defined in a component's `customHooks`.
`Presets.vue` receives an event payload via `NotifyManager`, determines the action type, and calls the corresponding
method in `ActionManager`.

```javascript
// Example customHook definition in JSON
"customHooks": {
  "click": [
    {
      "action": "sendData",
      "data": {
        "sendTo": "myCustomAction", // Target backend action/path
        "form": "myForm",        // Specifies the form for FormManager
        "additionalParam": "staticValue" // Other static params are passed directly
      }
    },
    {
      "action": "sendData",
      "data": {
        "sendTo": "module/actions/updateSpecificField", // Target backend action/path
        "form": "myForm",
        "field": "specificField" // If 'field' is present, getModelData returns only the value of myForm.specificField
      }
    },
    {
      "action": "toggleClass",
      "data": { "target": "targetVAddress", "class": "is-active" }
    }
  ]
}

// Presets.vue (simplified event handler)
handleVAddressEvents(payload) {
  // ... determine action from payload ...
  switch (action) {
    case 'sendData':
      this.hub.actionManager.sendData(payload.data);
      break;
    case 'toggleClass':
      // Note: Presets needs the actual DOM element reference
      const targetElement = this.$refs['component']?.$el; // Or find element by vAddress
      this.hub.actionManager.toggleClass(payload.data, targetElement);
      break;
    // ... other cases
  }
}
```

## Dependencies

- `./include/RegularManager.js` (Base class)
- `@inertiajs/vue3` (`router`)
- Vue (`toRaw` - *Note: used but potentially implicitly via other managers*)
- Relies heavily on being accessed via `HubManager` (`this.hub`) to interact with:
    - `FormManager`
    - `NotifyManager`
    - `ToastManager`
    - `Debug` logging
- Assumed global/external dependency: `Solutions` (for `Solutions.handle(errors)`)

<!-- mirror-status: outdated -->
<!-- source-size: 7873 -->

