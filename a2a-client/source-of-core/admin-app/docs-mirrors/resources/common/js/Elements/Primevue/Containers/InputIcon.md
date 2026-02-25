# InputIcon.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/InputIcon.vue`

## Purpose

A simple component that wraps the PrimeVue `<p-input-icon>` component. It is specifically designed to be used as a child
of the @IconField.md container to display an icon next to an input.

## Rendering

- Renders a PrimeVue `<p-input-icon>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` directly to the `<p-input-icon>` tag.
- **Crucially relies on a CSS class** (e.g., `pi pi-search`) passed via `component.props.class` to define which icon to
  display. _(Validated by: `storage/aiInstaller/sakai-input/forms/icons-form.json`,
  `storage/aiInstaller/sakai-dashboard/demo/input-section.json`)_
- Does not render children.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.props`: (Object, Required)
        - `class`: (String, Required) The CSS class defining the PrimeIcon (e.g., "pi pi-user"). _(Validated
          by: `storage/aiInstaller/sakai-input/forms/icons-form.json`,
          `storage/aiInstaller/sakai-dashboard/demo/input-section.json`)_
    - `component.attrs`: (Object, Optional) Additional attributes to apply to the `<p-input-icon>` tag.
    - `component.children`: (Array, Optional) **Should normally be empty.** This component does not render children.

## Usage (JSON Example)

> **⚠️ WARNING:** Must be used as a child of @IconField.md.
> **Source:** `storage/aiInstaller/sakai-input/forms/icons-form.json`,
`storage/aiInstaller/sakai-dashboard/demo/input-section.json`

_Examples removed as requested. Please refer to the cited source files for usage examples._

## Dependencies

- `primevue/inputicon`: The underlying PrimeVue component.
- Designed to be a child of the @IconField.md wrapper.

<!-- mirror-status: outdated -->
<!-- source-size: 257 -->

