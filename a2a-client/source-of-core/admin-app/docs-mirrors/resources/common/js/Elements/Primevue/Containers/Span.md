# HTML `<span>` via `@Tag.md`

> **❗ Deprecation / Clarification Note ❗**
> There is **no dedicated `Span.vue`** component file. The functionality of rendering an HTML `<span>` element using
`"type": "Span"` in JSON is handled by the generic **@Tag.md component wrapper** (
`resources/common/js/Elements/Primevue/Containers/Tag.vue`).
>
> This document clarifies how to achieve a `<span>` element using the `@Tag.md` wrapper. Please refer to the **@Tag.md
documentation** for the canonical explanation of how it handles standard HTML tag rendering (including `<span>`).

## Purpose

To render a standard HTML `<span>` element, typically used for inline text styling or grouping.

## Rendering Mechanism (via `@Tag.md`)

- When `@Tag.md` receives a `component` object with `component.type: "Span"` (case-insensitive check likely), it renders
  an HTML `<span>` tag.
- Attributes from `component.attrs` are passed to the `<span>`.
- CSS classes from `component.props.class` are applied.
- Content is rendered based on `component.props.content` (takes precedence) or `component.children`.

## Usage (JSON Example via `@Tag.md`)

> **Refer to @Tag.md for full details and more examples.**
> **Source:** `storage/aiInstaller/landing-main-page/sections/booking/booking-confirmation-section.json` (Example of
> usage)

_Examples removed as requested. Please refer to the cited source file or @Tag.md documentation for usage examples._

## Key Takeaway

Use `"type": "Span"` within your JSON structure. The rendering logic is handled by the **@Tag.md component**. Consult
its documentation for details on props (`content`, `class`), `attrs`, and `children` handling when rendering standard
HTML elements.

## Dependencies

- @Tag.md component wrapper.
- (Potentially) @Component.vue if using nested children. 
