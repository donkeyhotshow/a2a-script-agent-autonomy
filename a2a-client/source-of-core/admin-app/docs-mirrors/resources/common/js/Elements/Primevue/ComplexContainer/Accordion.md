# Accordion.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Accordion.vue`

## Purpose

This component acts as a wrapper for the PrimeVue `Accordion` and `AccordionTab` components ([
`<p-accordion>`](https://primevue.org/accordion/) and [`<p-accordiontab>`](https://primevue.org/accordion/)). It allows
defining multiple collapsible content sections (tabs) driven by a JSON configuration.

## Rendering

- Renders the main `<p-accordion>` component.
    - Accepts attributes like `activeIndex`, `multiple` (to allow multiple tabs open), etc., passed down via
      `component.props`. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json` uses `props.value`
      for `activeIndex`)_.
- Iterates through the `component.children` array. Each child object is expected to be an `AccordionPanel` definition.
- For each `AccordionPanel` child:
    - It renders a `<p-accordiontab>`.
    - It expects the `AccordionPanel` child to have its own `children` array containing:
        - An `AccordionHeader` component (`"type": "AccordionHeader"`) whose `props.content` defines the tab header
          text. _(Validated: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
        - An `AccordionContent` component (`"type": "AccordionContent"`) whose `props.content` defines the panel's
          content (can be simple text or HTML). _(Validated: same source)_

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Accordion and its tabs.
    - `component.props`: (Object, Optional) Attributes to pass directly to the main `<p-accordion>` component (e.g.,
      `{ "value": "0" }` for `activeIndex`, `{ "multiple": true }`). _(Validated
      Pattern: `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`)_
    - `component.children`: (Array, **Required**) An array of objects, where each object defines an `AccordionPanel`.
        - Each `AccordionPanel` object within the array should have:
            - `type`: (String, Required) Must be `"AccordionPanel"`.
            - `props`: (Object, Optional) Attributes for the `<p-accordiontab>` (e.g., `value` matching the index). _(
              Validated)_
            - `children`: (Array, **Required**) Must contain exactly two children:
                - One `{"type": "AccordionHeader", "props": {"content": "Header Text"}}` _(Validated)_
                - One `{"type": "AccordionContent", "props": {"content": "Panel Content..."}}` _(Validated)_

## Usage (JSON Example)

> **Source:** `storage/aiInstaller/sakai-dashboard/demo/panel-section.json`

_Examples removed as requested. Please refer to the cited source file for usage examples._

## Dependencies

- `primevue/accordion`: The core PrimeVue component.
- `primevue/accordiontab`: The core PrimeVue component for tabs.
- Requires child components with `type: "AccordionPanel"`.
- Requires grandchildren components with `type: "AccordionHeader"` and `type: "AccordionContent"`.
- (Potentially) `../Component.vue` if the header/content props were implemented differently (but current validation
  suggests direct content props).

## Slots

This wrapper **does not explicitly handle or pass through named slots** for `Accordion` or `AccordionTab` (like
`header`, `headericon`). Customization via slots would require modifying the wrapper component.

## Usage (JSON Example)

```json
{
  "type": " Accordion", // Matches component name in ComplexContainer.vue
  "props": {
    "multiple": true, // Allow multiple tabs open
    "activeIndex": [0], // Open the first tab initially (use array for multiple)
    "class": "custom-accordion-style"
  },
  "items": [
    {
      "props": { 
        "header": "Item 1 Header"
      },
      "children": [
        { "type": "Html", "props": { "tag": "p", "content": "Content for item 1." } }
      ]
    },
    {
      "props": { 
        "header": "Item 2 Header",
        "disabled": true
      },
      "children": [
        { "type": "Html", "props": { "tag": "p", "content": "Content for item 2 (disabled)." } }
      ]
    },
    {
      "props": { 
        "header": "Item 3 Header (With Custom PT)",
        "pt": { "headerAction": { "class": "bg-blue-100" } }
      },
      "children": [
        { "type": "Tag", "props": { "value": "Important", "severity": "warning" } }
      ]
    }
  ]
}
``` 

<!-- mirror-status: outdated -->
<!-- source-size: 1346 -->

