# RenderJson.vue

**Source:** `resources/common/js/Elements/RenderJson.vue`

## Purpose

`RenderJson` acts as a simple wrapper and the primary entry point for rendering a JSON-defined component structure. It
conditionally renders the [`Presets.vue`](./Presets.md) component, which handles the actual dynamic component loading.

## Rendering Logic

1. **Receives Configuration:** Takes a single prop, `component` (Object), which represents the JSON configuration for
   the component to be rendered.
2. **Checks `disabled`:** It checks if `component.disabled` is explicitly set to `true`.
3. **Conditional Rendering:** If `component.disabled` is **not** `true`, it renders the `Presets.vue` component.
4. **Passes Configuration:** It passes the received `component` object down to the `Presets` component as a prop.

```vue
<template>
  <Presets v-if="component.disabled !== true" :component="component" />
</template>
```

## Props

- `component`: (Object, Required) The JSON object describing the component node to render (including its type, props,
  attrs, children, etc.).

## Key Takeaway

- This component implements the `"disabled": true` functionality at the JSON level. Any component definition including
  this property will simply not be rendered.
- It delegates the core rendering logic (choosing and rendering the actual Vue component based on type) to
  `Presets.vue`. 
