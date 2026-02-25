# MenuManager.js

**Source:** `resources/common/managers/MenuManager.js`

## Purpose

The `MenuManager` handles the registration and state management of context menus or other dynamically positioned menus
within the application.

## Core Functions

1. **Menu Registration:**
    - `registerMenu(id, config)`: Registers a menu configuration object (`config`) under a specific `id` using the base
      `StateManager`'s `create` method.
2. **Menu Display Control:**
    - `showMenu(id, event)`: Makes the menu specified by `id` visible.
        - Retrieves the menu configuration using `get(id)`.
        - Hides any currently active menu (`activeMenu` state) if it's different from the requested one.
        - Sets the menu's `visible` state to `true`.
        - Stores the click event coordinates (`event.clientX`, `event.clientY`) in the menu's `position` state.
        - Updates the `activeMenu` state to the current `id`.
    - `hideMenu(id)`: Hides the specified menu.
        - Sets the menu's `visible` state to `false`.
        - Clears the menu's `position` state.
        - If the hidden menu was the `activeMenu`, clears the `activeMenu` state.

## State

- Uses the base `StateManager` to store menu configurations under their respective `id` keys.
- Each menu state object likely contains at least:
    - `visible`: (Boolean) Controls visibility.
    - `position`: (Object | null) Stores `{ x, y }` coordinates for display, or `null` when hidden.
    - *(Other configuration properties from the `config` object passed to `registerMenu`)*
- Manages a top-level `activeMenu` state variable to track the currently visible menu `id`.

## Usage

- Instantiated by `HubManager`.
- Accessed via `hub.menuManager`.
- A menu component (e.g., a PrimeVue `Menu` or `ContextMenu`) would register its configuration using `registerMenu` on
  mount.
- An event handler (e.g., `@contextmenu` on an element) would call `showMenu(id, event)` to display the menu at the
  event location.
- The menu component itself would likely watch the `visible` and `position` state managed by this manager to control its
  display and positioning, and potentially call `hideMenu(id)` when an item is clicked or the menu loses focus.

```javascript
// Example: Context Menu Component (Conceptual)

// MyContextMenu.vue
<template>
  <Menu ref="primeMenu" :model="menuItems" :popup="true" 
        :style="{ left: position?.x + 'px', top: position?.y + 'px' }" /> 
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue';
import Menu from 'primevue/menu';

const props = defineProps({ menuId: String, items: Array });
const hub = inject('hub');
const primeMenu = ref();

const menuState = computed(() => hub.menuManager.get(props.menuId));
const isVisible = computed(() => menuState.value?.visible);
const position = computed(() => menuState.value?.position);

// Register on mount
onMounted(() => {
  hub.menuManager.registerMenu(props.menuId, {
    visible: false, // Initial state
    position: null,
    // other config if needed
  });
});

// Watch for visibility changes from manager to show/hide PrimeVue menu
watch(isVisible, (newValue) => {
  if (newValue && primeMenu.value && position.value) {
    // Need to simulate event for PrimeVue's toggle
    const mockEvent = { clientX: position.value.x, clientY: position.value.y, currentTarget: document.body }; 
    primeMenu.value.show(mockEvent);
  } else if (!newValue && primeMenu.value) {
    primeMenu.value.hide();
  }
});

const menuItems = computed(() => props.items.map(item => ({
  ...item,
  command: () => {
    // Handle item click
    if (item.command) item.command();
    // Hide menu after action
    hub.menuManager.hideMenu(props.menuId);
  }
})));

</script>

// --- In another component where the menu is triggered ---
// <div @contextmenu.prevent="showContextMenu($event, 'myUniqueMenuId')">
//   Right-click me
// </div>
// <MyContextMenu menuId="myUniqueMenuId" :items="contextMenuItems" />
// 
// methods: {
//   showContextMenu(event, menuId) {
//     this.hub.menuManager.showMenu(menuId, event);
//   }
// }
```

## Dependencies

- `@common/managers/include/StateManager.js` (Base class)
- Relies on `HubManager` (`this.hub`).

<!-- mirror-status: outdated -->
<!-- source-size: 1279 -->

