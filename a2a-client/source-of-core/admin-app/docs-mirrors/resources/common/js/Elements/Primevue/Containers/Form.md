# Form.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Form.vue`

> **⚠️ WARNING: Unvalidated Component Usage ⚠️**
> The usage pattern described below, specifically using `"type": "Form"` in JSON and passing `name` and `config` via
`props` to register a form with `@docs/ui/resources/managers/FormManager.md`, is **not confirmed by any code examples
found in the `storage/` directory.**
>
> While `FormManager.js` has a `registerForm` method, the existence and specific implementation details of this
`Form.vue` wrapper component being used in JSON structures require validation against actual project code.
>
> The documentation below is based on the *likely intended function* of such a wrapper, but should be treated as *
*conceptual and potentially inaccurate** until verified.

## Purpose

(Conceptual) A container component intended to wrap form elements and register the form with the
@docs/ui/resources/managers/FormManager.md upon mounting. It likely renders an HTML `<form>` tag or a simple `<div>`.

## Rendering

- (Conceptual) Likely renders an HTML `<form>` or `<div>` tag.
- (Conceptual) Renders `component.children` inside the container using @Component.vue.
- **Key Function (Conceptual):** On mount, it is expected to call
  `hub.formManager.registerForm(component.props.name, component.props.config)` to initialize the form state in the
  @docs/ui/resources/managers/FormManager.md.
- **(Unvalidated):** It is unknown how standard HTML attributes (like `class` or `style`) are applied to the root
  element, as no code examples are available.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Form elements and layout components to render inside. _(Standard pattern)_
    - `component.props`: (Object, Required)
        - `name`: (String, Required - **Unvalidated Usage**) The unique name (`formName`) used to register this form in
          @docs/ui/resources/managers/FormManager.md.
        - `config`: (Object, Optional - **Unvalidated Usage**) Configuration object passed to
          `FormManager.registerForm`.
    - `component.attrs`: **(Unvalidated Usage)** It is unknown if or how attributes are passed to the root element.

## Usage (JSON Examples)

> **⚠️ WARNING: Examples are Conceptual & Unvalidated ⚠️**
> The following examples demonstrate the *intended* usage pattern but are **not based on verified code.**

<!-- ```json
// Conceptual Example 1: Basic Form Registration
{
  "type": "Form", // !! UNVALIDATED TYPE USAGE !!
  "props": {
    "name": "loginForm", // !! UNVALIDATED PROP USAGE !!
    "config": { "clearOnSuccess": true } // Example config
  },
  // It is unknown how to apply classes like "space-y-4"
  "children": [
    // Assumes VModel InputText exists
    { "type": "InputText", "model": { "form": "loginForm", "field": "username" }, "props": { "placeholder": "Username" } }, 
    // Assumes VModel Password exists
    { "type": "Password", "model": { "form": "loginForm", "field": "password" }, "props": { "placeholder": "Password" } }, 
    // Assumes Button exists
    { 
      "type": "Button", 
      "props": { "label": "Login" },
      // Button likely needs customHook to trigger ActionManager.sendData("loginForm")
      "customHooks": { 
        "click": [{ "action": "sendData", "data": { "action": "auth/login", "form": "loginForm" } }] 
      }
    }
  ]
}
``` -->

## Dependencies

- `../Component.vue`: Used to render children.
- `@/State/FormManager`: **Crucial** for form registration and state management.

<!-- mirror-status: outdated -->
<!-- source-size: 3448 -->

