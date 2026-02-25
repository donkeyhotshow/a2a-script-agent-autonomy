# SplitterPanel.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/SplitterPanel.vue`

## Purpose

Wraps the PrimeVue `SplitterPanel` component ([`<p-splitterpanel>`](https://primevue.org/splitter/)). This component *
*must** be used as a direct child of the @Splitter.md wrapper component to define the content and properties of an
individual panel within a splitter layout.

## Rendering

- Renders the core `<p-splitterpanel>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` to the `<p-splitterpanel>`. This includes props
  like:
    - `size`: (Number) Initial size of the panel in percentage. _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `minSize`: (Number) Minimum size the panel can be resized to in percentage. _(Validated: same source)_
    - `class`, `style`.
- Renders the content provided in `component.children` inside the panel using the `Component.vue` renderer. _(Validated:
  same source)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the SplitterPanel.
    - `component.children`: (Array, **Required**) An array of component definitions for the content of this specific
      panel. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the `<p-splitterpanel>` component (e.g.,
      `{ "size": 30, "minSize": 15, "class": "flex items-center justify-center" }`). _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_

## Usage (JSON Example)

> **⚠️ WARNING:** This component is only valid as a child of a `Splitter` component. See @Splitter.md for a complete
> example.
> **Source:** `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/splitterpanel`: The core PrimeVue component.
- Parent: @Splitter.md (This component must be nested within a Splitter).
- `../Component.vue`: Used to render the `children` content.

<!-- mirror-status: outdated -->
<!-- source-size: 541 -->

