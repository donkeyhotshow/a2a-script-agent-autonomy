# ScrollPanel.vue (Container)

**Source:** `resources/common/js/Elements/Primevue/Containers/ScrollPanel.vue`

> **⚠️ WARNING: Unvalidated Component Usage ⚠️**
> The usage pattern for `"type": "ScrollPanel"` and setting dimensions (like `width`, `height`) is **not confirmed by
any code examples found in the `storage/` directory.** While the type mapping exists, its practical application is
> unknown.
>
> The documentation below describes the PrimeVue component it wraps but **cannot verify how props or attributes (
like `style`) are passed from the JSON definition.** Treat this documentation as **conceptual and potentially inaccurate
** regarding JSON usage until verified.

## Purpose

(Conceptual) A wrapper component for the PrimeVue [`<p-scrollpanel>`](https://primevue.org/scrollpanel/) component. It
provides a scrollable view area for content that exceeds its dimensions.

## Rendering

- (Conceptual) Renders the PrimeVue `<p-scrollpanel>` component.
- **(Unvalidated):** It is **unknown** how attributes like `style` (for `width`, `height`) or `class` are passed from
  the JSON definition to the underlying `<p-scrollpanel>` component.
- (Conceptual) Renders `component.children` inside the scroll panel.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required)
    - `component.children`: (Array, Optional) Content to render inside the scroll panel. _(Standard pattern)_
    - `component.props`: **(Unvalidated Usage)** It is unknown if any PrimeVue props for `<p-scrollpanel>` (like `step`)
      are passed via this object.
    - `component.attrs`: **(Unvalidated Usage)** It is unknown how or if attributes like `style` or `class` are passed.

## Usage (JSON Example)

> **⚠️ WARNING: Example is Conceptual & Unvalidated ⚠️**
> The following example is based on the PrimeVue `<p-scrollpanel>` documentation and standard component patterns but is
**not verified** against actual code usage in this project. How `style` or other attributes are set is **unknown**.

<!-- ```json
// Conceptual Example - Usage is UNVALIDATED
{
  "type": "ScrollPanel", // !! UNVALIDATED TYPE USAGE !!
  // It is UNKNOWN how to set width/height/style/class
  "children": [
    {
      "type": "Text",
      "props": { "content": "Very long content that needs scrolling..." }
    }
    // ... more children
  ]
}
``` -->

## Dependencies

- `../Component.vue`: Used to render children.
- PrimeVue `ScrollPanel`: The underlying UI component.

<!-- mirror-status: outdated -->
<!-- source-size: 774 -->

