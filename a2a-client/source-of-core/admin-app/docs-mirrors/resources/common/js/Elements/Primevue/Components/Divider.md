# divider Component (`divider.vue`)

**Source:** `resources/common/js/Elements/Primevue/components/Components/divider.vue`

**Validation Rule:** `@install-modules/aiCore/validation/levels/00/components/divider.json`

**Underlying Component:** [PrimeVue divider](https://primevue.org/divider/)

## Purpose

Intended to wrap the PrimeVue `divider` component to create horizontal or vertical dividers with optional content.
Allows separating content sections visually.

## Rendering (Intended vs. Actual)

- **Intended Behavior:** The component *should* render the core `<p-divider>` component and pass properties and
  attributes from the JSON configuration (`component.props`, `component.attrs`) to it. It should also support rendering
  content passed via the default slot (or perhaps a `content` prop).
- **Actual Behavior (⚠️ INCORRECT IMPLEMENTATION):** The current `divider.vue` file **only renders `<divider />`**
  without passing *any* properties, attributes, or content from the `component` configuration. The implementation needs
  to be corrected to match the intended behavior and usage examples found in modules.

<!-- ```vue
// INCORRECT Current divider.vue implementation
<template>
  <divider />
    <!-- <Tag :component="component" /> -->
  <!-- </divider> -->
</template>
// ... script imports divider but doesn't use component prop

// EXPECTED (Conceptual) divider.vue implementation
<template>
<divider v-bind="component.props">
<!-- Logic to render component.children or check for a default slot? -->
<slot />
</divider>
</template>
<script>
import divider from 'primevue/divider'
export default {
  // ...
  props: {
    component: Object // Expects props like layout, type, align, content? children?
  }
}
</script>

``` -->

## JSON Configuration Structure (Intended)

Based on the validation rule and common usage, the `divider` component configuration should look like this:

<!-- ```json
{
  "type": "divider",
  "props": { 
    "layout": "horizontal", // Optional: "horizontal" (default) or "vertical"
    "type": "solid",       // Optional: "solid" (default), "dashed", "dotted"
    "align": "center"      // Optional: "left", "center", "right" (for horizontal)
  },
  // Optional: Attributes like class or style
  "attrs": {
     "class": "my-4"
  },
  // Optional: Content to display within the divider
  "children": [
    { "type": "Icon", "props": { "class": "pi pi-star" } }
  ]
}
``` -->

- `type`: (String, Required) Must be `"divider"`.
- `props`: (Object, Optional) Properties passed to the underlying PrimeVue `divider`:
    - `layout`: (String) Orientation (`horizontal` or `vertical`). Default: `horizontal`.
    - `type`: (String) Border style (`solid`, `dashed`, `dotted`). Default: `solid`.
    - `align`: (String) Alignment of content within the divider (`left`, `center`, `right` for horizontal; `top`, `center`, `bottom` for vertical).
- `attrs`: (Object, Optional) Standard HTML attributes like `class` or `style` applied to the divider container.
- `children`: (Array, Optional) Components to render *inside* the divider line (only works visually if `type` is not `solid`).

## Usage Examples (JSON - Intended)

<!-- ```json
// Example 1: Simple horizontal divider
{
  "type": "divider"
}

// Example 2: Vertical dashed divider
{
  "type": "divider",
  "props": {
    "layout": "vertical",
    "type": "dashed"
  },
   "attrs": {
      "style": "height: 50px; margin: 0 1rem;"
   }
}

// Example 3: divider with centered text content
{
  "type": "divider",
  "props": {
    "align": "center",
    "type": "dotted"
  },
  "attrs": {
    "class": "my-4"
  },
  "children": [
    { "type": "Span", "props": { "content": "OR", "class": "font-bold" } }
  ]
}
``` -->

## Dependencies

- `primevue/divider`: The core PrimeVue component.

## Implementation Status

**Needs Fix:** The `divider.vue` component requires modification to correctly accept and pass props (`layout`, `type`, `align`), attributes (`class`, `style`), and potentially render children as content within the divider according to the PrimeVue `divider` API.

## Props (Consumed by this Wrapper)

-   `component`: (Object, Required) The JSON object describing the divider.
    -   `component.props`: (Object, Optional) Contains properties for the `<p-divider>` component, such as `layout`, `type`, `align`, `content`. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    -   `component.attrs`: (Object, Optional) Standard attributes like `class`, `style`. _(Validated: same source)_
    -   `component.children`: (Array, Optional) **Ignored.**

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`, `storage/ai/playground/page.json`

_Examples removed as requested. Please refer to the cited source files for usage examples._

## Validation Citations

-   `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`: Used for validation of `layout`, `type`, `align`, and `content` properties.
-   `storage/ai/playground/page.json`: Used for validation of `layout`, `type`, `align`, and `content` properties.

<!-- ```json
// Example 1: Simple horizontal divider (Validated in various files)
{
  "type": "divider" // Validated Type
}

// Example 2: Vertical dashed divider (Based on panel-section.json)
{
  "type": "divider",
  "attrs": { 
    "layout": "vertical",
    "type": "dashed",
    "style": "height: 50px; margin: 0 1rem;" // Example style
  }
}

// Example 3: divider with centered text content (Based on playground/page.json)
{
  "type": "divider",
  "attrs": {
    "align": "center",
    "type": "dotted", // Content only shows if type is not solid
    "class": "my-4"
  },
  "children": [
    { 
      "type": "Text", // Assumes @Text.md exists
      "props": { "content": "OR", "class": "font-bold" }
    }
  ]
}

// Example 4: divider with Button content aligned left (Based on panel-section.json)
{
  "type": "divider",
  "attrs": {
    "align": "left"
  },
  "children": [
    { 
      "type": "Button", // Assumes @Button.md exists
      "props": { "label": "More Options", "icon": "pi pi-search", "class": "p-button-outlined" }
    }
  ]
}
``` --> 
<!-- mirror-status: outdated -->
<!-- source-size: 412 -->

