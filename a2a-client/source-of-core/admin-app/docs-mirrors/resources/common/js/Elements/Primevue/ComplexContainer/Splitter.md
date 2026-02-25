# Splitter.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Splitter.vue`

## Purpose

Wraps the PrimeVue `Splitter` component ([`<p-splitter>`](https://primevue.org/splitter/)) to create layouts with
adjustable panels, separated by a draggable gutter.

## Rendering

- Renders the core `<p-splitter>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` to the `<p-splitter>`. This includes important
  layout props: _(Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `layout`: (String) Orientation of the splitter (`horizontal` or `vertical`, default: `horizontal`).
    - `gutterSize`: (Number) Size of the draggable gutter in pixels (default: 4).
    - `step`: (Number) Step size for resizing panels.
    - `stateKey`: (String) Key for saving/restoring layout state using storage (requires `stateStorage`).
    - `stateStorage`: (String) Defines storage type (`session` or `local`) for state persistence.
    - `class`, `style`, etc.
- Iterates through the `component.children` array. _(Validated: same source)_
- For each `child` component definition, it assumes the child represents a `SplitterPanel` and renders it using the
  `Component.vue` renderer: `<Component :component="child" />`. _(Validated: same source)_
    - **Important:** The children provided *must* be components designed to work as splitter panels (likely the
      @SplitterPanel.md wrapper) which render the PrimeVue `<p-splitterpanel>`.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Splitter layout.
    - `component.children`: (Array, **Required**) An array of component definitions, each representing a panel within
      the splitter. These children should typically be of `type: "SplitterPanel"`. _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the main `<p-splitter>` component (e.g.,
      `{ "layout": "vertical", "gutterSize": 10, "style": "height: 300px" }`). _(Validated: same source)_

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/splitter`: The core PrimeVue component.
- `../Component.vue`: Used to render the `children` (which should be @SplitterPanel.md components).
- @SplitterPanel.md: Required as children components to render `<p-splitterpanel>`.

<!-- mirror-status: outdated -->
<!-- source-size: 503 -->

