# ModalManager.js

**Source:** `resources/common/managers/ModalManager.js`

## Purpose

The `ModalManager` manages the state (primarily visibility) of modal dialogs within the application. It allows modals to
be registered and then shown or hidden programmatically.

## Core Functions

1. **Modal Registration:**
    - `registerModal(name, options)`: Registers a modal configuration object (`options`) under a given `name` using the
      base `StateManager`'s `create` method. It also initializes a corresponding property in `PropsManager` (
      `modal_{name}`) with the initial `visible` state from the options.
2. **Visibility Control:**
    - `showModal(name)`: Sets the `visible` property of the registered modal state object for the given `name` to
      `true`. It also updates the corresponding `PropsManager` property (`modal_{name}`) to `true`.
    - `hideModal(name)`: Sets the `visible` property of the registered modal state object for the given `name` to
      `false`. It also updates the corresponding `PropsManager` property (`modal_{name}`) to `false`.

## State

- Uses the base `StateManager` to store modal configurations/state under their respective `name` keys.
- Each modal state object primarily holds:
    - `visible`: (Boolean) Controls visibility.
    - *(Other configuration properties from the `options` object passed to `registerModal`)*
- Also mirrors the `visible` state into `PropsManager` under keys like `modal_{name}`. The purpose of this duplication
  isn't immediately clear from the code alone; it might be for simpler access in certain contexts or a legacy pattern.

## Usage

- Instantiated by `HubManager`.
- Accessed via `hub.modalManager`.
- A modal component (e.g., a wrapper around PrimeVue's `Dialog`) would register itself using `registerModal` on mount,
  providing its initial options (including `visible: false`).
- Actions (e.g., button clicks handled by `ActionManager` or `Button.vue`/`ButtonMenu.vue` directly) would call
  `showModal(name)` to open a specific dialog.
- The modal component itself would typically watch its `visible` state (either directly from
  `ModalManager.get(name).visible` or perhaps via the `PropsManager.getProp('modal_{name}')`) and use `v-model:visible`
  or similar binding to control the underlying PrimeVue `Dialog` component. It would also likely call `hideModal(name)`
  when the dialog's close button is clicked or an action within the dialog completes.

```javascript
// Example: Button opening a modal

// In JSON definition for a button:
{
  "type": "Button",
  "props": { "label": "Open Settings" },
  "customHooks": {
    "click": [{ "action": "showModal", "data": { "name": "settingsDialog" } }]
  }
}

// ActionManager handling (simplified):
// case 'showModal': hub.modalManager.showModal(payload.data.name); break;

// Example: Modal Component (Conceptual)

// SettingsDialog.vue
<template>
  <Dialog :header="title" v-model:visible="isVisible" modal>
    <!-- Dialog Content -->
    <Button label="Close" @click="closeDialog" />
  </Dialog>
</template>

<script setup>
import { computed, inject, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({ modalId: String, title: String });
const hub = inject('hub');

// Get visibility state from the manager
const isVisible = computed({
  get: () => hub.modalManager.get(props.modalId)?.visible ?? false,
  set: (value) => { 
    // Usually visibility is set by show/hideModal, but handle direct v-model change
    if (!value) {
      hub.modalManager.hideModal(props.modalId);
    } 
    // We don't typically set it to true here, showModal does that.
  }
});

// Register on mount
onMounted(() => {
  hub.modalManager.registerModal(props.modalId, {
    visible: false, // Start hidden
    // other options...
  });
});

function closeDialog() {
  hub.modalManager.hideModal(props.modalId);
}

</script>
```

## Dependencies

- `./include/StateManager.js` (Base class)
- `./PropsManager.js` (Used to mirror visibility state)
- Relies on `HubManager` (`this.hub`).

<!-- mirror-status: outdated -->
<!-- source-size: 926 -->

