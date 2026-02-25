# Textarea Component (`Textarea.vue`)

**Source:** `resources/common/js/Elements/Primevue/VModel/Input/Textarea.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/01/components/Textarea.json`

**Underlying Component:** [PrimeVue Textarea](https://primevue.org/textarea/)

**Wrapper Chain:** `@RenderJson.md` -> `@Presets.md` -> `@VModel.md` -> `@Input.md` -> `Textarea.vue`

## Purpose

Provides a multi-line text input field, integrated with the application's form management (`@FormManager.md`) via the
`@VModel.md` wrapper. This component itself is a minimal wrapper around the PrimeVue `<Textarea>`.

## Rendering Flow & Data Binding

1. **JSON Configuration:** Define the `Textarea` in JSON with `type: "Textarea"`, data binding via
   `model: { form: "...", field: "..." }`, and standard textarea attributes within `props: { ... }` (e.g.,
   `placeholder`, `rows`, `cols`, `autoResize`).
2. **`@VModel.md` Wrapper:** Reads the `model` object to set up `v-model` with `@FormManager.md`.
3. **Props Handling:** `@VModel.md` (or `@Input.md`) reads the `props` object from JSON.
4. **Attribute Passing (`$attrs`):** Props and `v-model` handlers are passed down the wrapper chain via `$attrs`.
5. **`Textarea.vue` Execution:** Receives attributes and `v-model` via `$attrs`.
6. **Final Render:** Renders PrimeVue `<Textarea v-bind="$attrs" />`, applying the `v-model` and attributes from the
   JSON `props`.

<!-- ```vue
// Textarea.vue implementation - receives everything via $attrs
<template>
  <Textarea v-bind="$attrs" />
</template>

<script>
import Textarea from 'primevue/textarea'
export default {
  name: 'CustomTextarea', // Or appropriate name
  components: { Textarea },
  props: {
    // Note: 'component' prop exists but is NOT used for props/attrs here.
    // Those are passed down via $attrs from the VModel/Input wrapper.
    component: Object, 
  },
}
</script>
``` -->

## JSON Configuration Structure

<!-- ```json
{
  "type": "Textarea",       // Component type
  "model": {                // Required: Data binding info for VModel wrapper
    "form": "feedbackForm", 
    "field": "comments"    
  },
  "props": {                // Optional: Attributes for the underlying <p-textarea>
    "inputId": "commentsArea", // Recommended for accessibility
    "placeholder": "Enter comments",
    "rows": 5,
    "cols": 30,
    "autoResize": true,
    "disabled": false
    // ... other valid <p-textarea> attributes (class, style, maxlength etc.)
  }
}
``` -->

- `type`: (String, Required) Must be `"Textarea"`.
- `model`: (Object, **Required**) Defines data binding for `@VModel.md`.
    - `form`: (String, Required) Form ID in `FormManager`.
    - `field`: (String, Required) Field name in `FormManager`.
- `props`: (Object, Optional) Contains standard attributes for the underlying PrimeVue `<Textarea>` component. These
  will be passed down via `$attrs`.
    - Include attributes like `inputId` (highly recommended for labels/accessibility), `placeholder`, `rows`, `cols`,
      `autoResize`, `disabled`, `readonly`, `maxlength`, `class`, `style`, etc. Refer to the PrimeVue documentation for
      the full list.

## Usage Examples (JSON)

<!-- ```json
// Example 1: Basic Textarea for comments
// Source: Adapted from install-modules/aiInstaller/primary-form/templates/parts/program/requestToChat.json
{
  "type": "Textarea",
  "model": {
    "form": "ProgramControl",
    "field": "question"
  },
  "props": {
    "inputId": "questionInput", // Added for clarity
    "placeholder": "Задать вопрос...",
    "autoResize": true,
    "rows": 2,
    "class": "w-full h-12 text-left"
  }
}

// Example 2: Textarea within a FloatLabel
// Source: Adapted from install-modules/aiInstaller/landing-main-page/sections/contact/contact-content-section.json
{
  "type": "FloatLabel", // Assumes FloatLabel wrapper
  "props": {
    "class": "relative"
  },
  "children": [
    {
      "type": "Textarea",
      "model": {
        "form": "contactForm",
        "field": "message"
      },
      "props": {
        "inputId": "contactMessageArea", 
        "rows": 4,
        "cols": 30,
        "class": "w-full text-area-input"
      }
    },
    {
      "type": "Label", // Assumes Label component
      "props": { 
        "for": "contactMessageArea",
        "content": "Ваше сообщение",
        "class": "label-text"
       }
    }
  ]
}
``` -->

## Dependencies

- `primevue/textarea`: The underlying PrimeVue component.
- `@VModel.md` / `@Input.md`: Parent wrapper components handling `v-model` and attribute passing.
- `@FormManager.md`: Essential for data binding state.

<!-- mirror-status: outdated -->
<!-- source-size: 260 -->

