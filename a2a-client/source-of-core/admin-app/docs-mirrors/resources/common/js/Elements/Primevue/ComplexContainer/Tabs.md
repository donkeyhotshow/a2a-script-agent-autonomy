# Tabs.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Tabs.vue`

## Purpose

Wraps the PrimeVue `TabView` and `TabPanel` components ([`<p-tabview>`](https://primevue.org/tabview/) and [
`<p-tabpanel>`](https://primevue.org/tabpanel/)) to create a tabbed interface where content is separated into different
selectable tabs, driven by JSON configuration.

## Rendering

- Renders the main `<p-tabview>` component.
- Uses `v-bind="$attrs"` to pass down attributes from `component.props` to `<p-tabview>` (e.g., `activeIndex`, `class`).
  _(Validated: `storage/ai/login-form/templates/auth-tabs.json`)_
- Iterates through the `component.children` array. Each child object is expected to be a `TabPanel` definition.
- For each `TabPanel` child, it renders a `<p-tabpanel>`:
    - Passes attributes defined in the child's `props` down to the `<p-tabpanel>` (e.g., `header`, `class`, `disabled`).
      The `header` prop is required for the tab title. _(
      Validated: `storage/ai/playground/page.json`, `storage/ai/login-form/templates/auth-tabs.json`)_
    - Renders the content defined in the `TabPanel` child's `children` array inside the tab panel using the
      `Component.vue` renderer.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the TabView and its panels.
    - `component.props`: (Object, Optional) Attributes to pass directly to the main `<p-tabview>` component (e.g.,
      `{ "activeIndex": 0, "class": "w-full" }`). _(Validated: `storage/ai/login-form/templates/auth-tabs.json`)_
    - `component.children`: (Array, **Required**) An array of objects, where each object defines a `TabPanel`.
        - Each `TabPanel` object within the array should have:
            - `type`: (String, Required) Must be `"TabPanel"`.
            - `props`: (Object, Required) Attributes for the `<p-tabpanel>`.
                - `header`: (String, **Required**) The text/title for the tab header. _(Validated)_
                - Other `<p-tabpanel>` props like `class`, `disabled`. _(Validated)_
            - `children`: (Array, Required) An array of component definitions for the content of the tab panel.

## Usage (JSON Example)

> **Source:** `storage/ai/playground/page.json`, `storage/ai/login-form/templates/auth-tabs.json`

_Examples removed as requested. Please refer to the cited source files for usage examples._

## Dependencies

- `primevue/tabview`: The core PrimeVue component.
- `primevue/tabpanel`: The core PrimeVue component for tab panels.
- `../Component.vue`: Used to render the content (`children`) within each tab panel.

## Important Limitations

- **Tab Props Ignored:** Props defined within `item.props` other than `header` (e.g., `disabled`, `leftIcon`,
  `rightIcon`) are **not** passed to the corresponding `<p-tab>` component and will have no effect.
- **No Slots:** Cannot use PrimeVue slots for customization without modifying the wrapper.

## Computed Properties

- `tabItems`: Safely accesses `component.items` or `component.children`, returning an empty array if neither exists or
  is not an array.

## Slots

This wrapper **does not explicitly handle or pass through named slots** for `Tabs`, `TabList`, `Tab`, `TabPanels`, or
`TabPanel`. Customization via slots would require modifying the wrapper component.
<!-- mirror-status: outdated -->
<!-- source-size: 1289 -->

