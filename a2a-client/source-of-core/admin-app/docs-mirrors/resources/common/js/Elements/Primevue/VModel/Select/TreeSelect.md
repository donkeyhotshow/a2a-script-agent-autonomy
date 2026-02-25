# TreeSelect.vue (VModel/Select)

**Source:** `resources/common/js/Elements/Primevue/VModel/Select/TreeSelect.vue`

## Purpose

A wrapper for the PrimeVue `<p-treeselect>` component, used within forms managed by
@docs/ui/resources/managers/FormManager.md. Allows users to select single or multiple items from a hierarchical tree
structure presented in an overlay dropdown.

## Rendering

- Renders a PrimeVue `<p-treeselect>` component.
- Uses `v-bind="$attrs"` to pass down attributes like `options`, `placeholder`, `selectionMode` ('single', 'multiple', '
  checkbox'), `disabled`.
- Binds `v-model` to the appropriate data field within `@docs/ui/resources/managers/FormManager.md`'s state, using the
  `form` and `field` specified in the `component.model` object.
- Can display a label using the separate @Label.md component.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.model`: (Object, Required) Defines the data binding to `@docs/ui/resources/managers/FormManager.md`. _(
      Validated by: @docs/ui/resources/managers/FormManager.md)_
        - `form`: (String, Required) The ID (`formName`) of the form in `FormManager`.
        - `field`: (String, Required) The field name (`fieldName`) in `formData` for the selected node(s).
    - `component.attrs`: (Object, Required)
        - `options`: (Array | String, Required) An array representing the tree structure (nodes typically have `key`,
          `label`, `children` properties) or a string key referencing options in `StateManager`. _(Validated
          by: `storage/aiInstaller/sakai-input/sections/1-section copy.json` - expects dynamic data)_.
        - Key `<p-treeselect>` props like `placeholder` (_Validated by code_), `selectionMode` ('single', 'multiple', '
          checkbox'), `disabled` are passed here. _(Partially validated by code, others assumed standard passthrough)_

## Data Binding (`v-model`)

- Connects directly to `FormManager.forms[component.model.form].data[component.model.field]`. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- Stores the selected node data. The exact format depends on `attrs.selectionMode`:
    - 'single': Stores the key of the selected node.
    - 'multiple' or 'checkbox': Stores an object where keys are the selected node keys and values are booleans (e.g.,
      `{ '0-1': true, '1-0': true }`).

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard and correct `model` structure. Assumes data source
> provides data in the required hierarchical format. Verify component mapping (`type: "TreeSelect"`).

<!-- ```json
// Example 1: Basic TreeSelect (Based on sakai-input usage)
{
  "type": "TreeSelect", // Validated Type
  "model": {
    "form": "categoryForm",
    "field": "selectedNodeKey" // Will likely hold a single key with default selectionMode
  },
  "attrs": {
    "options": "{{ DataSources.treeSelectNodes }}", // Dynamic options loading (Validated pattern)
    "placeholder": "Select Item" // Validated
    // selectionMode defaults to 'single'
  }
}
``` -->

<!-- ```json
// Example 2: Checkbox Selection Mode
{
  "type": "TreeSelect", // Validated Type
  "model": {
    "form": "permissionsForm",
    "field": "selectedPermissions" // Will hold an object like { 'read': true, 'write-users': true }
  },
  "attrs": {
    "options": "{{ DataSources.permissionTree }}",
    "placeholder": "Select Permissions",
    "selectionMode": "checkbox",
    "display": "chip" // Optional: display selections as chips
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
      "attrs": { "for": "locationTreeSelect" },
      "children": [{ "type": "Text", "props": { "content": "Select Location" } }] // Assumes @Text.md exists
    },
    {
      "type": "TreeSelect", // Validated Type
      "model": {
        "form": "assetForm",
        "field": "locationNode"
      },
      "attrs": {
        "id": "locationTreeSelect", // For label association
        "options": "{{ DataSources.locations }}",
        "placeholder": "Choose..."
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
- Renders `<p-treeselect v-bind="componentAttrs" v-model="..." />` (where `v-model` links to the FormManager field).

## Dependencies

- `primevue/treeselect`: The underlying PrimeVue component.
- `@/State/FormManager`: Essential for data binding and state management. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_

<!-- mirror-status: outdated -->
<!-- source-size: 364 -->

