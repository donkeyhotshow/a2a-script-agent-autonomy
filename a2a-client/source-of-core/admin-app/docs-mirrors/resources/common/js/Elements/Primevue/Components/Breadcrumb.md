# Breadcrumb.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/Breadcrumb.vue`

## Purpose

Wraps the PrimeVue [`<p-breadcrumb>`](https://primevue.org/breadcrumb/) component to display a navigation trail,
typically showing the path to the current page or location within a hierarchy.

## Rendering

- Renders the core `<p-breadcrumb>` component.
- Binds the `home` prop to `component.props.home` (**Unvalidated Usage**) to define the home/root item.
- Binds the `model` prop to `component.props.items` (**Unvalidated Usage**) to define the list of intermediate items.
- Uses `v-bind="$attrs"` to pass down other attributes from `component.attrs` (e.g., `class`). _(Validated
  for `class`: `storage/aiInstaller/sakai-dashboard/demo/%21menu-section.json`)_
- Defines `item` and `separator` slots, allowing customization via `component.props.slots` (**Unvalidated Usage**).

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Breadcrumb.
    - `component.props`: (Object, Required) Contains data and slot definitions.
        - `home`: (Object, Optional - **Unvalidated Usage**) A PrimeVue `MenuItem` object defining the home/root link.
        - `items`: (Array, Required - **Unvalidated Usage**) An array of PrimeVue `MenuItem` objects for the path items.
        - `slots`: (Object, Optional - **Unvalidated Usage**) Allows defining custom templates for items and separators.
            - `item`: (Array) Component definitions for rendering each item.
            - `separator`: (Array) Component definitions for rendering the separator.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the main `<p-breadcrumb>` component. _(
      Validated for `class`: see source above)_

## Slots (Provided by PrimeVue Breadcrumb)

This wrapper can potentially populate the following slots based on `component.props.slots` (**Unvalidated Usage**):

- `item(slotProps)`: Custom template for each breadcrumb item.
- `separator`: Custom template for the separator.

## Usage (JSON Example)

> **⚠️ WARNING:** Only the basic structure (`type`) and `attrs.class` usage are validated by code examples. The core
> data props (`props.home`, `props.items`) and `props.slots` are **unvalidated** and based on the expected PrimeVue
> component structure.

<!-- ```json
{
  "type": "Breadcrumb", // Validated Type
  "attrs": { 
    // Validated: attrs.class usage
    "class": "surface-ground border-round p-2 mb-4" 
  },
  "props": {
    // --- UNVALIDATED DATA STRUCTURE --- 
    "home": { // Optional home item (Unvalidated)
      "icon": "pi pi-home", 
      "url": "/"
    },
    "items": [ // Required array of path items (Unvalidated)
      { "label": "Electronics", "url": "/electronics" },
      { "label": "Laptops", "url": "/electronics/laptops" },
      { "label": "Macbook Pro", "disabled": true } // Current page often disabled
    ]
    // --- END UNVALIDATED DATA STRUCTURE ---
    
    // Example: Custom Item Slot (Conceptual / Unvalidated Slot Usage)
    // "slots": {
    //   "item": [
    //     {
    //       "type": "Html", // Assumes @Html.md exists
    //       "props": {
    //         "tag": "a", 
    //         "attrs": { "href": "{item.url}", "class": "text-primary font-semibold" },
    //         "content": "{item.label}"
    //       }
    //     }
    //   ]
    // }
  }
}
``` -->

## Internal Logic

- (Conceptual) Uses computed properties (`componentProps`, `componentAttrs`, `componentSlots`, `homeItem`,
  `modelItems`).
- (Conceptual) Uses dynamic slots (`<template #item>`, `<template #separator>`) if `props.slots` are provided.
- (Conceptual) Renders slot content using `renderSlot` helper (likely leveraging `Component.vue` or `Html.vue`).

## Dependencies

- `primevue/breadcrumb`: The core PrimeVue component.
- `../Component.vue`, `../Html.vue`: Potentially used by `renderSlot` for custom templates.
- `lodash/get`: Potentially used by `renderSlot`.

<!-- mirror-status: outdated -->
<!-- source-size: 1814 -->

