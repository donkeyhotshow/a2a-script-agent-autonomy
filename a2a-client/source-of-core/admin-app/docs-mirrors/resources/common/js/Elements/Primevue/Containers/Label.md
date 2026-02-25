# HTML `<label>` via `@Tag.md`

> **❗ Clarification Note ❗**
> There is **no dedicated `Label.vue`** component file. The functionality of rendering an HTML `<label>` element using
`"type": "Label"` or `"type": "label"` in JSON is handled by the generic **@Tag.md component wrapper** (
`resources/common/js/Elements/Primevue/Containers/Tag.vue`).
>
> This document clarifies how to achieve a `<label>` element using the `@Tag.md` wrapper. Please refer to the **@Tag.md
documentation** for the canonical explanation of how it handles standard HTML tag rendering.

## Purpose

To render a standard HTML `<label>` element, used to associate descriptive text with a form input element for
accessibility and usability.

## Rendering Mechanism (via `@Tag.md`)

- When `@Tag.md` receives a `component` object with `component.type: "label"` (case-insensitive check likely), it
  renders an HTML `<label>` tag.
- The label's content is typically provided via `component.children`, which are rendered inside the `<label>` tag using
  @Component.vue. _(Validated by: `docs/ui/json-ui/ui-examples-v1.md`, `docs/ui/json-ui/ui-examples-v2.md`)_
- The crucial `for` attribute (linking the label to an input's `id`) is passed via `component.props.for` or
  `component.attrs.for`. _(Validated by examples)_
- CSS classes are applied via `component.props.class` or `component.attrs.class`. _(Validated by examples)_
- Other standard HTML attributes can be passed via `component.attrs`.

## Usage (JSON Example via `@Tag.md`)

> **Refer to @Tag.md for full details on attribute/prop handling.**
> **Source:** Based on `docs/ui/json-ui/ui-examples-v1.md` and `docs/ui/json-ui/ui-examples-v2.md`.

_Examples removed as requested. Please refer to cited source files or @Tag.md documentation for usage examples._

## Key Takeaway

Use `"type": "label"` (or `"Label"`) within your JSON structure. The rendering logic is handled by the **@Tag.md
component**.

- Provide label content using `children`.
- Link to inputs using `props.for` or `attrs.for`.
- Apply styles using `props.class` or `attrs.class`.

Consult the @Tag.md documentation for details on how it renders standard HTML elements.

## Dependencies

- @Tag.md component wrapper.
- @Component.vue (for rendering children).
- A corresponding form input element with an `id` matching the `for` attribute.

# Label.vue (Container)

comment data and skip if there is no examples in system
**Source:** `resources/common/js/Elements/Primevue/Containers/Label.vue`

## Purpose

A simple container component that renders an HTML `<label>` tag. It's primarily used to associate descriptive text with
form input elements.

## Rendering

- Renders an HTML `<label>` tag.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<label>` tag (e.g., `class`).
- The `for` attribute, crucial for linking the label to an input's `id`, is passed via `component.props.for`. _(
  Validated by: `storage/ai/landing-main-page/sections/contact/contact-content-section.json`)_
- The label text content is rendered directly from `component.props.content` or `component.props.value`. _(Validated by
  code - does not use `children`)_
- **Does not render `component.children`.**

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.props`: (Object, Required)
        - `for`: (String, Required) The `id` of the input element this label is associated with. _(Validated by code)_
        - `content` or `value`: (String, Required) The text content of the label. _(Validated by code)_
    - `component.attrs`: (Object, Optional) Additional attributes to apply to the `<label>` tag (e.g., `class`).
    - `component.children`: (Array, Optional) **Ignored.** Text content comes from `props`.

## Usage (JSON Example)

> **⚠️ WARNING:** Example updated based on validation standard. Requires `props.for` and `props.content`/`props.value`.
> Does not use `children`.

<!-- ```json
// Example (Based on contact-content-section.json, used with FloatLabel)
{
  "type": "Label", // Validated Type
  "props": {
    "for": "subject", // Validated: Links to InputText with id="subject"
    "value": "Тема повідомлення" // Validated: Label text via props.value
  },
  "attrs": {
    "class": "p-mb-1" // Example styling class via attrs
  }
  // No children
}
``` -->

<!-- ```json
// Example: Standalone Label for an InputText
// (Assumes InputText with id="emailInput" exists elsewhere)
{
  "type": "Label", // Validated Type
  "props": {
    "for": "emailInput",
    "content": "Email Address" // Can use content or value
  },
  "attrs": {
    "class": "block mb-2" // Example styling
  }
}
``` -->

## Internal Logic

- Uses computed properties (`componentAttrs`, `componentProps`).
- Renders
  `<label :for="componentProps.for" v-bind="componentAttrs">{{ componentProps.content || componentProps.value }}</label>`.
- Does not render children.

## Dependencies

- Form Input Components: Requires a corresponding input element (e.g., @InputText.md) with an `id` matching the `for`
  attribute for accessibility.

<!-- mirror-status: outdated -->
<!-- source-size: 883 -->

