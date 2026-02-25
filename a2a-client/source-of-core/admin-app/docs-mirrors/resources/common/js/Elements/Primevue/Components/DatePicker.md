# DatePicker.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/DatePicker.vue`

## Purpose

Wraps the PrimeVue [`<p-datepicker>`](https://primevue.org/datepicker/) component to provide a calendar-based date
selection input.

**Note:** This component appears to be a simple wrapper passing attributes directly via `$attrs`. It does **not** seem
to integrate with `FormManager` via the `VModel.vue` pattern like other input components (InputText, Select, etc.). For
form-bound date selection, a different wrapper (potentially within the `VModel/` directory) might be needed.

## Rendering

- Renders the core `<p-datepicker>` component.
- Uses `v-bind="$attrs"` to pass down all attributes from the parent configuration (`component.attrs`) directly to the
  `<p-datepicker>` component. This includes essential props like:
    - `modelValue`: The selected date value (expects a `Date` object or compatible string).
    - `dateFormat`: (String) Format of the date string (e.g., 'mm/dd/yy').
    - `inline`: (Boolean) Display the calendar inline or as a popup.
    - `showIcon`: (Boolean) Display a calendar icon trigger.
    - `minDate`, `maxDate`: (Date) Restrict selectable dates.
    - `selectionMode`: (String) 'single', 'multiple', or 'range'.
    - `placeholder`, `disabled`, `readonly`, `class`, `style`, etc.
- Listens for the `update:modelValue` event and emits it upwards as `onUpdateModelValue`.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the DatePicker.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the `<p-datepicker>` component (e.g.,
      `{ "dateFormat": "dd.mm.yy", "showIcon": true, "selectionMode": "single", "placeholder": "Select a date" }`). _(
      Validated Usage for config attrs: `storage/aiInstaller/sakai-input/forms/datepicker-form.json`)_
    - **Important:** A `modelValue` attribute containing the date value needs to be passed via `attrs` and managed by
      the parent context (not `FormManager` with this specific wrapper).

## Events Emitted

- `onUpdateModelValue(newDate)`: Emitted when the date selection changes.

## Usage (JSON Example)

> **Source:** Based on `storage/aiInstaller/sakai-input/forms/datepicker-form.json`.
> **⚠️ WARNING:** This wrapper uses `attrs` for configuration and requires external state management for `modelValue`.
> It does **not** integrate with `FormManager`.

<!-- ```json
{
  "type": "DatePicker", // Validated Type
  "attrs": { 
    // v-model equivalent - value must be managed externally (e.g., via reactive state)
    "modelValue": "{someReactiveState.selectedDate}", 
    // DatePicker configuration passed via attrs:
    "dateFormat": "yy-mm-dd",
    "placeholder": "Pick a Date", // Validated attr
    "showIcon": true, // Validated attr
    "class": "w-full md:w-1/4" // Validated attr
  }
}
``` -->

**Explanation:**

* This component requires external state management for the selected date, passed via `attrs.modelValue`.
* It does not use the standard `model: { form: ..., field: ... }` pattern.

## Internal Logic

- This is a very simple wrapper.
- It directly renders `<p-datepicker v-bind="$attrs" @update:modelValue="emit('onUpdateModelValue', $event)" />`.

## Dependencies

- `primevue/datepicker`: The core PrimeVue component.

## Props

- `component`: (Object, Required) The JSON object describing the component configuration (passed down from
  `Component.vue`).

*(All functional props for the underlying PrimeVue `DatePicker` are passed via `$attrs`)*

## Usage (JSON Example)

```json
{
  "type": "DatePicker", // Must match the component name in Component.vue
  "props": {
    "placeholder": "Select a Date",
    "dateFormat": "dd/mm/yy",
    "showIcon": true,
    // Note: For data binding, use VModel category instead:
    // "model": { "form": "myForm", "field": "eventDate" },
    // "label": "Event Date"
  }
}
```

**Important:** While this wrapper exists in the `Components` category, `DatePicker` usually requires `v-model` for data
binding. For proper form integration, define DatePicker components using the `VModel` category in your JSON, which will
ensure correct binding via `FormManager`.
<!-- mirror-status: outdated -->
<!-- source-size: 262 -->

