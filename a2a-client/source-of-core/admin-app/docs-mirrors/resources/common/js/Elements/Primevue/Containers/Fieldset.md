# Fieldset.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/Fieldset.vue`

## Purpose

A container component that wraps the PrimeVue [`<p-fieldset>`](https://primevue.org/fieldset/) component. It's used to
group related form elements or content visually, often with a toggleable legend.

## Rendering

- Renders a PrimeVue `<p-fieldset>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-fieldset>`.
- Key `<p-fieldset>` props like `legend`, `toggleable`, `collapsed` are passed via `component.attrs`. _(Validated
  for `legend`: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
- Renders `component.children` inside the fieldset content area.
- Supports a `legend` slot if provided in `component.slots.legend`, overriding the `attrs.legend` text. _(Unverified by
  example)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside the fieldset. _(
      Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `component.attrs`: (Object, Optional) Attributes to apply to the `<p-fieldset>` tag (e.g.,
      `{ "legend": "User Details", "toggleable": true }`). _(Validated for `legend`: see source above)_
    - `component.slots`: (Object, Optional)
        - `legend`: (Array, Optional) Components to render within the legend slot, overriding the `legend` attribute. _(
          Unverified by example)_

## Usage (JSON Examples)

> **Note:** Assumes @InputText.md and @Label.md exist and follow VModel patterns.

<!-- ```json
// Example 1: Basic Fieldset (Based on storage/aiInstaller/sakai-dashboard/demo/panel-section.json)
{
  "type": "Fieldset", // Validated Type
  "attrs": {
    // Legend passed via attrs
    "legend": "Contact Information" 
  },
  "children": [
    // Example using Label and InputText (VModel pattern)
    {
      "type": "Label", 
      "attrs": { "for": "fieldsetEmail" },
      "children": [{ "type": "Text", "props": { "content": "Email" } }]
    },
    {
      "type": "InputText", 
      "model": { "form": "contactForm", "field": "email" }, 
      "attrs": { "id": "fieldsetEmail", "placeholder": "Enter email" }
    },
    { 
      "type": "Label", 
      "attrs": { "for": "fieldsetPhone" },
      "children": [{ "type": "Text", "props": { "content": "Phone" } }]
    },
    {
      "type": "InputText", 
      "model": { "form": "contactForm", "field": "phone" }, 
      "attrs": { "id": "fieldsetPhone", "placeholder": "Enter phone" }
    }
  ]
}

// Example 2: Toggleable Fieldset with Custom Legend (Conceptual - Slot usage unverified)
{
  "type": "Fieldset",
  "attrs": {
    "toggleable": true,
    "collapsed": false
  },
  "slots": {
    // Legend slot usage is unverified by examples
    "legend": [ 
      { "type": "Icon", "props": { "class": "pi pi-cog mr-1" } }, // Assumes @Icon.md
      { "type": "Text", "props": { "content": "Advanced Settings" } } // Assumes @Text.md
    ]
  },
  "children": [
    { "type": "Text", "props": { "content": "... advanced settings content ..." } }
  ]
}
``` -->

## Dependencies

- `primevue/fieldset`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children and slot content.

<!-- mirror-status: outdated -->
<!-- source-size: 891 -->

