# Carousel.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Carousel.vue`

## Purpose

This component wraps the PrimeVue [`<p-carousel>`](https://primevue.org/carousel/) component to display a collection of
items in a scrollable carousel format, driven by JSON configuration.

## Rendering

- Renders the core `<p-carousel>` component.
- Binds the `value` prop of the carousel to `component.props.value` (this should be an array of data items, often passed
  as a variable name like `"products"`). _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`)_
- Passes configuration props like `numVisible`, `numScroll`, `responsiveOptions`, `circular`, `autoplayInterval`,
  `orientation` etc. directly via `component.props`. _(Validated: same source)_
- **Requires** a child component of `type: "Template"` with `props.slot: "item"` defined within `component.children`.
  This child `Template` defines how each item in the `value` array is rendered. _(Validated: same source)_
- Inside the child `Template`'s `children`, the data for the current item is accessible via the context variable
  `slotProps.data`. _(Validated: same source)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Carousel.
    - `component.props`: (Object, Required)
        - `value`: (String | Array, **Required**) The array of data items to display, or a string variable name holding
          the array. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`)_
        - Other `<p-carousel>` configuration props like `numVisible`, `numScroll`, `responsiveOptions`, `circular`,
          `autoplayInterval`, `orientation`. _(Validated: same source)_
    - `component.children`: (Array, **Required**)
        - Must contain exactly one object with `"type": "Template"` and `"props": { "slot": "item" }`. The `children` of
          this `Template` object define the layout for each carousel item. _(
          Validated: `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`)_
    - `component.attrs`: (Object, Optional) Standard HTML attributes (e.g., `class`, `style`) applied to the root
      `<p-carousel>` element. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`)_

## Item Template Context

- When defining the layout within the `children` of the `"type": "Template", "props": { "slot": "item" }` object, you
  can access the data of the current item being rendered using the syntax `slotProps.data.fieldName` (e.g.,
  `slotProps.data.name`, `slotProps.data.image`). _(
  Validated: `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`)_

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/%21media-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/carousel`: The core PrimeVue component.
- `../Component.vue`: Used to render the template for each item.
- Requires a child `Template` component defined within `children`.

<!-- mirror-status: outdated -->
<!-- source-size: 421 -->

