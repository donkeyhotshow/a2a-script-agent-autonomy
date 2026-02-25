# Listbox.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/Listbox.vue`

## Purpose

Wraps the PrimeVue [`<p-listbox>`](https://primevue.org/listbox/) component to display a list of items from which single
or multiple selections can be made.

**Note:** This component appears to be a simple wrapper passing attributes directly via `$attrs`. It does **not** seem
to integrate with `FormManager` via the `VModel.vue` pattern. For form-bound listbox selection, a different wrapper (
potentially within the `VModel/` directory) might be needed.

## Rendering

- Renders the core `<p-listbox>` component.
- Uses `v-bind="$attrs"` to pass down all attributes from `component.attrs` directly to the `<p-listbox>` component.
  This includes essential props like:
    - `modelValue`: The selected item(s).
    - `options`: (Array, **Required**) The array of available items.
    - `optionLabel`: (String) Property name for the label if options are objects.
    - `optionValue`: (String) Property name for the value if options are objects.
    - `multiple`: (Boolean) Allow multiple selections.
    - `filter`: (Boolean) Enable filtering.
    - `disabled`: (Boolean)
    - `class`, `style`, etc.
- Listens for the `update:modelValue` event and emits it upwards as `onUpdateModelValue`.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Listbox.
    - `component.attrs`: (Object, Optional but `options` and `modelValue` usually required) Attributes to pass directly
      to the `<p-listbox>` component (e.g.,
      `{ "options": [...], "modelValue": "{selectionState}", "optionLabel": "name", "filter": true }`). _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/input-section.json`)_

## Events Emitted

- `onUpdateModelValue(newValue)`: Emitted when the selection changes.

## Usage (JSON Example)

> **Source:** Based on `storage/aiInstaller/sakai-dashboard/demo/input-section.json`.
> **⚠️ WARNING:** This wrapper uses `attrs` for configuration and requires external state management for `modelValue`.
> It does **not** integrate with `FormManager`.

<!-- ```json
{
  "type": "Listbox", // Validated Type
  "attrs": {
    // v-model equivalent - value must be managed externally (e.g., via reactive state)
    "modelValue": "{appState.selectedCity}", 
    // Listbox configuration passed via attrs:
    "options": [
      { "name": "New York", "code": "NY" },
      { "name": "Rome", "code": "RM" },
      { "name": "London", "code": "LDN" },
      { "name": "Istanbul", "code": "IST" },
      { "name": "Paris", "code": "PRS" }
    ],
    "optionLabel": "name", // Validated attr
    // "optionValue": "code", // Define if value should differ from object
    "multiple": false, // Validated attr (set to true for multi-select)
    "filter": true, // Validated attr
    "class": "w-full md:w-14rem" // Validated attr
  }
}
``` -->

**Explanation:**

* Requires external state management for the selection via `attrs.modelValue`.
* Does not use the `model: { form: ..., field: ... }` pattern.

## Internal Logic

- Simple wrapper.
- Renders `<p-listbox v-bind="$attrs" @update:modelValue="emit('onUpdateModelValue', $event)" />`.

## Dependencies

- `primevue/listbox`: The core PrimeVue component.

## Usage (Conceptual Example in Parent Template)

This wrapper is usually rendered by `Component.vue`. A typical JSON configuration passed to `Component.vue` might look
like this, but the actual `options` and event handlers would likely be managed higher up.

```json
{
  "type": "Listbox", // Matches component name in Component.vue
  "props": { 
    // Props intended for the <p-listbox> are passed via $attrs
    // Example: These would likely be bound in the parent rendering this
    // "options": [{ "name": "New York", "code": "NY" }, { "name": "Rome", "code": "RM" }],
    // "optionLabel": "name",
    // "class": "w-full md:w-14rem"
  }
}
```

**Note on `v-model`:** This simple wrapper does **not** inherently handle `v-model`. If you need data binding, use the
`VModel/Select.vue` component configured with `"type": "Listbox"` in its JSON definition.
<!-- mirror-status: outdated -->
<!-- source-size: 247 -->

