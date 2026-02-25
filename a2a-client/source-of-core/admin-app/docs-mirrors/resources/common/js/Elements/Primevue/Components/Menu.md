# Menu.vue (Component Wrapper)

**Source:** `resources/common/js/Elements/Primevue/Components/Menu.vue`

## Purpose

This component acts as a wrapper for the PrimeVue [`<p-menu>`](https://primevue.org/menu/) component. It is designed to
display a menu of items, often used for navigation or actions, typically triggered by another element (like a button).

## Rendering

- Renders the core PrimeVue `<p-menu>` component.
- The menu items structure is passed via `component.props.model`.
- The `popup` behavior is controlled by `component.props.popup`.
- A reference (`ref`) to the menu component is stored internally to allow toggling.
- The trigger element is defined by `component.slots.trigger`. This component wrapper likely adds the necessary `@click`
  handler to the rendered trigger element to call the internal `toggle` method.
- Uses `v-bind="$attrs"` to pass down standard attributes from `component.attrs` (e.g., `class`, `style`) to the
  `<p-menu>` component.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Menu.
    - `component.props`: (Object, Required)
        - `model`: (Array, Required) The array structure defining menu items, following the PrimeVue `MenuItem`
          interface. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/%21menu-section.json`)_
        - `popup`: (Boolean, Optional, default: `true`) Determines if the menu is displayed as a popup overlay. _(
          Validated: same source)_
    - `component.slots`: (Object, Required)
        - `trigger`: (Array, Required) An array containing the component definition for the trigger element (e.g., a
          @Button.md). _(Validated: same source)_
    - `component.attrs`: (Object, Optional) Standard HTML attributes (e.g., `class`, `style`) passed to the root
      `<p-menu>` element.

## Slots (Defined by this Wrapper)

- **`trigger`**: (Required) Expects a component definition that will be rendered as the menu trigger. The wrapper adds
  the necessary click handler.

## Usage (JSON Example)

> **Source:** Based on `storage/aiInstaller/sakai-dashboard/demo/%21menu-section.json`.

<!-- ```json
{
  "type": "Menu", // Validated Type
  "props": {
    "popup": true, // Validated
    "model": [ // Validated: Menu items structure
      {
        "label": "Options",
        "items": [
          { "label": "Update", "icon": "pi pi-refresh" },
          { "label": "Delete", "icon": "pi pi-times" }
        ]
      },
      {
        "label": "Navigate",
        "items": [
          { "label": "Vue Website", "icon": "pi pi-external-link", "url": "https://vuejs.org/" },
          { "label": "Router", "icon": "pi pi-upload", "url": "#/fileupload" }
        ]
      }
      // Action handlers (command) would typically be defined in the component 
      // that provides this JSON or via customHooks if supported
    ]
  },
  "slots": {
    // Validated: Trigger defined in slots.trigger
    "trigger": [
      {
        "type": "Button", // Assumes @Button.md exists
        "props": {
          "type": "button",
          "icon": "pi pi-ellipsis-v",
          "aria-haspopup": "true",
          "aria-controls": "overlay_menu"
        }
      }
    ]
  },
  "attrs": {
    "id": "overlay_menu", // ID for aria-controls
    "class": "custom-menu-style" // Optional styling
  }
}
``` -->

## Internal Logic

- Uses computed properties (`componentProps`, `componentAttrs`, `componentSlots`).
- Uses `ref` to get a reference to the `<p-menu>` component.
- Defines a `toggle(event)` method that calls `menu.value.toggle(event)` on the PrimeVue component instance.
- Renders the trigger component defined in `component.slots.trigger` using @Component.vue, attaching `@click="toggle"`
  to it.
- Renders `<p-menu ref="menu" :model="componentProps.model" :popup="componentProps.popup" v-bind="componentAttrs">`.

## Dependencies

- `primevue/menu`: The core PrimeVue component.
- `vue`: For `ref`.
- `../Component.vue`: Used to render the trigger component. 
