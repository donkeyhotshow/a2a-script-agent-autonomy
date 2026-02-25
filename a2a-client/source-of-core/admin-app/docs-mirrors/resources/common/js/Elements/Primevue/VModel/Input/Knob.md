# Knob.vue (VModel/Input)

**Source:** `resources/common/js/Elements/Primevue/VModel/Input/Knob.vue`

## Purpose

A wrapper for the PrimeVue `<p-knob>` component, used within forms managed by
@docs/ui/resources/managers/FormManager.md. Allows users to select a numerical value using a circular dial.

## Rendering

- Renders a PrimeVue `<p-knob>` component.
- Uses `v-bind="$attrs"` to pass down attributes like `min`, `max`, `step`, `size`, `valueColor`, `rangeColor`,
  `textColor`, `strokeWidth`, `readonly`, `disabled`.
- Binds `v-model` to the appropriate data field within `@docs/ui/resources/managers/FormManager.md`'s state, using the
  `form` and `field` specified in the `component.model` object.
- Can display the value template inside the knob (passed via `attrs.valueTemplate`).

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.model`: (Object, Required) Defines the data binding to `@docs/ui/resources/managers/FormManager.md`. _(
      Validated by: @docs/ui/resources/managers/FormManager.md)_
        - `form`: (String, Required) The ID (`formName`) of the form in `FormManager`.
        - `field`: (String, Required) The field name (`fieldName`) in `formData` for the numerical value.
    - `component.attrs`: (Object, Optional)
        - Key `<p-knob>` props like `min` (_Validated by code_), `max` (_Validated by code_), `step` (_Validated by
          code_), `size`, `valueColor`, `rangeColor`, `textColor`, `strokeWidth`, `valueTemplate` (_Validated by code_),
          `readonly`, `disabled` are passed here. _(Partially validated by code, others assumed standard passthrough)_

## Data Binding (`v-model`)

- Connects directly to `FormManager.forms[component.model.form].data[component.model.field]`. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- Stores the numerical value selected via the knob.

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard and correct `model` structure. Verify component
> mapping (`type: "Knob"`).

<!-- ```json
// Example 1: Basic Knob (Based on knob-form.json)
{
  "type": "Knob", // Validated Type
  "model": {
    "form": "settingsForm",
    "field": "volumeLevel"
  },
  "attrs": {
    "min": 0, // Validated
    "max": 100, // Validated
    "step": 10, // Validated
    "size": 150, // Example size
    "valueColor": "SlateGray",
    "rangeColor": "MediumTurquoise",
    "valueTemplate": "{value}%" // Validated
  }
}
``` -->

<!-- ```json
// Example 2: With Label (Common Pattern)
{
  "type": "Column", // Assumes @Column.md exists
  "attrs": { "class": "field col-12 md:col-4 text-center" }, // Center align for knob
  "children": [
    {
      "type": "Label", // Assumes @Label.md exists
      // Label usually doesn't have a 'for' with knob, place it above/below
      "attrs": { "class": "block mb-2" }, 
      "children": [{ "type": "Text", "props": { "content": "Brightness" } }] // Assumes @Text.md exists
    },
    {
      "type": "Knob", // Validated Type
      "model": {
        "form": "displaySettings",
        "field": "brightness"
      },
      "attrs": { 
        "max": 100, // Validated 
        "valueTemplate": "{value}" // Example: Show raw value
      }
    }
  ]
}
``` -->

## Internal Logic

- Retrieves `formData` from `@docs/ui/resources/managers/FormManager.md` based on `component.model.form`.
- Uses computed properties (`componentAttrs`).
- The `VModel.vue` wrapper likely handles accessing `formData[component.model.field]` for the component's internal
  `v-model`.
- Renders `<p-knob v-bind="componentAttrs" v-model="..." />` (where `v-model` links to the FormManager field).

## Dependencies

- `primevue/knob`: The underlying PrimeVue component.
- `@/State/FormManager`: Essential for data binding and state management. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- May use @Label.md and @Text.md for external labeling.

<!-- mirror-status: outdated -->
<!-- source-size: 232 -->

