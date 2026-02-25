# ButtonMenu.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/ButtonMenu.vue`

## Purpose

Wraps the PrimeVue [`<p-menu>`](https://primevue.org/menu/) component and a trigger [
`<p-button>`](https://primevue.org/button/) to create a dropdown menu that appears when the button is clicked.

## Rendering

- Renders a trigger `<p-button>`.
    - The button's appearance (icon, label, class, etc.) is controlled by attributes passed via `component.attrs`.
    - An `@click` handler (`toggle`) toggles the visibility of the menu.
    - Sets `aria-haspopup="true"` and `aria-controls` pointing to the menu's ID.
- Renders the `<p-menu>` component.
    - Binds the `model` prop to `component.props.items` (the array defining the menu items).
    - Sets `popup="true"` to make it a dropdown.
    - Binds `:ref="menu"` to get a reference to the menu component instance.
    - Sets `:id` attribute for ARIA control (likely derived internally).

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the ButtonMenu.
    - `component.props`: (Object, Required)
        - `items`: (Array, **Required**) An array of PrimeVue `MenuItem` objects defining the menu structure. _(
          Validated: `storage/aiInstaller/primary-form/templates/forms/program-control.json`)_
    - `component.attrs`: (Object, Optional) Attributes passed directly to the trigger `<p-button>` (e.g.,
      `{ "icon": "pi pi-ellipsis-v", "label": "Options", "class": "p-button-text" }`). _(Validated: same source)_

## Dialog Integration

- The wrapper includes logic within the `command` handler for menu items.
- If a menu item object in the `component.props.items` array has a property named `dialogConfig`, clicking that menu
  item will trigger an event (`hub.notifyManager.dialogOpened`) with the `dialogConfig` as the payload.
- This event is typically listened to by the `ModalManager` to dynamically open the specified dialog.

## Usage (JSON Example)

> **Source:** Based on `storage/aiInstaller/primary-form/templates/forms/program-control.json`.

<!-- ```json
{
  "type": "ButtonMenu", // Validated Type
  "attrs": { // Attributes for the trigger Button (Validated)
    "label": "Actions", 
    "icon": "pi pi-bars",
    "severity": "secondary",
    "class": "p-button-sm",
    "aria-label": "Program Actions"
  },
  "props": {
    "items": [ // Required array of MenuItems (Validated)
      {
        "label": "View Details",
        "icon": "pi pi-search",
        // Validated: Special property triggering ModalManager
        "dialogConfig": { 
          "type": "Dialog", 
          "props": {
            "header": "Program Details",
            "style": "width: 50vw;"
          },
          "children": [
            // Placeholder for actual details component/layout
            { "type": "Text", "props": { "content": "Details for program..." } }
          ]
        }
      },
      {
        "label": "Edit",
        "icon": "pi pi-pencil",
        "command": { // Example using command for other actions
          "action": "openEditForm", // Custom action handled elsewhere
          "data": { "programId": "{program.id}" }
        }
      },
      { 
        "separator": true // A visual separator
      },
      {
        "label": "Delete",
        "icon": "pi pi-trash",
        "command": { 
          "action": "confirmDelete",
          "data": { "programId": "{program.id}" }
         }
      }
    ]
  }
}
``` -->

## Internal Logic

- Uses `ref` for the menu (`menu`).
- Uses computed properties to process `items` from `props`, wrapping `command` functions for dialog handling if
  `dialogConfig` is present.
- `toggle(event)` method shows/hides the menu using the menu ref.
- Processes `command` properties: if a `dialogConfig` exists on the original item, it wraps the original command (if
  any) with logic to emit the `dialogOpened` event via `hub.notifyManager`.

## Dependencies

- `primevue/button`: The core PrimeVue component.
- `primevue/menu`: The core PrimeVue component.
- `@common/Hub.js`: Used to access `hub.notifyManager` for dialog integration.

## Core Functions

- **`toggleMenu(event)`**: Calls the underlying PrimeVue menu's `toggle` method to show/hide the popup menu relative to
  the event target (the button).
- **`handleItemSelect(event, item)`**: Called when a menu item is clicked.
    - Logs the selected item using `hub.debug`.
    - If the original `item` object from JSON has a `command` function, it executes it.
    - If the `item` has a `dialogConfig` property, it emits `dialogOpened` via `hub.notifyManager`, similar to the
      standard `Button.vue` wrapper.

## Computed Properties

- **`buttonProps`**: Merges props processed by `PropsManager` from `component.props` with the optional `buttonClass`
  prop for styling the button.
- **`menuItems`**: Transforms the `component.items` array from the JSON. For each item, it adds a `command` property
  that wraps the original command (if any) and calls `handleItemSelect`.

## Props

- `component`: (Object, Required) The JSON object describing the component configuration. It **must** contain an `items`
  array defining the menu structure. Each item in the array should follow the PrimeVue `MenuItem` structure and can
  optionally include a `dialogConfig` object.
- `buttonClass`: (String, Optional, Default: `''`) An optional CSS class to apply specifically to the button element.

## Usage (JSON Example)

```json
{
  "type": "ButtonMenu",
  "props": {
    "label": "Actions",
    "icon": "pi pi-bars",
    "severity": "secondary"
  },
  "items": [
    {
      "label": "Update",
      "icon": "pi pi-refresh",
      "command": "() => { console.log('Update clicked'); }" // Note: commands might need different handling if defined purely in JSON
    },
    {
      "label": "Delete",
      "icon": "pi pi-times",
      "command": "() => { alert('Delete clicked'); }"
    },
    {
      "separator": true
    },
    {
      "label": "Open Profile",
      "icon": "pi pi-user",
      "dialogConfig": { "name": "userProfileDialog" }
    }
  ]
}
```

## Dependencies

- `primevue` (`Button`, `Menu`)
- Parent: `../Component.vue` (Provides `component` prop and `$attrs`, though `$attrs` isn't explicitly used here besides
  what `PropsManager` handles).
- `HubManager` (`inject: ['hub']`) for accessing `PropsManager`, `NotifyManager`, and `Debug`.

<!-- mirror-status: outdated -->
<!-- source-size: 1473 -->

