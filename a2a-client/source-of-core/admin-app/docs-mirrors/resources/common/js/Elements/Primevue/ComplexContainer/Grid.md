# Grid.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Grid.vue` (Path needs verification, assumes it
exists here based on pattern)

## Purpose

A layout container component that renders a `<div>` and is designed to work with the PrimeFlex grid system (or a similar
CSS grid implementation). It acts as the main grid container and typically holds @Column.md components as its direct
children to structure content in columns.

## Rendering

- Renders a `<div>` tag.
- Applies CSS grid container classes (e.g., `grid`, `grid-cols-12`, `gap-4`) via `component.props.class`. _(Validated
  Usage: `storage/aiInstaller/sakai-form-layout/elements/5forms.json`, `storage/ai/primary-form/page.json`,
  `storage/ai/playground/page.json`)_
- Uses `v-bind="$attrs"` to pass down standard HTML attributes from `component.attrs` (e.g., `id`, `style`).
- Renders `component.children` inside the grid `<div>`, typically expecting these children to be @Column.md components.
  _(Validated Structure: see sources above)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Grid.
    - `component.children`: (Array, Required) An array containing the child component definitions, typically @Column.md
      components. _(Validated by: see sources above)_
    - `component.props`: (Object, Optional but `class` is usually required for layout)
        - `class`: (String, **Required for layout**) CSS classes defining the grid behavior (e.g.,
          `grid grid-cols-1 md:grid-cols-4 gap-4`, `flex flex-col md:flex-row gap-8`). _(Validated Usage: see sources
          above)_
    - `component.attrs`: (Object, Optional) Other standard attributes (e.g., `id`, `style`) to apply to the root `<div>`
      tag.

## Usage (JSON Example)

> **Source:** Based on `storage/aiInstaller/sakai-form-layout/elements/5forms.json`. Assumes @Column.md exists and works
> as expected.

<!-- ```json
{
  "type": "Grid", // Validated Type
  "props": {
    // Validated: Grid classes passed via props.class
    "class": "grid grid-cols-12 gap-4" // Example grid setup
    // Alternative seen: "class": "flex flex-col md:flex-row gap-8" (Flexbox alternative)
  },
  "children": [
    {
      "type": "Column", // Assumes @Column.md wrapper exists
      "props": { 
        // Column span classes passed via Column's props.class
        "class": "col-span-12 md:col-span-6" 
      },
      "children": [
        // ... content for first column ...
        { "type": "Text", "props": { "content": "Column 1 Content" } } // Placeholder
      ]
    },
    {
      "type": "Column", 
      "props": { 
        "class": "col-span-12 md:col-span-6"
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
- @Column.md: Typically used as direct children to define grid columns.
- CSS Grid System: Relies heavily on external CSS classes (like PrimeFlex `.grid`, `.col-span-*`, `gap-*` etc. or
  Tailwind classes) passed via `props.class` for layout.

<!-- mirror-status: outdated -->
<!-- source-size: 655 -->

