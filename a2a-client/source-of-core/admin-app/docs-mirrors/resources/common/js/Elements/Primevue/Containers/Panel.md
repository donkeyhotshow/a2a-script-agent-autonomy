# Panel.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Panel.vue`

## Purpose

A container component that wraps the PrimeVue [`<p-panel>`](https://primevue.org/panel/) component. It's used to group
content within a collapsible panel, optionally with a header.

## Rendering

- Renders a PrimeVue `<p-panel>` component.
- Uses `v-bind="$attrs"` to pass down attributes (like `class`, `style`) from `component.attrs` directly to the
  `<p-panel>` tag.
- Uses `v-bind="componentProps"` to pass down props (like `header`, `toggleable`, `collapsed`) from `component.props` to
  the `<p-panel>` component.
- Renders the main content defined in `component.children` within the panel's default slot.
- **Header Content:**
    - If `component.props.header` (String) is provided, it's used as the header text.
    - If `component.slots.header` (Array) is provided, its children are rendered into the `#header` slot of the
      `<p-panel>`. _(Plausible mapping, but not directly verified by searched JSON examples)._

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.props`: (Object, Optional) Props passed directly to the underlying `<p-panel>` component. Common props
      include:
        - `header`: (String, Optional) Text content for the panel header.
        - `toggleable`: (Boolean, Optional) Makes the panel content collapsible.
        - `collapsed`: (Boolean, Optional) Sets the initial collapsed state (only if `toggleable` is true).
        - `pt`: (Object, Optional) Pass-through options for PrimeVue customization.
    - `component.attrs`: (Object, Optional) Standard HTML attributes passed to the root `<p-panel>` element (e.g.,
      `class`, `style`).
    - `component.children`: (Array, Optional) Components to render as the main content inside the panel.
    - `component.slots`: (Object, Optional)
        - `header`: (Array, Optional) Components to render inside the panel's `#header` slot. _(Unverified by direct
          JSON example, but likely functional)._

## Usage (JSON Examples)

> **Source:** Examples based on `storage/aiInstaller/sakai-dashboard/demo/panel-section.json` and conceptual slot usage.

<!-- ```json
// Example 1: Basic Panel with Header String
{
  "type": "Panel", // Validated Type
  "props": {
    "header": "Simple Panel Header"
  },
  "attrs": {
    "class": "mb-3"
  },
  "children": [
    { "type": "Text", "props": { "content": "Content of the panel goes here." } }
  ]
}

// Example 2: Toggleable Panel
{
  "type": "Panel", // Validated Type
  "props": {
    "header": "Toggleable Section",
    "toggleable": true,
    "collapsed": false // Optional: Initial state
  },
  "children": [
    { "type": "Text", "props": { "content": "This content can be hidden/shown." } }
  ]
}

// Example 3: Panel with Custom Header via Slots (Conceptual / Unverified Usage)
{
  "type": "Panel", // Validated Type
  "props": {
    "toggleable": true
  },
  "slots": {
    "header": [ // Renders into #header slot (Unverified)
      {
        "type": "div", // Using generic div via Tag.vue
        "props": { "class": "flex align-items-center gap-2" },
        "children": [
          { "type": "Avatar", "props": { "image": "/path/to/avatar.png", "shape": "circle" } },
          { "type": "Span", "props": { "content": "Custom Header Content", "class": "font-bold" } } // Using generic span via Tag.vue
        ]
      }
    ]
  },
  "children": [
    { "type": "Text", "props": { "content": "Panel content with a custom header." } }
  ]
}
``` -->

## Dependencies

- `primevue/panel`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children and slot content.
- (Potentially) Other components used within slots (e.g., `@Avatar.md`, `@Tag.md` rendering `div`/`span`).

<!-- mirror-status: outdated -->
<!-- source-size: 631 -->

