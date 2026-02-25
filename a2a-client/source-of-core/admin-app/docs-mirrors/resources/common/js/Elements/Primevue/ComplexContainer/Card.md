# Card.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Card.vue`

## Purpose

This component wraps the PrimeVue `Card` component ([`<p-card>`](https://primevue.org/card/)) to display content within
a card layout, structured with optional header, title, subtitle, content, and footer sections, based on a JSON
configuration.

## Rendering

- Renders the main PrimeVue `Card` component (`<p-card>`).
- Passes down attributes from `component.props` to the `<p-card>` component. This allows setting props like `class`,
  `style`, and `pt` options via the JSON configuration. _(Pattern validated by numerous examples,
  e.g., `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`, though direct `"type": "Card"` search yielded no
  results)_.
- Utilizes the named slots of the `<p-card>` component (`header`, `title`, `subtitle`, `content`, `footer`).
- Dynamically renders content into these slots based on the structure provided in the `component.slots` object.
    - If `component.slots.header` is defined, its content (an array of components) is rendered into the `header` slot
      using @Component.vue.
    - If `component.slots.title` is defined, its content is rendered into the `title` slot using @Component.vue.
    - If `component.slots.subtitle` is defined, its content is rendered into the `subtitle` slot using @Component.vue.
    - If `component.slots.content` is defined, its content is rendered into the `content` slot using @Component.vue.
    - If `component.slots.footer` is defined, its content is rendered into the `footer` slot using @Component.vue.
- If `component.slots` is not defined or a specific slot (e.g., `content`) is missing, it falls back to rendering
  `component.children` into the **default slot** of the `<p-card>`, which implicitly maps to the `content` area. _(
  Fallback mechanism assumed, needs verification if specific usage arises)_.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Card structure. Expected format:
    - `type`: Should resolve to "Card".
    - `props`: (Object, Optional) Contains props/attributes for the main `<p-card>` component (e.g., `class`, `style`,
      `pt`). _(Validated Pattern)_.
    - `slots`: (Object, Optional) An object where keys are the names of the `<p-card>` slots (`header`, `title`,
      `subtitle`, `content`, `footer`) and values are arrays of component definitions to be rendered in that slot.
    - `children`: (Array, Optional) An array of component definitions rendered into the default (`content`) slot **only
      if** `component.slots.content` is not defined.

## Usage (JSON Example)

_Examples removed as requested. While direct `"type": "Card"` examples are scarce, its usage as a container with `props`
for styling and `children` or `slots` for content is seen in files
like `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`._

## Dependencies

- `primevue/card`: The core PrimeVue Card component.
- `../Component.vue`: Used to render content within each card slot or the default slot.

> **⚠️ WARNING: Unverified Examples ⚠️**
>
> Examples have not been verified against the current codebase.

## Purpose

This component wraps the PrimeVue `Card` component (`<p-card>`) to display content within a card layout, structured with
optional header, title, subtitle, content, and footer sections, based on a JSON configuration.

## Rendering

- Renders the main PrimeVue `Card` component (`<p-card>`).
- Passes down attributes from `$attrs` (received from the parent, `ComplexContainer.vue`) to the `<p-card>` component.
  This allows setting props like `class`, `style`, and `pt` options via the JSON `component.props`.
- Utilizes the named slots of the `<p-card>` component (`header`, `title`, `subtitle`, `content`, `footer`).
- Dynamically renders content into these slots based on the structure provided in the `component.slots` object.
    - If `component.slots.header` is defined, its content (an array of components) is rendered into the `header` slot
      using `RenderJson`.
    - If `component.slots.title` is defined, its content is rendered into the `title` slot using `RenderJson`.
    - If `component.slots.subtitle` is defined, its content is rendered into the `subtitle` slot using `RenderJson`.
    - If `component.slots.content` is defined, its content is rendered into the `content` slot using `RenderJson`.
    - If `component.slots.footer` is defined, its content is rendered into the `footer` slot using `RenderJson`.
- If `component.slots` is not defined or a specific slot (e.g., `content`) is missing, it falls back to rendering
  `component.children` into the **default slot** of the `<p-card>`, which implicitly maps to the `content` area.

## Props

- `component`: (Object, Required) The JSON object describing the Card structure. Expected format:
    - `component` or `type`: Should resolve to "Card".
    - `props`: (Object, Optional) Contains props/attributes for the main `<p-card>` component (e.g., `class`, `style`,
      `pt`).
    - `slots`: (Object, Optional) An object where keys are the names of the `<p-card>` slots (`header`, `title`,
      `subtitle`, `content`, `footer`) and values are arrays of component definitions to be rendered in that slot.
    - `children`: (Array, Optional) An array of component definitions rendered into the default (`content`) slot **only
      if** `component.slots.content` is not defined.

## Usage (JSON Example)

**Using Slots:**

```json
{
  "type": " Card", // Matches component name in ComplexContainer.vue
  "props": { 
    "class": "md:w-25rem"
  },
  "slots": {
    "header": [
      { "type": "Image", "props": { "src": "/images/card-header.jpg", "alt": "Card Header Image", "width": "100%" } }
    ],
    "title": [
      { "type": "Html", "props": { "tag": "h3", "content": "Advanced Card Title" } }
    ],
    "subtitle": [
      { "type": "Html", "props": { "tag": "p", "content": "Informative subtitle" } }
    ],
    "content": [
      { "type": "Html", "props": { "tag": "p", "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit..." } }
    ],
    "footer": [
      { "type": "Button", "props": { "label": "Save", "icon": "pi pi-check", "class": "mr-2" } },
      { "type": "Button", "props": { "label": "Cancel", "icon": "pi pi-times", "severity": "secondary", "outlined": true } }
    ]
  }
}
```

**Using Children (Fallback to Content Slot):**

```json
{
  "type": " Card",
  "props": { 
    "class": "shadow-2"
  },
  "children": [
    { "type": "Html", "props": { "tag": "h4", "content": "Simple Card Content" } },
    { "type": "Tag", "props": { "value": "Basic" } }
  ]
  // No 'slots' object defined, so children go into the default/content slot
}
```

## Dependencies

- `primevue/card`: The core PrimeVue Card component.
- `../RenderJson.vue`: Used to render content within each card slot.
- Parent: `../ComplexContainer.vue` (Provides `component` prop and `$attrs`).

<!-- mirror-status: outdated -->
<!-- source-size: 1651 -->

