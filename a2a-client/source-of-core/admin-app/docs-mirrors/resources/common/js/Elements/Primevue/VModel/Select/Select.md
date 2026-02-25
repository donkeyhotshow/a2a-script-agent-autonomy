# Select.vue (VModel/Select)

**Source:** `resources/common/js/Elements/Primevue/VModel/Select/Select.vue`

**(Note:** This component dynamically wraps PrimeVue `<p-dropdown>`, `<p-multiselect>`, or `<p-listbox>` based on
`component.attrs.type`. However, primary usage seems geared towards `<p-dropdown>` based on the name and typical
`Select` component behavior. Documentation focuses on the Dropdown case.)

## Purpose

A wrapper primarily for the PrimeVue `<p-dropdown>` component (though it can render others), used within forms managed
by @docs/ui/resources/managers/FormManager.md. Allows users to select a single item from a list presented in an overlay
dropdown.

## Rendering

- Dynamically renders `<p-dropdown>`, `<p-multiselect>`, or `<p-listbox>` based on `component.attrs.type` (defaults to
  `<p-dropdown>` if type is missing or 'dropdown').
- Uses `v-bind="$attrs"` to pass down attributes like `options`, `optionLabel`, `optionValue`, `placeholder`, `filter`,
  `showClear`, `disabled`.
- Binds `v-model` to the appropriate data field within `@docs/ui/resources/managers/FormManager.md`'s state, using the
  `form` and `field` specified in the `component.model` object.
- Can display a label using the separate @Label.md component.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.model`: (Object, Required) Defines the data binding to `@docs/ui/resources/managers/FormManager.md`. _(
      Validated by: @docs/ui/resources/managers/FormManager.md)_
        - `form`: (String, Required) The ID (`formName`) of the form in `FormManager`.
        - `field`: (String, Required) The field name (`fieldName`) in `formData` for the selected value.
    - `component.attrs`: (Object, Required)
        - `options`: (Array | Object, Required) An array of options to display, or an operation object (e.g.,
          `{ "type": "operation", "action": "include", "source": "..." }`) to dynamically load options. _(Validated
          by: `storage/aiInstaller/sakai-input/forms/select-form.json`)_
        - `type`: (String, Optional, default: 'dropdown') Determines which PrimeVue component to render ('dropdown', '
          multiselect', 'listbox').
        - Key props for the underlying component (e.g., `<p-dropdown>`) like `optionLabel` (_Validated by code_),
          `optionValue`, `placeholder` (_Validated by code_), `filter`, `showClear`, `disabled` are passed here. _(
          Partially validated by code, others assumed standard passthrough)_

## Data Binding (`v-model`)

- Connects directly to `FormManager.forms[component.model.form].data[component.model.field]`. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- Stores the single selected option value (when rendering as Dropdown or Listbox).

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard and correct `model` structure. Focuses on the common '
> dropdown' usage (`type: "Select"`). Verify component mapping and data sources (`options`).

<!-- ```json
// Example 1: Basic Select/Dropdown with Dynamic Options (Based on select-form.json)
{
  "type": "Select", // Validated Type
  "model": {
    "form": "addressForm",
    "field": "selectedCity" // Will hold city code
  },
  "attrs": {
    // type: "dropdown" is implicit default
    "options": { // Dynamic options loading (Validated)
      "type": "operation",
      "action": "include",
      "source": "layout/test-data/select-city" // Example source path
    },
    "optionLabel": "name", // Validated
    "optionValue": "code", // Assumed prop for binding value
    "placeholder": "Select a City", // Validated
    "filter": true, // Common prop
    "showClear": true // Common prop
  }
}
``` -->

<!-- ```json
// Example 2: Select/Dropdown with Static Object Options
{
  "type": "Select", // Validated Type
  "model": {
    "form": "statusForm",
    "field": "currentStatus" // Will hold 'active' or 'inactive'
  },
  "attrs": {
    "options": [
      { "label": "Active User", "value": "active" },
      { "label": "Inactive User", "value": "inactive" }
    ],
    "optionLabel": "label", // Validated pattern
    "optionValue": "value", // Bind the 'value' property
    "placeholder": "Select Status", // Validated
    "filter": false
  }
}
``` -->

<!-- ```json
// Example 3: With Label (Using corrected type and layout components)
{
  "type": "Column", // Assumes @Column.md exists
  "attrs": { "class": "field col-12 md:col-6" },
  "children": [
    {
      "type": "Label", // Assumes @Label.md exists
      "attrs": { "for": "countrySelect" },
      "children": [{ "type": "Text", "props": { "content": "Select Country" } }] // Assumes @Text.md exists
    },
    {
      "type": "Select", // Validated Type
      "model": {
        "form": "locationForm",
        "field": "countryCode"
      },
      "attrs": {
        "id": "countrySelect", // For label association
        "options": "{{ DataSources.countries }}", // Example dynamic source (syntax needs validation)
        "optionLabel": "name",
        "optionValue": "isoCode",
        "placeholder": "Choose...",
        "filter": true
      }
    }
  ]
}
``` -->

## Internal Logic

- Retrieves `formData` from `@docs/ui/resources/managers/FormManager.md` based on `component.model.form`.
- Uses computed properties (`componentAttrs`, `renderComponentType`) to determine which PrimeVue component (`Dropdown`,
  `MultiSelect`, `Listbox`) to render based on `component.attrs.type`.
- The `VModel.vue` wrapper likely handles accessing `formData[component.model.field]` for the component's internal
  `v-model`.
- Renders the chosen component using `<component :is="renderComponentType" v-bind="componentAttrs" v-model="..." />` (
  where `v-model` links to the FormManager field).

## Dependencies

- `primevue/dropdown`: The underlying PrimeVue component (default).
- `primevue/multiselect`: Optional underlying component.
- `primevue/listbox`: Optional underlying component.
- `@/State/FormManager`: Essential for data binding and state management. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_

// --- MultiSelect Example Removed ---
// Documentation for MultiSelect indicated it doesn't follow the VModel pattern.
// No verified examples of MultiSelect using VModel/FormManager found.

**Listbox:**

> **Warning:** The example below uses `type: "Listbox"`. However, as noted above, the `component-map.json` mapping for
`"listbox"` does not point to this `VModel/Select.vue` wrapper. This example likely requires correction or represents a
> different implementation pattern for binding Listboxes within `FormManager`.

```json
{
  "type": "Listbox", // Type likely incorrect for this VModel wrapper
//  "type": " Listbox", // This line is redundant now
  "props": { "vAddress": "settingsForm.theme", "label": "Theme" },
  "model": { "form": "settingsForm", "field": "theme" },
  "attrs": {
    "options": ["Light", "Dark", "System"],
    "class": "w-full"
  }
}
``` 

<!-- mirror-status: outdated -->
<!-- source-size: 249 -->

