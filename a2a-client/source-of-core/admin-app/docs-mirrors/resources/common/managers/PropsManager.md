# PropsManager.js

**Source:** `resources/common/managers/PropsManager.js`

## Purpose

The `PropsManager` is responsible for processing and preparing the properties (`props`) that are passed down to Vue
components during the JSON UI rendering process. It handles merging props defined directly in the JSON (
`component.props`), extracting relevant data from the `component.model` (like dropdown options), and potentially
transforming nested structures like PrimeVue's Pass Through (PT) options.

It also includes functionality for managing a simple key-value store and observing changes, although the primary usage
seems focused on `bindProps`.

## Core Functions

1. **Props Binding/Merging:**
    - `bindProps(container)`: This is the main method used in the rendering flow (called by `Presets.vue`).
        - Starts with the properties defined in `container.props`.
        - If `container.model` exists, it merges `options`, `optionLabel`, and `optionValue` into the props (commonly
          used for select/dropdown components).
        - Handles PrimeVue Pass Through (PT) configurations: If `container.props.pt` exists, it flattens the nested PT
          structure into top-level props prefixed with `pt:` (e.g., `pt:root:class`, `pt:input:style`).
    - `bindModel(container)`: *Seems less used or potentially deprecated/incomplete.* It attempts to get the current
      value of a field specified in `container.model` directly from `FormManager`. This logic appears redundant with how
      `VModel.vue` handles model binding.
2. **Property Management (Generic Key-Value Store):**
    - `setProp(key, value)`: Sets a value in an internal `this.props` object.
    - `getProp(key)`: Retrieves a value from `this.props`.
    - `removeProp(key)`: Deletes a key from `this.props`.
    - `createProp(key, value)`: Alias for `this.create('prop', key, value)` inherited from
      `StateManager/RegularManager`.
3. **Change Observation (Generic):**
    - `onChange(key, callback)`: Registers a callback function to be invoked when a specific key's value changes (via
      `notifyChange`).
    - `offChange(key, callback)`: Unregisters a callback.
    - `notifyChange(key, value)`: Triggers registered callbacks for a given key.
      *Note: The connection between `setProp`/`removeProp` and `notifyChange` seems missing in the provided code,
      meaning this observer pattern might not be fully functional as implemented.*

## Usage

- The primary use is `bindProps(component)` called within `Presets.vue` before rendering a category wrapper. This
  ensures the final component receives a merged and processed set of properties.
- The generic `setProp`/`getProp` and `onChange`/`offChange` methods might be used for other state management purposes
  within the application, separate from the core component rendering prop preparation.

```javascript
// Presets.vue (Simplified Template)
<template>
  <component
    :is="getComponentType()"
    :component="component"
    v-bind="bindProps(component)" // <-- PropsManager usage
    v-on="boundDOMEvents[component.vAddress]"
  />
</template>

<script>
export default {
  // ... inject hub ...
  methods: {
    bindProps(component) {
      return this.hub.propsManager.bindProps(component);
    },
    // ... other methods
  }
}
</script>
```

## Dependencies

- `./include/RegularManager.js` (Base class)
- Relies heavily on being accessed via `HubManager` (`this.hub`) to interact with:
    - `FormManager` (within `bindModel`)
    - `Debug` logging

<!-- mirror-status: outdated -->
<!-- source-size: 9966 -->

