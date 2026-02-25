# Button.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/Button.vue`

## Purpose

Wraps the PrimeVue [`<p-button>`](https://primevue.org/button/) component to create clickable buttons that can trigger
actions, open dialogs, or navigate.

## Rendering

- Renders the core `<p-button>` component.
- Uses `v-bind="$attrs"` to pass down attributes set *on the `<CustomButton>` tag itself* when used in a parent Vue
  template (standard Vue behavior). Attributes for the underlying `<p-button>` defined *within the JSON configuration*
  should be placed in `component.props`.
- Includes an `@click` handler (`handleClick`) that determines whether to execute an action or open a dialog based on
  `component.props`.

## Props (Consumed by this Wrapper and Passed to `<p-button>`)

- `component`: (Object, Required) The JSON object describing the Button.
    - `component.props`: (Object, Optional)
        - **Action/Dialog Logic:**
            - `action`: (String, Optional) The identifier of the client action to execute (e.g.,
              `myModule/doSomething`). Ignored if `dialogConfig` is present.
            - `actionData`: (Object, Optional) Data for the `action`.
            - `dialogConfig`: (Object, Optional) Configuration for opening a dialog via
              `hub.notifyManager.emit('dialogOpened', ...)`. Takes priority over `action`.
        - **PrimeVue Button Attributes:** Standard attributes for the underlying `<p-button>` component. Examples:
            - `label` (String): Text label.
            - `icon` (String): Icon class (e.g., `pi pi-check`).
            - `iconPos` (String): Icon position (`left`, `right`, `top`, `bottom`).
            - `severity` (String): Button style (`secondary`, `success`, `info`, `warning`, `danger`, etc.).
            - `disabled` (Boolean): Disables the button.
            - `loading` (Boolean): Shows loading state.
            - `class` (String): CSS classes for the button.
            - `style` (Object): Inline styles.
            - *(Refer to PrimeVue Button documentation for all available props)*
    - `component.attrs`: (Object, Optional) **Likely unused by this component wrapper.** Its purpose might be related to
      Inertia.js or other mechanisms, but it does not directly configure the `<p-button>` attributes. *(Correction based
      on user feedback and example analysis)*

## Click Handling Logic

- The `handleClick` method checks `component.props.dialogConfig` first.
    - If found, emits `dialogOpened`.
    - Otherwise, checks `component.props.action`.
    - If `action` found, calls `hub.actionManager.executeAction(action, actionData)`.

## Usage (JSON Examples)

> **Source:** Examples updated based on component logic and usage in
`storage/aiInstaller/primary-form/templates/parts/program/navButtons.json`.

```json
// Example 1: Simple Disabled Button (using props for attributes)
{
  "type": "Button",
  "props": { 
    "label": "Info",
    "icon": "pi pi-info-circle",
    "severity": "info",
    "disabled": true,
    "class": "some-custom-class"
  }
}

// Example 2: Button triggering an action (using props.action)
{
  "type": "Button",
  "props": {
    "label": "Save",
    "icon": "pi pi-save",
    "severity": "success",
    // Action defined in props:
    "action": "formData/save", 
    "actionData": { "formName": "userProfile", "notify": true }
  }
}

// Example 3: Button opening a dialog (using props.dialogConfig)
{
  "type": "Button",
  "props": {
    "label": "Settings",
    "icon": "pi pi-cog",
    // Dialog config defined in props:
    "dialogConfig": { 
      "name": "settingsDialog",
      "title": "Application Settings"
    }
  }
}
```

## Internal Logic

- Defines the `handleClick` method to interact with `hub.notifyManager` or `hub.actionManager`.

## Dependencies

- `primevue/button`
- `@common/Hub.js`

*(Remove duplicate Props section below)*
<!-- mirror-status: outdated -->
<!-- source-size: 479 -->

