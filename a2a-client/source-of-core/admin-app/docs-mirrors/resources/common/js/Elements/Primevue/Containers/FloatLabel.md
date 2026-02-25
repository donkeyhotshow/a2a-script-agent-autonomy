# FloatLabel.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/FloatLabel.vue`

## Purpose

A layout container component that wraps the PrimeVue `<p-float-label>` component. It's used to create a floating label
effect for a *single* child input element (like @InputText.md, @Textarea.md, etc.). The label floats above the input
when the input is focused or filled.

## Rendering

- Renders a PrimeVue `<p-float-label>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-float-label>` tag (e.g.,
  `id`, `style`). **Note:** CSS classes are typically passed via `props.class`.
- CSS classes are applied via `component.props.class`. _(Validated
  Usage: `storage/aiInstaller/sakai-input/forms/float-label-form.json`,
  `storage/aiInstaller/landing-main-page/sections/contact/contact-content-section.json`)_
- Renders `component.children` inside the float label container using @Component.vue. **Crucially, this should contain
  exactly one input component and one associated @Label.md component.** The PrimeVue `FloatLabel` component relies on
  finding these specific children to function correctly.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside. **Must contain one input and one @Label.md
      component.** _(Validated Structure: `storage/aiInstaller/sakai-input/forms/float-label-form.json`,
      `storage/aiInstaller/landing-main-page/sections/contact/contact-content-section.json`)_
    - `component.props`: (Object, Optional)
        - `class`: (String, Optional) CSS classes to apply to the `<p-float-label>` container. _(Validated Usage: see
          sources above)_
    - `component.attrs`: (Object, Optional) Other attributes (e.g., `id`, `style`) to apply to the `<p-float-label>`
      tag.

## Usage (JSON Examples)

> **Note:** Requires exactly one input and one associated `Label` (with matching `for`/`id`) as children. Class for the
> container is passed via `props.class`.

<!-- ```json
// Example 1: Based on storage/aiInstaller/sakai-input/forms/float-label-form.json
{
  "type": "FloatLabel", // Validated Type
  "props": { 
    // Validated: Class shown under props in this example
    "class": "mb-3" 
  },
  "children": [
    // The Input component
    {
      "type": "InputText", // Validated child
      "props": { // Inner component props
        "id": "floatUsername", // ID is needed for the label's 'for' attribute
        "type": "text",
        "class": "p-inputtext-fluid"
      },
      // VModel binding (shown with formId/field variation here):
      "formId": "loginForm", 
      "field": "username" 
    },
    // The Label component associated with the input
    {
      "type": "Label", // Validated child
      "props": {
        // Validated: Label uses props.for
        "for": "floatUsername", 
        "content": "Username" // Content prop seen in example
      }
    }
  ]
}

// Example 2: With Textarea (Based on storage/aiInstaller/landing-main-page/sections/contact/contact-content-section.json)
{
  "type": "FloatLabel", // Validated Type
  "props": { 
    // Validated: Class from example
    "class": "w-full" 
  },
  "children": [
    {
      "type": "Textarea", // Validated child type
      "props": {
        "id": "contactMessage",
        "rows": 5,
        "class": "w-full"
      },
      // VModel binding variation:
      "formId": "contactForm",
      "field": "message"
    },
    {
      "type": "Label", // Validated child
      "props": {
        "for": "contactMessage",
        "value": "Your Message" // 'value' prop used for label content in this example
      }
    }
  ]
}
``` -->

## Dependencies

- `primevue/floatlabel`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children.
- Requires exactly one input component wrapper (e.g., @InputText.md, @Textarea.md) and one @Label.md wrapper as children
  for the effect to work. _(Validated Structure: see sources above)_

<!-- mirror-status: outdated -->
<!-- source-size: 781 -->

