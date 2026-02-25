# Tag.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Tag.vue`

## Purpose

A simple container component that wraps the PrimeVue [`<p-tag>`](https://primevue.org/tag/) component. It's typically
used for displaying status labels, categories, or short pieces of information, often with visual styling based on
severity.

## Rendering

- Renders a PrimeVue `<p-tag>` component.
- Uses `v-bind="$attrs"` to pass down attributes (like `class`, `style`) from `component.attrs` directly to the
  `<p-tag>` tag.
- Uses `v-bind="componentProps"` to pass down props (like `severity`, `icon`, `rounded`, `value`) from `component.props`
  to the `<p-tag>` component.
- Renders `component.children` as the default slot content *if provided*. If `component.props.value` is set, it takes
  precedence over children.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.props`: (Object, Optional) Props passed directly to the underlying `<p-tag>` component. Common props
      include:
        - `value`: (String, Optional) The static text content of the tag. **Takes precedence over `component.children`
          if both are provided.**
        - `severity`: (String, Optional) Defines the visual style (e.g., `'success'`, `'info'`, `'warning'`,
          `'danger'`). Maps to PrimeVue severity levels.
        - `icon`: (String, Optional) PrimeIcon class to display an icon within the tag (e.g., `'pi pi-check'`).
        - `rounded`: (Boolean, Optional) Whether the tag should have rounded corners.
        - `pt`: (Object, Optional) Pass-through options for PrimeVue customization.
    - `component.attrs`: (Object, Optional) Standard HTML attributes passed to the root `<p-tag>` element (e.g.,
      `class`, `style`).
    - `component.children`: (Array, Optional) Used to render the tag's content, often dynamically (e.g.,
      `"{variable}"`). **Ignored if `component.props.value` is set.** _(Validated
      Usage: `docs/ui/json-ui/ui-examples-v1.md`)_

## Usage (JSON Examples)

> **Source:** Examples based on `docs/ui/json-ui/ui-examples-v1.md` and
`storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`.

<!-- ```json
// Example 1: Static value and severity
{
  "type": "Tag", // Validated: Renders <p-tag>
  "props": {
    "value": "In Stock", // Static text via props.value
    "severity": "success"
  },
  "attrs": {
    "class": "p-1" // Example attribute
  }
}

// Example 2: Dynamic content via children and icon
{
  "type": "Tag",
  "props": {
    "severity": "{order.statusSeverity}", // Dynamic severity
    "icon": "pi pi-shopping-cart"
  },
  "children": [
    "{order.statusLabel}" // Dynamic text via children
  ]
}

// Example 3: Rounded tag with icon only (no text)
{
  "type": "Tag",
  "props": {
    "icon": "pi pi-user",
    "severity": "info",
    "rounded": true
  }
}
``` -->

## Dependencies

- `primevue/tag`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children if provided.
- PrimeVue Icons (if `props.icon` is used).

<!-- mirror-status: outdated -->
<!-- source-size: 1584 -->

