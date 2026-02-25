# IconField.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/IconField.vue`

## Purpose

A container component that wraps the PrimeVue [`<p-icon-field>`](https://primevue.org/iconfield/) component. It's used
to position an icon (@InputIcon.md) *within* the boundaries of an input field (like @InputText.md). Requires specific
child components (@InputIcon.md and an input component) to function correctly.

## Rendering

- Renders a PrimeVue `<p-icon-field>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-icon-field>`.
- Key `<p-icon-field>` prop `iconPosition` ('left' | 'right', default: 'right') is passed via `component.attrs` to
  determine icon placement. _(Validated by: `storage/aiInstaller/sakai-input/forms/icons-form.json`)_
- Renders `component.children` inside the field. Children **must** include one @InputIcon.md component and one
  compatible input component (e.g., @InputText.md).

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Required) Components to render inside the field (must contain one @InputIcon.md and
      one input). _(Validated by: `storage/aiInstaller/sakai-input/forms/icons-form.json`)_
    - `component.attrs`: (Object, Optional) Attributes to apply to the `<p-icon-field>` tag (e.g.,
      `{ "iconPosition": "left" }`). _(Validated by: `storage/aiInstaller/sakai-input/forms/icons-form.json`)_

## Usage (JSON Examples)

> **Source:** Examples based on `storage/aiInstaller/sakai-input/forms/icons-form.json`.

<!-- ```json
// Example with Icon on the Right (Default)
{
  "type": "IconField", // Validated Type
  "children": [
    {
      "type": "InputIcon",
      // Icon class must be in props.class
      "props": { "class": "pi pi-search" }
    },
    {
      "type": "InputText", // The input field (VModel wrapper)
      // Use the model object for VModel binding
      "model": { "form": "searchForm", "field": "searchQuery" }, 
      "props": { "placeholder": "Search" }
    }
  ]
}

// Example with Icon on the Left
{
  "type": "IconField",
  "attrs": {
    // Pass iconPosition via attrs
    "iconPosition": "left" 
  },
  "children": [
    {
      "type": "InputIcon",
      "props": { "class": "pi pi-user" }
    },
    {
      "type": "InputText",
      "model": { "form": "userForm", "field": "username" },
      "props": { "placeholder": "Username" }
    }
  ]
}
``` -->

## Dependencies

- `primevue/iconfield`: The underlying PrimeVue component.
- `../Component.vue`: Used to render children.
- Requires @InputIcon.md wrapper and a compatible input component wrapper (e.g., @InputText.md) as children.

<!-- mirror-status: outdated -->
<!-- source-size: 790 -->

