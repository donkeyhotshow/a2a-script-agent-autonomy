# JSON UI Rendering Pipeline

This document describes the sequence of components involved in transforming a JSON schema into rendered Vue components
on the page.

1. **Start:** The process begins with the main JSON file defining the UI (e.g., a module's `page.json`).
2. **`RenderJson.vue`**: This core component receives the component object JSON and delegates the rendering process to
   the `Presets.vue` component. It acts as the entry point for rendering a single component definition.
3. **`Presets.vue`**: `RenderJson` passes the component object to `Presets`. `Presets` uses the `component` key (or
   `type` as a fallback) along with the `storage/aiCore/component-map.json` mapping to determine the appropriate *
   *category** wrapper component (e.g., `ComplexContainer`, `VModelComponent`, `Container`, `Tag`). `Presets` then
   renders this category component.
4. **Category Component (e.g., `ComplexContainer.vue`)**: The category component receives the component object JSON. It
   again looks at the `component` key (or `type`) to identify the **specific component name** (e.g., "Tabs", "Card", "
   InputText"). It dynamically loads (often via `defineAsyncComponent`) and renders the final, specific component
   wrapper (e.g., `Tabs.vue`).
5. **Specific Component Wrapper (e.g., `Tabs.vue`)**: This final wrapper component receives the JSON definition and is
   responsible for rendering the actual HTML markup, often utilizing components from UI libraries like PrimeVue. It
   passes the relevant `props` and handles the rendering of `children` recursively using `RenderJson`.

This rendering chain (`RenderJson` -> `Presets` -> Category Component -> Specific Wrapper) provides flexibility and
allows for centralized control over how different types of JSON UI components are rendered. 
