# Checkbox.vue (VModel Wrapper)

**Source:** `resources/common/js/Elements/Primevue/VModel/Checkbox.vue`

> **⚠️ WARNING: Unverified Examples ⚠️**
>
> Examples have not been verified against the current codebase.

## Purpose

This component wraps the PrimeVue `Checkbox` component (`<p-checkbox>`) specifically for use within forms managed by
`FormManager`. It handles data binding (`v-model`) and integrates with the form's state.

## Rendering

- Renders the PrimeVue `Checkbox` component (`<p-checkbox>`).
- Binds the checkbox's state (`v-model`) to the appropriate field in the `FormManager`'s data model, identified by
  `component.model.form` and `component.model.field`.
- Passes down attributes defined in the parent component's template or `component.attrs` to the underlying
  `<p-checkbox>` using `v-bind="component.attrs"`. This includes props like `inputId`, `name`, `value` (for the checked
  state), `binary`, `disabled`, `readonly`, `required`, `tabindex`, `trueValue`, `falseValue`, `pt`.
- Optionally renders a `<label>` associated with the checkbox if `component.props.label` is provided.
    - The `for` attribute of the label is linked to the `inputId` of the checkbox (defaults to
      `component.props.vAddress` if `component.attrs.inputId` is not set).
    - The label text is taken from `component.props.label`.
    - A CSS class (`ml-2`) is applied to the label for margin.

## Props

- `component`: (Object, Required) The JSON object describing the checkbox.
    - `component.model`: (Object, Required) Defines the form and field for data binding.
        - `model.form`: (String, Required) The `vAddress` of the parent `Form` component.
        - `model.field`: (String, Required) The name of the field within the form's data model.
    - `component.props`: (Object, Optional)
        - `props.vAddress`: (String, Required) Unique identifier for this component, used for error handling and
          potentially as a default `inputId`.
        - `props.label`: (String, Optional) Text for the associated `<label>`.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the `<p-checkbox>` component (e.g., `binary`,
      `disabled`, `value`, `inputId`, `class`, `style`).

## Data Binding

- The `v-model` directive connects the checkbox's checked state directly to `hub.formManager.data[formName][fieldName]`.
- By default, PrimeVue Checkbox uses `true`/`false`. If the `binary` prop is not set or set to `false`, it expects the
  `v-model` to be an Array, and the `value` prop (passed via `component.attrs.value`) determines what is added/removed
  from the array.
- Set `component.attrs.binary="true"` to bind directly to a boolean value instead of an array.

## Usage (JSON Example)

**Binary Checkbox (Boolean Binding):**

```json
{
  "type": "VModel/Checkbox",
  "props": {
    "vAddress": "myForm.acceptTerms", // Unique ID
    "label": "Accept Terms and Conditions"
  },
  "model": {
    "form": "myForm", // Form identifier
    "field": "acceptTerms" // Field name in form data
  },
  "attrs": {
    "binary": true, // Bind to true/false
    "inputId": "termsCheckbox",
    "required": true
  }
}
```

**Checkbox Group (Array Binding):**

```json
// In the Form's initial data: interests: []
{
  "type": "VModel/Checkbox",
  "props": { "vAddress": "profileForm.interestMusic", "label": "Music" },
  "model": { "form": "profileForm", "field": "interests" },
  "attrs": { "value": "Music" } // Value added to 'interests' array when checked
},
{
  "type": "VModel/Checkbox",
  "props": { "vAddress": "profileForm.interestArt", "label": "Art" },
  "model": { "form": "profileForm", "field": "interests" },
  "attrs": { "value": "Art" }
},
{
  "type": "VModel/Checkbox",
  "props": { "vAddress": "profileForm.interestSports", "label": "Sports" },
  "model": { "form": "profileForm", "field": "interests" },
  "attrs": { "value": "Sports" }
}
```

## Internal Logic

- Uses computed properties (`formName`, `fieldName`) to extract binding information from `component.model`.
- Uses a computed property (`modelValue`) with a getter and setter to interact with `FormManager`'s data store (
  `hub.formManager.data`).
- Calculates the `inputId` for the label association.

## Dependencies

- `primevue/checkbox`: The core PrimeVue component.
- `../FormManager.js`: (via `hub`) Used for data storage and retrieval.
- Parent: `../VModel.vue` (Typically provides the `component` prop).

<!-- mirror-status: outdated -->
<!-- source-size: 679 -->

