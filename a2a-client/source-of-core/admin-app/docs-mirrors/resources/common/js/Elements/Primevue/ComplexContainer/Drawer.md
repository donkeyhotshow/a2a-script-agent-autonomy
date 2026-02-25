# Drawer.vue (Conceptual Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Drawer.vue` (Path is assumed, file may not exist)

## Purpose (Conceptual)

(Conceptual) Wraps the PrimeVue `Sidebar` component ([`<p-sidebar>`](https://primevue.org/sidebar/)) to create overlay
or pushed side panels, typically used for navigation or menus.

## Rendering (Conceptual)

- (Conceptual) Renders the core `<p-sidebar>` component.
- (Conceptual) Manages visibility using `v-model:visible`, bound to `component.props.visible`.
- (Conceptual) Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` to the `<p-sidebar>` component (
  e.g., `position`, `modal`, `header`, `class`).
- (Conceptual) Renders `component.children` inside the sidebar's content area.
- (Conceptual) Listens for the `hide` event and potentially emits it (`onHide`).

## Props (Consumed by this Wrapper - Conceptual)

- `component`: (Object, Required)
    - `component.props`: (Object, Required - **Unvalidated**)
        - `visible`: (String, **Required, Unvalidated**) A variable name (string like `"{isDrawerVisible}"`) holding the
          boolean state for the drawer's visibility (used with `v-model:visible`). Needs external state management.
    - `component.attrs`: (Object, Optional - **Unvalidated**) Attributes to pass directly to the `<p-sidebar>`
      component (e.g., `{ "position": "left", "modal": false, "header": "Navigation" }`).
    - `component.children`: (Array, Optional - **Unvalidated**) Components to render inside the drawer.

## Events Emitted (Conceptual)

- `onUpdate:visible(newState)`: (Conceptual) Emitted when the visibility state changes.
- `onHide`: (Conceptual) Emitted when the sidebar is hidden.

## Usage (JSON Example)

_Examples removed as requested. No validated examples found in `storage/`._

## Dependencies

- `primevue/sidebar`: The core PrimeVue component (if this wrapper exists).
- `../Component.vue`: (Potentially) Used to render children.

<!-- mirror-status: outdated -->
<!-- source-size: 501 -->

