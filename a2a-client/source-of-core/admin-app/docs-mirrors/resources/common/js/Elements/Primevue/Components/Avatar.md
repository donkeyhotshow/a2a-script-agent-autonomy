# Avatar.vue (Component)

**Source:** `resources/common/js/Elements/Primevue/Components/Avatar.vue`

## Purpose

Wraps the PrimeVue [`<p-avatar>`](https://primevue.org/avatar/) component to display an image, icon, or label
representatively.

## Rendering

- Renders the core `<p-avatar>` component.
- Uses `v-bind="$attrs"` to pass down all attributes from the parent configuration (`component.attrs`) directly to the
  `<p-avatar>` component. This includes essential props like:
    - `label`: (String) Text to display if image/icon is not set.
    - `icon`: (String) Icon class (e.g., 'pi pi-user').
    - `image`: (String) URL of the image to display.
    - `size`: (String) Size of the avatar ('normal', 'large', 'xlarge').
    - `shape`: (String) Shape of the avatar ('square', 'circle').
    - `class`, `style`.

## Props (Consumed by this Wrapper)

- `component`: (Object, Required) The JSON object describing the Avatar.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the `<p-avatar>` component (e.g.,
      `{ "label": "JD", "icon": "pi pi-user", "image": "/path/to/img.png", "size": "large", "shape": "circle", "class": "my-avatar" }`).
      **At least one of `label`, `icon`, or `image` is typically required by PrimeVue Avatar.** _(Validated
      Structure: `storage/aiInstaller/landing-main-page/sections/about-us/team-section.json`)_

## Usage (JSON Examples)

> **Source:** Examples based on standard PrimeVue Avatar usage and validated structure from
`storage/aiInstaller/landing-main-page/sections/about-us/team-section.json`.

<!-- ```json
// Example 1: Label Avatar
{
  "type": "Avatar", // Validated Type
  "attrs": { 
    "label": "VM",
    "size": "xlarge",
    "shape": "circle",
    "style": "background-color: #9c27b0; color: #ffffff"
  }
}

// Example 2: Icon Avatar
{
  "type": "Avatar",
  "attrs": { 
    "icon": "pi pi-user",
    "size": "large",
    "shape": "square"
  }
}

// Example 3: Image Avatar (Based on team-section.json)
{
  "type": "Avatar",
  "attrs": { 
    "image": "/images/avatar/amyelsner.png", // Make sure path is correct
    "size": "xlarge",
    "shape": "circle",
    "class": "mb-4 mx-auto"
  }
}
``` -->

## Internal Logic

- This is a very simple wrapper.
- It directly renders `<p-avatar v-bind="$attrs" />`.

## Dependencies

- `primevue/avatar`: The core PrimeVue component.

```json
{
  "type": "Avatar",
  "props": { 
    "icon": "pi pi-user",
    "size": "xlarge",
    "shape": "square",
    "style": "background-color: #dee9fc; color: #1a2551"
  }
}
```

```json
{
  "type": "Avatar",
  "props": { 
    "image": "/path/to/user-image.png", // Make sure path is correct
    "size": "large",
    "shape": "circle"
  }
}
```

**Simplified Direct Usage (within a component using the wrapper directly):**

```vue
<template>
  <div>
    <Avatar :component="{ type: 'Avatar' }" label="V" size="large" shape="circle" class="mr-2" />
    <Avatar :component="{ type: 'Avatar' }" icon="pi pi-search" size="large" shape="circle" class="mr-2"/>
    <Avatar :component="{ type: 'Avatar' }" image="/images/avatar.png" size="large" shape="circle" />
  </div>
</template>

<script setup>
import Avatar from 'path/to/Avatar.vue'; // Adjust path
</script>

<style scoped>
.mr-2 { margin-right: 0.5rem; }
</style>
```

<!-- mirror-status: outdated -->
<!-- source-size: 240 -->

