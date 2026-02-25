# Fluid.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Fluid.vue`

## Purpose

A simple layout container component that renders a `<div>`. Despite the name suggesting the PrimeVue `.p-fluid` class (
which makes inputs expand), this wrapper primarily acts as a generic `<div>` for grouping elements. Any specific styling
or layout behavior (including applying `.p-fluid` if needed) must be provided explicitly via CSS classes passed in
`attrs` or `props`.

## Rendering

- Renders a `<div>` tag.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<div>` tag (e.g., `id`,
  `style`). **Note:** CSS layout classes are typically passed via `props.class`.
- Layout classes are applied via `component.props.class`. _(Validated
  Usage: `storage/aiInstaller/sakai-input/layout.json`, `storage/aiInstaller/sakai-input/elements/inputgroup.json`)_
- **Does NOT automatically add the `.p-fluid` class.** If fluid layout for child inputs is desired, the `p-fluid` class
  must be included in `props.class`.
- Renders `component.children` inside the div using @Component.vue.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside this div. _(Validated
      by: `storage/aiInstaller/sakai-input/layout.json`)_
    - `component.props`: (Object, Optional)
        - `class`: (String, Optional) CSS classes for layout (e.g., `flex`, `gap-8`, `p-fluid`). _(Validated Usage: see
          sources above)_
    - `component.attrs`: (Object, Optional) Other attributes (e.g., `id`, `style`) to apply to the `<div>` tag.

## Usage (JSON Example)

> **Note:** Class is passed via `props.class`. Does *not* automatically apply `p-fluid`.

<!-- ```json
// Example: Grouping Columns (Based on storage/aiInstaller/sakai-input/layout.json)
{
  "type": "Fluid", // Validated Type
  "props": { 
    // Validated usage pattern (layout class in props.class)
    "class": "flex flex-col md:flex-row gap-8" 
  },
  "children": [
    { 
      "type": "Column", // Assumes @Column.md exists
      "props": { "class": "md:w-1/2" }, // Example child using props.class
      "children": [ { "type": "Text", "props": { "content": "Left Column Content" } } ]
    },
    { 
      "type": "Column", 
      "props": { "class": "md:w-1/2" }, // Example child using props.class
      "children": [ { "type": "Text", "props": { "content": "Right Column Content" } } ]
    }
  ]
}

// Example: Explicitly Applying p-fluid via props.class 
// (Requires validated Row/Column usage for full layout)
{
  "type": "Fluid", // Validated Type
  "props": {
    // Add p-fluid explicitly via props.class if needed
    "class": "p-fluid grid formgrid" 
  },
  "children": [
    // Assumes Row/Column exist and handle their classes correctly
    { 
      "type": "Row", 
      // "props": { "class": "grid" }, // Unvalidated Row class mechanism
      "children": [
        { 
          "type": "Column", 
          "props": { "class": "field col" }, // Unvalidated Column class mechanism
          "children": [
            { "type": "Label", "props": { "for": "input1" }, "children": [{ "type": "Text", "props": { "content": "Input 1" } }] }, // Using props.for based on Label.md correction
            { "type": "InputText", "model": { "form": "myForm", "field": "field1" }, "props": { "id": "input1" } } // InputText will expand due to p-fluid
          ]
        },
        { 
          "type": "Column", 
          "props": { "class": "field col" }, // Unvalidated Column class mechanism
          "children": [
            { "type": "Label", "props": { "for": "input2" }, "children": [{ "type": "Text", "props": { "content": "Input 2" } }] }, // Using props.for
            { "type": "InputText", "model": { "form": "myForm", "field": "field2" }, "props": { "id": "input2" } } // InputText will expand
          ]
        }
      ]
    }
  ]
}
``` -->

## Dependencies

- `../Component.vue`: Used to render children.
- CSS Framework: Relies on external CSS classes (like PrimeFlex or Tailwind) passed via `props.class` for layout.

<!-- mirror-status: outdated -->
<!-- source-size: 751 -->

