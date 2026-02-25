# FormManager.js

**Source:** `resources/common/managers/FormManager.js`

## Purpose

The `FormManager` is responsible for managing the state and data of all forms defined within the JSON UI. It acts as a
centralized store for form field values, their configurations, and processing states (pending, error).

It integrates closely with `VModel.vue` components to provide reactive data binding.

## Core Functions

1. **Form Registration:**
    - `registerForm(formName, formConfig, fields = {})`: Creates or updates a form entry in the manager's state.
      Initializes it with configuration, a reactive `Map` for fields, and `pending`/`error` status flags. It
      automatically calls `initializeFields`.
    - `initializeForms()`: Called potentially during startup (though not explicitly shown being called by HubManager) to
      register forms defined in `$page.props.forms`.
2. **Field Management:**
    - `initializeFields(formName, fields)`: Populates the `fields` Map for a given form with initial data.
    - `registerField(formName, fieldName)`: Ensures a specific field exists within a form's `fields` Map, creating the
      form and/or field with a default empty value (`''`) if necessary. Returns the reactive field object.
    - `updateFieldValue(formName, fieldName, value)`: Updates the `.value` property of a specific field within a form's
      reactive `fields` Map. If the field doesn't exist, it registers it first.
    - `getField(formName, fieldName)`: Retrieves the reactive object for a specific field.
3. **Data Access:**
    - `getData(formName)`: Retrieves a plain JavaScript object containing the current `value` of all registered fields
      for a given form.
    - `getForm(formName)`: Retrieves the entire reactive form object (including config, fields Map, pending, error).
4. **Submission State Handling:**
    - `prepareForm(formName)`: Sets the form's `pending` state to `true` and clears any previous `error` before data
      submission.
    - `handleFormSuccess(formName, response)`: Sets `pending` to `false` after a successful submission.
    - `handleFormError(formName, error)`: Sets `pending` to `false` and stores the error message in the form's `error`
      state after a failed submission.

## State Structure (per form)

Each form registered under a `formName` key has the following structure within the manager's state:

```javascript
{
  "config": { /* formConfig object */ },
  "fields": Map {
    "fieldName1": { "value": ..., "visible": true, ... },
    "fieldName2": { "value": ..., "visible": true, ... },
    // ... other fields
  },
  "pending": false, // boolean: indicates if the form is awaiting a server response
  "error": null // string | null: stores the last error message
}
```

## Usage

- **Registration:** Forms are often implicitly registered when `VModel.vue` components mount and access their fields (
  via `registerField`), or explicitly via JSON definitions containing a `Form.vue` container wrapper which calls
  `registerForm` on mount.
- **Data Binding (JSON UI):**
    - The link between a VModel component in the UI (like `@InputText.md`, `@Checkbox.md`, etc.) and the `FormManager`'s
      state is established via the `model` property in the component's JSON definition.
    - **Standard Structure:**
      ```json
      {
        "type": "InputText",
        // ... other props/attrs ...
        "model": {
          "form": "yourFormName", // The formName registered in FormManager
          "field": "yourFieldName" // The fieldName within the form's data
        }
      }
      ```
    - The `VModel.vue` wrapper component uses the `form` and `field` values from this `model` object to call the
      appropriate `FormManager` methods (`updateFieldValue`, `getData`, `getField`) for reactive data binding.
- **Data Binding (Internal):** `VModel.vue` uses `updateFieldValue` (in its `set` computed property) and `getData`/
  `getField` (in its `get` computed property) to link UI inputs to the manager's state, using the `form` and `field`
  provided by the JSON `model` property.
- **Submission:** `ActionManager` (specifically in `sendData`) uses `prepareForm`, `handleFormSuccess`, and
  `handleFormError` to manage the form's state during API interactions initiated by form submissions.

## Dependencies

- `./include/StateManager.js` (Base class)
- Vue (`reactive`)
- Relies heavily on being accessed via `HubManager` (`this.hub`).

<!-- mirror-status: outdated -->
<!-- source-size: 8776 -->

