# Dynamic/Index.vue (Page Component)

**Source:** `resources/backend/js/Pages/Dynamic/Index.vue`

## Purpose

`Index.vue` serves as the main page component responsible for rendering dynamic UI structures received from the backend,
typically via Inertia.js. It utilizes the core [`RenderJson.vue`](./RenderJson.md) component to display the main content
area and an optional top bar, based on JSON configurations passed as props.

## Key Responsibilities

1. **Layout Integration:** Uses the main application `Layout` (`@backend/Shared/Layout.vue`).
2. **Receiving Data:** Accepts JSON UI configurations (`content`, `topBar`), form data (`forms`), a result object (
   `result`), and display flags (`withTopBar`) as props from the backend/Inertia.
3. **Conditional Rendering:** Renders the main content and optionally a fixed top bar using `RenderJson`.
4. **Form Management:** Initializes `FormManager` and updates form field values based on the `forms` prop.
5. **Result Notification:** Displays results passed via the `result` prop using the `Toast` service.

## Rendering Logic

- The main template renders a root `div#root`.
- If `withTopBar` prop is true, it renders a fixed `div.top-bar` containing
  `<RenderJson :component="elementsSourceTopBar" />`.
    - `elementsSourceTopBar` computed property returns the `topBar` prop.
    - `topBarStyle` computed property adds `padding-top` to the root div when the top bar is present.
- It always renders `<RenderJson :component="elementsSource" />` for the main content.
    - `elementsSource` computed property returns the `content` prop.

```vue
<template>
  <div v-if="elementsSource" id="root" :style="topBarStyle">
    <div v-if="withTopBar" class="top-bar">
      <RenderJson v-if="elementsSourceTopBar" :component="elementsSourceTopBar" />
    </div>
    <RenderJson :component="elementsSource" />
  </div>
</template>
```

## Props

- `content`: (Object, default: `null`) JSON configuration for the main page content, passed to `RenderJson`.
- `topBar`: (Object, default: `null`) JSON configuration for the top bar content, passed to `RenderJson`.
- `forms`: (Object, default: `{}`) Data used to initialize or update forms managed by `hub.formManager`.
- `withTopBar`: (Boolean, default: `false`) Controls the visibility of the top bar and adjusts page padding.
- `result`: (Object) Contains data (e.g., `{ title: '...' }`) to be displayed as a toast notification via
  `hub.toast.add`.

## Lifecycle and Logic

- **`created`:** Calls `hub.formManager.initializeForms()`.
- **`mounted`:** Calls `loadPage()` (which essentially copies `content` prop to local data, though this seems redundant
  given the computed property `elementsSource`).
- **`watch: result`:** When the `result` prop changes, displays a toast notification.
- **`watch: forms`:** When the `forms` prop changes (deep watch), iterates through the forms and fields, updating values
  via `hub.formManager.updateFieldValue(formName, field, value)`.
- **`loadTopBar`/`loadPage` Methods:** Primarily copy props (`topBar`, `content`) to local data (`componentTopBar`,
  `component`). `loadPage` includes basic error handling via `hub.notifyManager`.

## Dependencies

- `RenderJson.vue`: Used to render the actual UI from JSON.
- `@backend/Shared/Layout.vue`: The main application layout.
- `hub` (Injected): Provides access to managers:
    - `hub.formManager`
    - `hub.toast`
    - `hub.notifyManager`
    - `hub.debug` 
