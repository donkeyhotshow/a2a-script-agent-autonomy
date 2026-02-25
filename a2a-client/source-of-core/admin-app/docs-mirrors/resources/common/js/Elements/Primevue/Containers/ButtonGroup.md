# ButtonGroup.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/ButtonGroup.vue`

## Purpose

A layout container component that wraps the PrimeVue `<p-button-group>` component. It's used to visually group multiple
@Button.md components together, often removing the spacing between them to appear as a single connected unit.

## Rendering

- Renders a PrimeVue `<p-button-group>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-button-group>` tag (e.g.,
  `id`, `style`). **Note:** CSS classes are typically passed via `props.class`.
- CSS classes are applied via `component.props.class`. _(Validated
  Usage: `storage/ai/landing-main-page/sections/header-section.json`)_
- Renders `component.children` inside the group using @Component.vue. Children should typically be @Button.md
  components.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside the group (should be @Button.md components).
      _(Validated Structure: `storage/ai/landing-main-page/sections/header-section.json`)_
    - `component.props`: (Object, Optional)
        - `class`: (String, Optional) CSS classes to apply to the group container. _(Validated Usage: see source above)_
    - `component.attrs`: (Object, Optional) Other attributes (e.g., `id`, `style`) to apply to the `<p-button-group>`
      tag.

## Usage (JSON Example)

> **Note:** Class is passed via `props.class`. Assumes @Button.md exists.

<!-- ```json
// Example Based on storage/ai/landing-main-page/sections/header-section.json
{
  "type": "ButtonGroup", // Validated Type
  "props": { 
    // Validated: Class shown under props in this example
    "class": "flex border-t lg:border-t-0 border-surface py-4 lg:py-0 mt-4 lg:mt-0 gap-2"
  },
  "children": [
    { // Assumes @Button.md exists
      "type": "Button", 
      "props": { 
        "label": "Записатися", 
        "text": true, 
        "rounded": true, 
        "class": "cursor-pointer",
        "icon": "pi pi-calendar", 
        "style": "color: #12A800;"
      },
      "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/page/booking" } }] }
    },
    { // Assumes @Button.md exists
      "type": "Button", 
      "props": { 
        "label": "Контакти", 
        "rounded": true, 
        "class": "cursor-pointer px-3 py-1 sm:px-4 sm:py-2",
        "icon": "pi pi-phone", 
        "style": "background-color: #12A800; color: white; border: none;"
      },
      "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/page/contact" } }] }
    }
  ]
}
``` -->

## Dependencies

- `primevue/buttongroup`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children.
- Requires @Button.md wrapper components as children.

<!-- mirror-status: outdated -->
<!-- source-size: 800 -->

