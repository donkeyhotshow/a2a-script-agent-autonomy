# VModel.vue (Main Form Element Wrapper)

**Source:** `resources/common/js/Elements/Primevue/VModel.vue`

## Purpose

`VModel.vue` is the primary wrapper component responsible for integrating various form input elements (like `InputText`,
`Select`, `Checkbox`, `Password`, etc.) with the [`FormManager`](../../managers/form/formManager.md). It handles the
common logic required for form elements within the JSON UI system, including:

* **Data Binding:** Establishes the `v-model` connection between the input element and the correct field within the
  `FormManager`'s data store.
* **Error Handling:** Checks `FormManager` for validation errors associated with the field and displays the error
  message below the input, applying necessary ARIA attributes (`aria-describedby`) and CSS classes (`p-invalid`) to the
  input.
* **ID Generation & Prop Forwarding:** Generates a unique `inputId` (based on `props.vAddress`) and passes it, along
  with the `component.props.label` and other necessary attributes/`v-model` handlers (`$attrs`), down to the appropriate
  intermediate wrapper.
* **Layout:** Provides the basic field structure (e.g., a `div` with class `field`).
* **Dynamic Wrapper Rendering:** Determines which specific intermediate input wrapper (e.g., `@Input.md`, `@Select.md`,
  `@Checkbox.md`) to render based on the component `type` provided in the JSON configuration and potentially the mapping
  in <!-- [`storage/aiCore/component-map.json`](../../../../../../storage/aiCore/component-map.json) -->.

Essentially, `VModel.vue` acts as the central hub for any form element that needs two-way data binding managed by
`FormManager`.

## Core Props & Data (`component` Object)

`VModel.vue` primarily interacts with these parts of the `component` configuration object passed to it:

* `component.type`: (String, Required) Determines which intermediate wrapper to load (e.g., `"Input"`, `"Select"`,
  `"Checkbox"`).
* `component.model`: (Object, **Required**) Defines the binding to `FormManager`.
    * `model.form`: (String, Required) Form identifier.
    * `model.field`: (String, Required) Field name.
    * *(Specific components like Select might have additional keys like `options`, `optionLabel`, etc. within `model`)*.
* `component.props`: (Object, Optional) Contains properties for both `VModel.vue`'s logic and attributes to be passed
  down.
    * `props.vAddress`: (String, **Required**) Used by `VModel.vue` to generate a unique `inputId` passed down to the
      intermediate wrapper (which uses it for the input's `id` and the label's `for`).
    * `props.label`: (String, Optional) The text for the label. **Passed down** to the intermediate wrapper (like
      `@Input.md`), which is responsible for rendering the actual `<label>` tag.
    * `props.inline`: (Boolean, Optional) If `true`, renders the main container element as a `<span>` instead of a
      `<div>`. Defaults to `false` (`<div>`).
    * *Other Props*: All other properties within `props` (e.g., `placeholder`, `class`, `disabled`, `filter`, `rows`,
      `binary`) are passed down via `$attrs` to the intermediate wrapper and ultimately to the final PrimeVue component.
* `component.name`: (String, Optional) Often present for identification, potentially used internally.

## Rendering Flow & Attribute Passing

1. **`VModel.vue` Renders:** It sets up the main field container (`div` or `span`) and prepares for data binding using
   `component.model`.
2. **ID Generation:** It generates a unique `inputId` based on `component.props.vAddress`.
3. **Error Check:** It checks `hub.formManager.errors` for the corresponding `model.form` and `model.field`.
4. **Dynamic Wrapper Loading:** It determines the correct intermediate wrapper (e.g., `Input.vue`, `Select.vue`) based
   on `component.type` (potentially using `component-map.json`).
5. **Prop/Attr Passing:** It renders the chosen intermediate wrapper, passing:
    * `component`: The full component configuration object.
    * `inputId`: The generated unique ID.
    * `v-model` handlers via `$attrs`.
    * All other properties from `component.props` (excluding `vAddress`, `label`, `inline` which it consumed) via
      `$attrs`.
6. **Intermediate Wrapper Renders:** The intermediate wrapper (e.g., `@Input.md`) then renders the actual `<label>` (
   using the passed `inputId` and `component.props.label`) and the final PrimeVue component (e.g., `@InputText.md`),
   passing the `id` and remaining `$attrs`.
7. **Error Display:** `VModel.vue` renders the error message below the wrapper if an error exists in `FormManager`.

**Example JSON Structure (Illustrative):**

<!-- ```json
{
  "type": "InputText", // Determines intermediate wrapper (e.g., Input.vue)
  "name": "usernameField", 
  "model": { 
    "form": "userProfile",
    "field": "username"
  },
  "props": {           
    // Consumed by VModel.vue:
    "vAddress": "profile_username", // Used to generate inputId
    "label": "Username",          // Passed down to Input.vue for <label>
    // Passed down via $attrs:
    "placeholder": "Enter your username",
    "class": "w-full",
    "disabled": false 
  }
}
``` -->

## Dependencies

-   <!-- [`FormManager`](../../managers/form/formManager.md): Essential for data storage, retrieval, and error checking. -->
- Intermediate Wrappers (Dynamically Loaded based on `type`):
    - `@Input.md`
    - `@Select.md`
    - `@Checkbox.md`
    - *(Others as needed)*
-   <!-- [`storage/aiCore/component-map.json`](../../../../../../storage/aiCore/component-map.json): Potentially used to map simple `type` strings to the correct VModel wrapper paths. --> 

<!-- mirror-status: outdated -->
<!-- source-size: 1697 -->

