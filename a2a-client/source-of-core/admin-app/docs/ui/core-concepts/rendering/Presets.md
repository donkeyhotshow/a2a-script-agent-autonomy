# Presets.vue

**Source:** `resources/common/js/Elements/Presets.vue`

## Purpose

`Presets` is the core dynamic rendering engine of the JSON UI. It receives a component configuration object from [
`RenderJson.vue`](./RenderJson.md) and dynamically loads and renders the appropriate Vue component based on the
specified type, while also handling prop binding and a complex event system (`customHooks`).

## Key Responsibilities

1. **Dynamic Component Loading:** Determines which Vue component to render.
2. **Prop Binding:** Binds properties to the rendered component.
3. **Event Handling (`customHooks`):** Manages both local component actions and cross-component communication via a
   sophisticated event system.
4. **Component Registration:** Registers the rendered component with the `ComponentManager`.

## Rendering Logic

1. **Determine Component Type:** Uses `getComponentType()` method which reads `component.type` from the JSON config.
2. **Consult Map:** Looks up the component name (lowercase) in `@depot/component-map.json` to find the corresponding Vue
   component to load (e.g., `Component`, `Container`, `VModel`). Uses `ComponentMap.default` if no match found.
3. **Render Dynamic Component:** Uses `<component :is="...">` to render the determined component type.
4. **Bind Props:** Uses `v-bind="bindProps(component)"`, which delegates to `hub.propsManager.bindProps(component)` to
   prepare and pass props from the JSON `component.props` object to the child component.
5. **Bind Events:** Uses `v-on="boundDOMEvents[component.vAddress]"` to attach event listeners based on the
   `customHooks` defined in the JSON.

## Event Handling (`customHooks`)

This is a central piece of `Presets` functionality, enabling complex interactions defined in JSON.

- **Virtual Address (`vAddress`):** Each component instance gets a `vAddress` (either from JSON `component.vAddress` or
  a generated `uniqueKey`). This address is used for targeting events.
- **Event Subscription:** Subscribes to events on its own `vAddress` using
  `hub.notifyManager.on(this.thisVAddress, this.handleVAddressEvents)`.
- **`customHooks` Processing (`processComponentCustomHooks`):** Parses the `component.customHooks` object from JSON
  during `mounted`.
    - **Hooks with `emitter` (Global/Cross-Component):** These define listeners for events originating from *other*
      components (identified by `emitter: vAddress`). When the specified event occurs on the emitter component, this
      listener is triggered, and it then *emits* a new event via `hub.notifyManager.emit` to its own `vAddress` (or
      `data.target`). These are stored globally in `hub.customHooks` (a Map).
    - **Hooks without `emitter` (Local):** These define actions to be executed directly when a DOM event occurs on
      *this* component instance. They are stored locally in `this.listeners`.
- **DOM Event Binding (`boundDOMEvents`):** Dynamically creates listeners for standard DOM events (e.g., `click`,
  `mouseover`). When a DOM event fires:
    1. It triggers any relevant **global** hooks (found via `findCustomHooksForComponent`) by emitting events via
       `notifyManager`.
    2. It triggers any relevant **local** hooks by calling `this.handleVAddressEvents`.
- **Event Handling (`handleVAddressEvents`):** This method is called either by `notifyManager` (for events targeted at
  this component's `vAddress`) or directly by `boundDOMEvents` (for local hooks). It uses a `switch` statement based on
  the `action` in the event payload to call appropriate methods on `hub.actionManager` (e.g., `changeAttribute`,
  `alert`, `copyToClipboard`, `sendData`, `forceUpdate`).
- **Cleanup:** Removes its global hooks from `hub.customHooks` during `beforeUnmount`.

## Other Lifecycle Hooks

- **`created`:** Assigns `thisVAddress`.
- **`mounted`:** Registers component (`hub.componentManager.register`), subscribes to events (`notifyManager.on`),
  processes `customHooks`, and triggers initial `forceUpdate` if needed.
- **`beforeUnmount`:** Cleans up global custom hooks.

## Dependencies

- Vue (`defineAsyncComponent`)
- `@depot/component-map.json`: Crucial for mapping JSON types to Vue components.
- `@common/managers/imports/data.js` (`generateTempId`, `onlyUnique`)
- `hub` (Injected): Provides access to managers:
    - `hub.propsManager`
    - `hub.notifyManager`
    - `hub.actionManager`
    - `hub.componentManager`
    - `hub.customHooks` (global state Map)
    - `hub.debug`
- Child Component Categories (`Component`, `Container`, `ComplexContainer`, `VModel`, `Customs`, `Tag`) loaded via async
  import.

## Props

- `component`: (Object, Required) The JSON configuration object passed down from `RenderJson.vue`. 
