# Column.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Column.vue`

## Purpose

A simple layout container component, likely used as part of a grid system (often in conjunction with a @Row.md
container). It renders a `<div>` and typically uses CSS classes passed via attributes (`attrs`) or props (`props`) to
define its width and behavior within the grid.

## Rendering

- Renders a `<div>` tag.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<div>` tag (e.g., `id`,
  `style`). **Note:** CSS grid classes are passed via `props.class`.
- CSS grid classes (e.g., `col-12`, `md:col-span-6`) are applied via `component.props.class`. _(Validated
  Usage: `storage/aiInstaller/sakai-form-layout/elements/5forms.json`)_
- Renders `component.children` inside the div using @Component.vue.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside this column. _(Validated
      by: `storage/aiInstaller/sakai-form-layout/elements/5forms.json`)_
    - `component.props`: (Object, Optional)
        - `class`: (String, Optional) CSS classes for grid layout (e.g., `col-12 md:col-span-6`). _(Validated Usage: see
          source above)_
    - `component.attrs`: (Object, Optional) Other attributes (e.g., `id`, `style`) to apply to the `<div>` tag.

## Usage (JSON Example)

> **Note:** Assumes use within a grid system like PrimeFlex. Class is passed via `props.class`. Assumes @Row.md exists
> and works as expected (its own class mechanism is unvalidated).

<!-- ```json
// Example Based on storage/aiInstaller/sakai-form-layout/elements/5forms.json
// (Assumes Row wrapper exists)
{
  "type": "Row", // Assumes @Row.md wrapper exists and handles its class
  // "props": { "class": "grid" }, // Unvalidated Row class mechanism
  "children": [
    {
      "type": "Column", // Validated Type
      "props": { 
        // Validated: Class shown under props in this example
        "class": "md:col-span-6 col-span-12" 
      },
      "children": [
        // ... content for first column (e.g., form elements) ...
        { "type": "Text", "props": { "content": "Column 1 Content" } } // Placeholder
      ]
    },
    {
      "type": "Column", // Validated Type
      "props": { 
        // Validated: Class shown under props in this example
        "class": "md:col-span-6 col-span-12"
      },
      "children": [
        // ... content for second column ...
        { "type": "Text", "props": { "content": "Column 2 Content" } } // Placeholder
      ]
    }
  ]
}
``` -->

## Dependencies

- `../Component.vue`: Used to render children.
- CSS Grid System: Relies on external CSS classes (like PrimeFlex `.col-*`, `.md:col-*`, `.md:col-span-*` etc.) passed
  via `props.class` for layout.

<!-- mirror-status: outdated -->
<!-- source-size: 713 -->

