# InputGroupAddon.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/InputGroupAddon.vue`

## Purpose

A simple container component that wraps the PrimeVue `<p-input-group-addon>` component. It is specifically designed to
be used as a child of the @InputGroup.md container to add elements like icons (@Icon.md) or text (@Text.md) visually
connected to an input field.

## Rendering

- Renders a PrimeVue `<p-input-group-addon>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-input-group-addon>` tag (
  e.g., `class`).
- Renders `component.children` inside the addon using @Component.vue. This should typically be a single @Icon.md,
  @Text.md, or potentially other simple components like @Checkbox.md.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Component(s) to render inside the addon (e.g., [@Icon.md]). _(Validated
      by: `storage/aiInstaller/sakai-input/elements/inputgroup.json`)_
    - `component.attrs`: (Object, Optional) Attributes to apply to the `<p-input-group-addon>` tag.

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard. Must be used as a child of @InputGroup.md. Assumes
> child component wrappers (@Icon.md, @Text.md, @Checkbox.md) exist.

<!-- ```json
// Example 1: Icon Addon (Based on inputgroup.json)
// (Must be inside an "InputGroup" children array)
{
  "type": "InputGroupAddon", // Validated Type
  "children": [
    { "type": "Icon", "props": { "class": "pi pi-user" } } // Validated Child
  ]
}
``` -->

<!-- ```json
// Example 2: Text Addon (Based on inputgroup.json)
// (Must be inside an "InputGroup" children array)
{
  "type": "InputGroupAddon", // Validated Type
  "children": [
    { "type": "Text", "props": { "content": "$" } } // Validated Child
  ]
}
``` -->

<!-- ```json
// Example 3: Checkbox Addon (Based on inputgroup.json)
// (Must be inside an "InputGroup" children array)
{
  "type": "InputGroupAddon", // Validated Type
  "children": [
    { 
      "type": "Checkbox", // Validated Child
      "model": { "form": "confirmForm", "field": "inputGroupValue" },
      "props": { "binary": true }
    }
  ]
}
``` -->

## Dependencies

- `primevue/inputgroupaddon`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children.
- Designed to be a child of the @InputGroup.md wrapper.

<!-- mirror-status: outdated -->
<!-- source-size: 825 -->

