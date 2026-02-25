# Toolbar.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Toolbar.vue`

## Purpose

Wraps the PrimeVue `Toolbar` component ([`<p-toolbar>`](https://primevue.org/toolbar/)) to provide a container for
grouping items like buttons or inputs, typically used at the top of a section or table.

## Rendering

- Renders the core `<p-toolbar>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` (e.g., `class`, `style`).
- Renders components defined in `component.children` directly into the **default slot** of the `<p-toolbar>`. This
  typically aligns all items to the left (`start`) of the toolbar. _(
  Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_
- **Does not** utilize the named slots (`start`, `center`, `end`) via JSON configuration. To use different slots, the
  wrapper component would need modification.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Toolbar.
    - `component.children`: (Array, **Required**) An array of component definitions (e.g., Buttons, InputText) to be
      rendered inside the toolbar. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the main `<p-toolbar>` component (e.g.,
      `{ "class": "mb-4" }`). _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`)_

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/%21crud-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/toolbar`: The core PrimeVue component.
- `../Component.vue`: Used to render the `children` content.

<!-- mirror-status: outdated -->
<!-- source-size: 251 -->

