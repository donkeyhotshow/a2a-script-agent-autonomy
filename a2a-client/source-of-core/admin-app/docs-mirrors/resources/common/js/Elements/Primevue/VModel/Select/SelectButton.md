# SelectButton.vue (VModel/Select)

**Source:** `resources/common/js/Elements/Primevue/VModel/Select/SelectButton.vue`

## Purpose

A wrapper for the PrimeVue `<p-select-button>` component, used within forms managed by
@docs/ui/resources/managers/FormManager.md. Presents options as buttons, allowing single or multiple selections.

## Rendering

- Renders a PrimeVue `<p-select-button>` component.
- Uses `v-bind="$attrs"` to pass down attributes like `options`, `optionLabel`, `optionValue`, `optionDisabled`,
  `multiple`, `dataKey`, `disabled`.
- Binds `v-model` to the appropriate data field within `@docs/ui/resources/managers/FormManager.md`'s state, using the
  `form` and `field` specified in the `component.model` object.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.model`: (Object, Required) Defines the data binding to `@docs/ui/resources/managers/FormManager.md`. _(
      Validated by: @docs/ui/resources/managers/FormManager.md)_
        - `form`: (String, Required) The ID (`formName`) of the form in `FormManager`.
        - `field`: (String, Required) The field name (`fieldName`) in `formData` for the selected value(s).
    - `component.attrs`: (Object, Required)
        - `options`: (Array | String, Required) An array of options to display or a string key referencing options in
          `StateManager`. Options can be simple values or objects. _(Validated
          by: `storage/aiInstaller/sakai-input/elements/toggle.json`, string key usage assumed supported)_
        - Key `<p-select-button>` props like `optionLabel` (property of option object for label - _Validated
          by: `storage/aiInstaller/sakai-input/elements/toggle.json`_), `optionValue` (property for value),
          `optionDisabled` (property for disabled state), `multiple` (allow multiple selections), `dataKey` (unique key
          for objects), `disabled` are passed here. _(Validation based on PrimeVue standard prop passthrough)_

## Data Binding (`v-model`)

- Connects directly to `FormManager.forms[component.model.form].data[component.model.field]`. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- If `attrs.multiple` is false (default), stores the single selected option value.
- If `attrs.multiple` is true, stores an array of the selected option values.

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard and correct `model` structure. `multiple: true` usage is
> plausible but not directly validated by found code examples. Verify component mapping (`type: "SelectButton"`).

<!-- ```json
// Example 1: Single Selection (Based on toggle.json structure)
{
  "type": "SelectButton", // Validated Type
  "model": {
    "form": "configForm",
    "field": "themeMode" // Stores 'Light' or 'Dark'
  },
  "attrs": {
    "options": ["Light", "Dark"], // Validated usage pattern
    // Assumes default optionLabel/optionValue works for simple arrays
  }
}
``` -->

<!-- ```json
// Example 2: Multiple Selection with Object Options (Conceptual - multiple=true not code-validated)
{
  "type": "SelectButton", // Validated Type
  "model": {
    "form": "preferencesForm",
    "field": "selectedCategories" // Stores an array like ['tech', 'news']
  },
  "attrs": {
    "options": [ // Validated pattern
      { "name": "Technology", "code": "tech" },
      { "name": "News", "code": "news", "inactive": true },
      { "name": "Sports", "code": "sports" }
    ],
    "optionLabel": "name", // Validated by toggle.json
    "optionValue": "code", // Plausible PrimeVue prop
    "optionDisabled": "inactive", // Plausible PrimeVue prop
    "multiple": true, // Enable multiple selections (Plausible PrimeVue prop)
    "dataKey": "code" // Needed when optionValue is used (Plausible PrimeVue prop)
  }
}
``` -->

<!-- ```json
// Example 3: With Label (Using corrected type and layout components)
{
  "type": "Column", // Assumes @Column.md wrapper exists
  "attrs": { "class": "field col-12" },
  "children": [
    {
      "type": "Label", // Assumes @Label.md wrapper exists
      "attrs": { "class": "block mb-2" },
      "children": [{ "type": "Text", "props": { "content": "Payment Method" } }] // Assumes @Text.md exists
    },
    {
      "type": "SelectButton", // Validated Type
      "model": {
        "form": "paymentForm",
        "field": "paymentType"
      },
      "attrs": { "options": ["Credit Card", "PayPal", "Bank Transfer"] }
    }
  ]
}
``` -->

## Internal Logic

- Retrieves `formData` from `@docs/ui/resources/managers/FormManager.md` based on `component.model.form`.
- Uses computed properties (`componentAttrs`).
- The `VModel.vue` wrapper likely handles accessing `formData[component.model.field]` for the component's internal
  `v-model`.
- Renders `<p-select-button v-bind="componentAttrs" v-model="..." />` (where `v-model` links to the FormManager field).

## Dependencies

- `primevue/selectbutton`: The underlying PrimeVue component.
- `@/State/FormManager`: Essential for data binding and state management. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_

<!-- mirror-status: outdated -->
<!-- source-size: 272 -->

