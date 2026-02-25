# InputGroup.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/InputGroup.vue`

## Purpose

A layout container component that wraps the PrimeVue `<p-input-group>` component. It's used to group an input element (
@InputText.md, @InputNumber.md, etc.) with related addons (@InputGroupAddon.md) or buttons (@Button.md) visually, often
appearing as a single connected unit.

## Rendering

- Renders a PrimeVue `<p-input-group>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-input-group>` tag.
- May receive classes like `p-inputgroup-fluid` via `component.props.class` to make the group expand. _(Validated
  by: `storage/aiInstaller/sakai-input/elements/inputgroup.json`)_
- Renders `component.children` inside the group using @Component.vue. Children should typically be a mix of inputs,
  addons, and buttons.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside the group (e.g., @InputGroupAddon.md,
      @InputText.md, @Button.md). _(Validated by: `storage/aiInstaller/sakai-input/elements/inputgroup.json`)_
    - `component.props`: (Object, Optional)
        - `class`: (String, Optional) Classes to apply, like `p-inputgroup-fluid`. _(Validated
          by: `storage/aiInstaller/sakai-input/elements/inputgroup.json`)_
    - `component.attrs`: (Object, Optional) Other attributes to apply to the `<p-input-group>` tag.

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard. Assumes child component wrappers (@InputGroupAddon.md,
> @InputText.md, @Button.md, @Icon.md, @Checkbox.md) exist and are correctly mapped.

<!-- ```json
// Example 1: Icon Addon + InputText (Based on inputgroup.json)
{
  "type": "InputGroup", // Validated Type
  "props": { "class": "p-inputgroup-fluid" }, // Validated
  "children": [
    {
      "type": "InputGroupAddon", // Validated Child
      "children": [{ "type": "Icon", "props": { "class": "pi pi-user" } }]
    },
    {
      "type": "InputText", // Validated Child
      // Assumes model binding is handled if needed
      "model": { "form": "myForm", "field": "username" }, 
      "props": { "placeholder": "Username" }
    }
  ]
}
``` -->

<!-- ```json
// Example 2: Multiple Addons + InputNumber (Based on inputgroup.json)
{
  "type": "InputGroup", // Validated Type
  "children": [
    {
      "type": "InputGroupAddon",
      "children": [{ "type": "Icon", "props": { "class": "pi pi-clock" } }]
    },
    {
      "type": "InputGroupAddon",
      "children": [{ "type": "Icon", "props": { "class": "pi pi-star-fill" } }]
    },
    {
      "type": "InputNumber", // Assumes @InputNumber.md VModel exists
      "model": { "form": "myForm", "field": "price" },
      "props": { "placeholder": "Price" }
    },
    {
      "type": "InputGroupAddon",
      "children": [{ "type": "Text", "props": { "content": "$" } }]
    },
    {
      "type": "InputGroupAddon",
      "children": [{ "type": "Text", "props": { "content": ".00" } }]
    }
  ]
}
``` -->

<!-- ```json
// Example 3: Button + InputText (Based on inputgroup.json)
{
  "type": "InputGroup", // Validated Type
  "children": [
    {
      "type": "Button", // Assumes @Button.md exists
      "props": { "label": "Search" }
    },
    {
      "type": "InputText",
      "model": { "form": "searchForm", "field": "keyword" },
      "props": { "placeholder": "Keyword" }
    }
  ]
}
``` -->

<!-- ```json
// Example 4: Checkbox Addon + InputText (Based on inputgroup.json)
{
  "type": "InputGroup", // Validated Type
  "children": [
    {
      "type": "InputGroupAddon",
      "children": [
        { 
          "type": "Checkbox", // Assumes @Checkbox.md VModel exists
          "model": { "form": "confirmForm", "field": "inputGroupValue" },
          "props": { "binary": true }
        }
      ]
    },
    {
      "type": "InputText",
      "model": { "form": "confirmForm", "field": "confirmText" },
      "props": { "placeholder": "Confirm" }
    }
  ]
}
``` -->

## Dependencies

- `primevue/inputgroup`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children.
- Requires child components like @InputGroupAddon.md, @InputText.md, @Button.md etc.

<!-- mirror-status: outdated -->
<!-- source-size: 795 -->

