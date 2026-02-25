# Checkbox Component (`Checkbox.vue`)

**Source:** `resources/common/js/Elements/Primevue/VModel/Checkbox/Checkbox.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/01/components/Checkbox.json`

**Underlying Component:** [PrimeVue Checkbox](https://primevue.org/checkbox/)

**Wrapper Chain:** `@RenderJson.md` -> `@Presets.md` -> `@VModel.md` -> `Checkbox.vue` (Note: No intermediate
`Input.vue` likely needed for Checkbox)

## Purpose

Provides a checkbox input, integrated with `@FormManager.md` via the `@VModel.md` wrapper. Allows users to make a binary
choice (true/false) or select multiple items into an array.

## Rendering Flow & Data Binding

1. **JSON Configuration:** Define the `Checkbox` in JSON with `type: "Checkbox"`, data binding
   `model: { form: "...", field: "..." }`, and specific attributes like `inputId` and optionally `label`, `header`,
   `class`. Attributes for the underlying PrimeVue checkbox (like `binary`, `value`, `name`, `disabled`) are placed
   within `props: { ... }`.
2. **`@VModel.md` Wrapper:** Reads `component.model` to set up `v-model` with `@FormManager.md`. It also reads the
   `props` object from the JSON.
3. **Attribute Passing:** `VModel.md` passes the `v-model` handlers and the contents of the `props` object down as
   `$attrs` to `Checkbox.vue`. It also passes `inputId`, `label`, `header`, `class` (if present in the JSON) as direct
   props to `Checkbox.vue`.
4. **`Checkbox.vue` Execution:**
    * Receives `inputId`, `label`, `header`, `class` as direct props.
    * Receives `v-model` handlers and other attributes (`binary`, `value`, `name`, `disabled`, etc.) via `$attrs`.
    * Renders an optional header (`<span>`) if the `header` prop is provided.
    * Renders the PrimeVue `<Checkbox v-bind="$attrs" :inputId="inputId" ... />`, passing the `$attrs` and the direct
      `inputId` prop.
    * Renders an optional `<label>` linked to the `inputId` if the `label` prop is provided.

<!-- ```vue
// Checkbox.vue implementation
<template>
  <div :class="classs">
    <span v-if="header">{{ header }}</span>
    <div class="flex flex-row gap-2">
      <Checkbox
        :inputId="inputId" 
        :name="`${component.model.form}.${component.model.field}`" // Generates name
        v-bind="$attrs" /> // Pass v-model, binary, value, disabled etc.
      <label v-if="label" :for="inputId">{{ label }}</label>
    </div>
  </div>
</template>

<script>
import Checkbox from 'primevue/checkbox'
export default {
  // ... name, components ...
  inheritAttrs: false, // Apply $attrs only to <Checkbox>, not root div
  props: {
    component: Object, // Needed for model info for name generation
    header: String,
    label: [Array, String, Object],
    inputId: String,
    class: String, // For the wrapper div
  },
  // ... data ...
}
</script>
``` -->

## JSON Configuration Structure

<!-- ```json
{
  "type": "Checkbox",       // Component type
  "inputId": "unique-id",   // Required: ID for the input, used by label
  "model": {                // Required: Data binding info for VModel wrapper
    "form": "settingsForm", 
    "field": "enableNotifications" 
  },
  "label": "Enable Notifications", // Optional: Label rendered by wrapper
  "header": "Preferences",       // Optional: Header text above checkbox
  "class": "mb-4",             // Optional: Class for the wrapper div
  "props": {                // Optional: Attributes for the underlying <p-checkbox>
    "binary": true,         // e.g., For boolean binding
    "disabled": false,
    "value": "someValue"    // e.g., Used if binary=false and model field is array
    // ... other valid <p-checkbox> attributes (name, readonly etc.)
  }
}
``` -->

- `type`: (String, Required) Must be `"Checkbox"`.
- `inputId`: (String, **Required**) Unique ID for the checkbox input, crucial for the label's `for` attribute.
- `model`: (Object, **Required**) Defines data binding for `@VModel.md`.
    - `form`: (String, Required) Form ID in `FormManager`.
    - `field`: (String, Required) Field name in `FormManager`. Holds boolean (if `props.binary: true`) or array (if
      `props.binary: false`).
- `label`: (String, Optional) If provided, the wrapper renders a `<label>` tag next to the checkbox.
- `header`: (String, Optional) If provided, the wrapper renders text above the checkbox.
- `class`: (String, Optional) CSS classes applied to the main `div` wrapper of the component.
- `props`: (Object, Optional) Contains attributes passed via `$attrs` to the underlying `<p-checkbox>`.
    - `binary`: (Boolean, Optional) Default `false`. If `true`, binds to a boolean. If `false`, binds to an array.
    - `value`: (Any, Optional) Required if `binary` is `false`. The value added/removed from the model array.
    - `name`: (String, Optional) HTML `name` attribute.
    - `disabled`, `readonly`, etc.: Other valid PrimeVue Checkbox props.

## Usage Examples (JSON)

<!-- ```json
// Example 1: Binary Checkbox with internal label
{
  "type": "Checkbox",
  "inputId": "termsCheckbox",
  "model": {
    "form": "termsForm",
    "field": "acceptedTerms" // Stores true or false
  },
  "label": "I accept the terms and conditions",
  "props": {
    "binary": true // Crucial for boolean binding
  }
}

// Example 2: Checkbox Group (multiple selections into an array)
{
  "type": "div", // Example layout
  "props": { "class": "flex flex-col gap-2" }, 
  "children": [
    {
      "type": "Checkbox",
      "inputId": "prefEmail",
      "model": {
        "form": "prefsForm",
        "field": "selectedPrefs" // Binds to an array
      },
      "label": "Email Updates",
      "props": {
        "name": "preferences", // Group name
        "value": "email" // Value added to array when checked
      }
    },
    // ... other checkboxes for SMS, Push with different inputId and value ...
    {
      "type": "Checkbox",
      "inputId": "prefSMS",
      "model": {
        "form": "prefsForm",
        "field": "selectedPrefs"
      },
      "label": "SMS Notifications",
      "props": {
        "name": "preferences",
        "value": "sms"
      }
    }
  ]
}

// Example 3: Using external Label component
{
  "type": "div",
  "props": { "class": "flex items-center" },
  "children": [
    {
      "type": "Checkbox",
      "inputId": "weeklyNL", // ID is still required
      "model": {
        "form": "newsletterForm",
        "field": "subscribedWeekly"
      },
      "props": {
        "binary": true
        // No 'label' prop here
      }
    },
    {
      "type": "Label", // Assumes Label component
      "props": {
        "for": "weeklyNL", // Links to Checkbox inputId
        "class": "ml-2", // Margin for spacing
        "content": "Subscribe to Weekly Newsletter"
      }
    }
  ]
}
``` -->

## Dependencies

- `primevue/checkbox`: The underlying PrimeVue component.
- `@VModel.md`: Parent wrapper component for `v-model`.
- `@FormManager.md`: For data state.

<!-- mirror-status: outdated -->
<!-- source-size: 981 -->

