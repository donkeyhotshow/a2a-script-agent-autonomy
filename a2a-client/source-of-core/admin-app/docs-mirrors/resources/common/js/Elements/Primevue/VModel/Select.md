# Select.vue (VModel Wrapper)

**Source:** `resources/common/js/Elements/Primevue/VModel/Select.vue`

> **⚠️ WARNING: Unverified Examples ⚠️**
>
> Examples have not been verified against the current codebase.

## Purpose

This component wraps various PrimeVue selection components (`Dropdown`, `MultiSelect`, `Listbox`) for use within forms
managed by [`FormManager`](../../../managers/form/formManager.md). It handles the dynamic rendering of the correct
component based on `component.type`, data binding (`v-model`), label generation, and error display.

## Rendering

- Determines the specific component to render (`Dropdown`, `MultiSelect`, or `Listbox`) based on `component.type`.
- Renders a container `<div>` (or `<span>` if `component.props.inline` is true) with class `field`.
- Optionally renders a `<label>`:
    - Associated with the input using the `for` attribute (value is `component.props.vAddress`).
    - Label text comes from `component.props.label`.
    - Includes a required indicator (`<span class="text-red-500"> *</span>`) if `component.attrs.required` is true.
- Renders the selected PrimeVue component (`<p-dropdown>`, `<p-multiselect>`, or `<p-listbox>`).
    - Binds `v-model` to the appropriate field in [`FormManager`](../../../managers/form/formManager.md)'s data model (
      `hub.formManager.data[formName][fieldName]`).
    - Sets the `id` attribute to `component.props.vAddress`.
    - Applies `aria-describedby` pointing to the error message element (`errorMessageId`).
    - Adds the `p-invalid` class if there's an error for this field in `FormManager`.
    - Passes down attributes from `component.attrs` (e.g., `options`, `optionLabel`, `optionValue`, `placeholder`,
      `filter`, `disabled`, `class`, `style`, `pt`) using `v-bind`.
    - Passes the `component` prop itself down to the specific rendered component.
- Optionally renders a `<small>` tag for error messages:
    - `id` matches the `aria-describedby` value (`errorMessageId`).
    - Displays the error message from `hub.formManager.errors[formName][fieldName]` if it exists.
    - Has the class `p-error`.

## Props

- `component`: (Object, Required) The JSON object describing the select field.
    - `component.type`: (String, Required) Determines the component to render (`Dropdown`, `MultiSelect`, `Listbox`).
    - `component.model`: (Object, Required) Defines the form and field for data binding.
        - `model.form`: (String, Required) The `vAddress` of the parent `Form` component.
        - `model.field`: (String, Required) The name of the field within the form's data model.
    - `component.props`: (Object, Optional)
        - `props.vAddress`: (String, Required) Unique identifier for this component, used for `id`, label `for`, and
          error lookup.
        - `props.label`: (String, Optional) Text for the associated `<label>`.
        - `props.inline`: (Boolean, Optional) If true, renders the container as a `<span>` instead of a `<div>`.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the underlying PrimeVue component (e.g.,
      `options`, `optionLabel`, `optionValue`, `placeholder`, `filter`, `disabled`, `required`, `class`, `style`, `pt`).
      **Crucially, `options` is required for the select components.**

## Data Binding & Error Handling

- The `v-model` directive provides two-way binding with [`FormManager`](../../../managers/form/formManager.md)'s data.
- The component checks `hub.formManager.errors[formName][fieldName]` to determine if an error exists.
- If an error exists, the `p-invalid` class is applied to the input, and the error message is displayed below it.

## Usage (JSON Example)

**Note:** The `type` field used in module JSON definition is determined by the mapping in [
`storage/aiCore/component-map.json`](../../../../../storage/aiCore/component-map.json). Based on this file:

* For Dropdowns, use `"Select"`.
* For MultiSelects, use `"MultiSelect"`.
* For Listboxes, the mapping (`"listbox": "Component"`) currently points to the generic `Component` renderer, not this
  `VModel` wrapper (`Select.vue`). Therefore, using `"Listbox"` with this specific wrapper is likely incorrect. Please
  verify the correct implementation pattern for Listbox components requiring `v-model` binding within `FormManager`.

**Dropdown:**

```json
{
  "type": "Select", // Or potentially just "Dropdown" or "Select"
  "vAddress": "productForm.category",
  "props": {
    "label": "Category"
  },
  "model": { "form": "productForm", "field": "category" },
  "attrs": {
    "options": [
      { "name": "Electronics", "code": "ELEC" },
      { "name": "Clothing", "code": "CLTH" },
      { "name": "Home Goods", "code": "HOME" }
    ],
    "optionLabel": "name",
    "optionValue": "code", // Store 'code' in the model
    "placeholder": "Select a Category",
    "required": true,
    "class": "w-full md:w-14rem"
  }
}
```

**MultiSelect:**

```json
{
  "type": "VModel/Select", // Or potentially just "MultiSelect"
  "type": " MultiSelect", // Specify MultiSelect
  "props": { "vAddress": "userForm.roles", "label": "Roles" },
  "model": { "form": "userForm", "field": "roles" }, // Expects 'roles' to be an array
  "attrs": {
    "options": ["Admin", "Editor", "Viewer"],
    "placeholder": "Assign Roles",
    "filter": true,
    "display": "chip",
    "class": "w-full"
  }
}
```

**Listbox:**

```json
{
  "type": "VModel/Select", // Or potentially just "Listbox"
  "type": " Listbox", // Specify Listbox
  "props": { "vAddress": "settingsForm.theme", "label": "Theme" },
  "model": { "form": "settingsForm", "field": "theme" },
  "attrs": {
    "options": ["Light", "Dark", "System"],
    "class": "w-full"
  }
}
```

## Internal Logic

- Dynamically imports and selects the component (`Dropdown`, `MultiSelect`, `Listbox`) based on `component.type`.
- Uses computed properties (`formName`, `fieldName`, `error`, `errorMessageId`, `isInvalid`, `containerElement`) to
  manage state, extract data, and determine rendering logic.
- Uses a computed property (`modelValue`) with a getter and setter to interact with `FormManager`'s data and error
  stores.

## Dependencies

- `primevue/dropdown`, `primevue/multiselect`, `primevue/listbox`: The core PrimeVue components (dynamically loaded).
- [`FormManager`](../../../managers/form/formManager.md): (via `hub`) Used for data storage/retrieval and error
  checking.
- Parent: `../VModel.vue` (Typically provides the `component` prop).

<!-- mirror-status: outdated -->
<!-- source-size: 738 -->

