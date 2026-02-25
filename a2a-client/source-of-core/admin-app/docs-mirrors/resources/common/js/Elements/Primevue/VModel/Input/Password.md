# Password.vue (VModel/Input)

**Source:** `resources/common/js/Elements/Primevue/VModel/Input/Password.vue`

## Purpose

A wrapper for the PrimeVue `<p-password>` component, used within forms managed by
@docs/ui/resources/managers/FormManager.md. Provides a specialized input field for passwords, typically masking input
and optionally offering strength feedback and a visibility toggle.

## Rendering

- Renders a PrimeVue `<p-password>` component.
- Uses `v-bind="$attrs"` to pass down attributes like `placeholder`, `feedback` (show strength meter), `toggleMask` (
  show reveal icon), `disabled`.
- Binds `v-model` to the appropriate data field within `@docs/ui/resources/managers/FormManager.md`'s state using
  `formData[component.field]`.
- Can display a label using the separate @Label.md component.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.formId`: (String, Required) The ID of the form in `@docs/ui/resources/managers/FormManager.md`. _(
      Validated by: @docs/ui/resources/managers/FormManager.md)_
    - `component.field`: (String, Required) The field name in `formData` for the password string. _(Validated by:
      @docs/ui/resources/managers/FormManager.md)_
    - `component.attrs`: (Object, Optional)
        - Key `<p-password>` props like `inputId`, `placeholder` (_Validated by code_), `feedback` (_Validated by
          code_), `toggleMask` (_Validated by code_), `disabled` are passed here.

## Data Binding (`v-model`)

- Connects directly to `FormManager.forms[component.formId].data[component.field]`. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- Stores the password string entered by the user.

## Usage (JSON Examples)

> **⚠️ WARNING:** Examples updated based on validation standard. Verify component mapping (`type: "Password"`),
`formId`, and `field` usage in specific contexts.

<!-- ```json
// Example 1: Basic Password Input (Based on reset-password.json)
{
  "type": "Password", // Corrected Type (Validated by code)
  "formId": "reset-password-form", 
  "field": "password",
  "attrs": {
    "inputId": "newPasswordInput",
    "placeholder": "New Password", // Validated
    "feedback": true, // Validated
    "toggleMask": true // Validated
  }
}
``` -->

<!-- ```json
// Example 2: Password Confirmation (No feedback/toggle)
{
  "type": "Password", // Corrected Type
  "formId": "registrationForm",
  "field": "passwordConfirmation",
  "attrs": {
    "inputId": "confirmPasswordInput",
    "placeholder": "Confirm Password",
    "feedback": false,
    "toggleMask": false
  }
}
``` -->

<!-- ```json
// Example with Label (Common Pattern)
{
  "type": "Column", // Assumes @Column.md exists
  "attrs": { "class": "field col-12" },
  "children": [
    {
      "type": "Label", // Assumes @Label.md exists
      "attrs": { "for": "loginPasswordInput" },
      "children": [{ "type": "Text", "props": { "content": "Password" } }] // Assumes @Text.md exists
    },
    {
      "type": "Password", // Corrected Type
      "formId": "loginForm",
      "field": "password",
      "attrs": {
        "inputId": "loginPasswordInput", // Link to label
        "placeholder": "Enter your password",
        "toggleMask": true
      }
    }
  ]
}
``` -->

## Internal Logic

- Retrieves `formData` from `@docs/ui/resources/managers/FormManager.md` based on `component.formId`.
- Uses computed properties (`componentAttrs`).
- Renders `<p-password v-bind="componentAttrs" v-model="formData[component.field]" />`.

## Dependencies

- `primevue/password`: The underlying PrimeVue component.
- `@/State/FormManager`: Essential for data binding and state management. _(Validated by:
  @docs/ui/resources/managers/FormManager.md)_
- Often used with @Label.md and @Text.md for external labeling.

<!-- mirror-status: outdated -->
<!-- source-size: 454 -->

