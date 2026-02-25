# InputText Component (`InputText.vue`)

**Source:** `resources/common/js/Elements/Primevue/VModel/Input/InputText.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/01/components/InputText.json`

**Underlying Component:** [PrimeVue InputText](https://primevue.org/inputtext/)

**Wrapper Chain:** `@RenderJson.md` -> `@Presets.md` -> `@VModel.md` -> `@Input.md` -> `InputText.vue`

## Purpose

Provides a standard single-line text input field, integrated with the application's form management (`@FormManager.md`)
via the `@VModel.md` wrapper. This component itself is a minimal wrapper around the PrimeVue `<p-input-text>`.

## Rendering Flow & Data Binding

1. **JSON Configuration:** You define the `InputText` in your JSON structure, specifying `type: "InputText"`, the data
   binding via `model: { form: "...", field: "..." }`, and standard input attributes within `props: { ... }` (e.g.,
   `placeholder`, `type`, `disabled`).
2. **`@VModel.md` Wrapper:** This higher-level wrapper reads the `model` object to establish a `v-model` connection with
   the specified form and field in `@FormManager.md`.
3. **Props Handling:** `@VModel.md` (or potentially the intermediate `@Input.md` wrapper) reads the `props` object from
   your JSON.
4. **Attribute Passing (`$attrs`):** These props (along with the `v-model` handlers established by `VModel`) are passed
   down the wrapper chain using Vue's `$attrs` mechanism.
5. **`InputText.vue` Execution:** This final wrapper (`InputText.vue`) receives all necessary attributes and the
   `v-model` via `$attrs`.
6. **Final Render:** It renders the PrimeVue `<InputText v-bind="$attrs" />`, effectively applying the `v-model` and all
   attributes defined in your original JSON's `props` section to the underlying PrimeVue component.

<!-- ```vue
// InputText.vue implementation - receives everything via $attrs
<template>
  <InputText v-bind="$attrs" />
</template>

<script>
import InputText from 'primevue/inputtext'
export default {
  // ... name, components ...
  props: {
    // Note: 'component' prop exists but is NOT used for props/attrs here.
    // Those are passed down via $attrs from the VModel wrapper.
    component: Object, 
  },
}
</script>
``` -->

## JSON Configuration Structure

<!-- ```json
{
  "type": "InputText",      // Component type
  "model": {                // Required: Data binding info for VModel wrapper
    "form": "userProfile", 
    "field": "username"    
  },
  "props": {                // Optional: Attributes for the underlying <p-input-text>
    "inputId": "usernameInput", // Good practice for labels
    "type": "text",          // e.g., 'text', 'email', 'password'
    "placeholder": "Enter username",
    "disabled": false,
    "invalid": false 
    // ... other valid <p-input-text> attributes
  }
}
``` -->

- `type`: (String, Required) Must be `"InputText"`.
- `model`: (Object, **Required**) Defines data binding for the parent `@VModel.md` wrapper.
    - `form`: (String, Required) The ID (`formName`) of the form in `FormManager`.
    - `field`: (String, Required) The field name (`fieldName`) within the form's data.
- `props`: (Object, Optional) Contains standard attributes for the underlying PrimeVue `<p-input-text>` component. These
  will be passed down via `$attrs`.
    - Include attributes like `inputId`, `placeholder`, `type`, `disabled`, `invalid`, `class`, `style`, etc.

## Usage Examples (JSON)

<!-- ```json
// Example 1: Basic InputText for Username
{
  "type": "InputText", 
  "model": {
    "form": "userProfile",
    "field": "username"
  },
  "props": {
    "inputId": "usernameInput",
    "type": "text",
    "placeholder": "Username"
  }
}

// Example 2: Disabled InputText
{
  "type": "InputText",
  "model": {
    "form": "userProfile",
    "field": "userId"
  },
  "props": {
    "inputId": "userIdInput",
    "type": "text",
    "placeholder": "User ID",
    "disabled": true
  }
}

// Example 3: InputText for Email with a Label
// (Assumes Label component exists and renders its children)
{
  "type": "Label", 
  "props": { "for": "emailInput" },
  "children": [
    { 
      "type": "InputText",
      "model": {
        "form": "contactForm",
        "field": "email"
      },
      "props": {
        "inputId": "emailInput", 
        "type": "email",
        "placeholder": "your@email.com"
      }
    },
     { "type": "Span", "props": { "content": "Email Address" } }
  ]
}
``` -->

## Dependencies

- `primevue/inputtext`: The underlying PrimeVue component.
- `@VModel.md` / `@Input.md`: Parent wrapper components handling `v-model` and attribute passing.
- `@FormManager.md`: Essential for data binding state.

<!-- mirror-status: outdated -->
<!-- source-size: 384 -->

