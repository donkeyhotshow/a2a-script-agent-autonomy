<template>
  <component :is="component.type"
             :component="component"
             v-bind="$attrs"
  />
</template>
<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomContainer',
  components: {
    Avatar: defineAsyncComponent(() => import('./Components/Avatar.vue')),
    Button: defineAsyncComponent(() => import('./Components/Button.vue')),
    ButtonMenu: defineAsyncComponent(() => import('./Components/ButtonMenu.vue')),
    DatePicker: defineAsyncComponent(() => import('./Components/DatePicker.vue')),
    Divider: defineAsyncComponent(() => import('./Components/Divider.vue')),
    Icon: defineAsyncComponent(() => import('./Components/Icon.vue')),
    Image: defineAsyncComponent(() => import('./Components/Image.vue')),
    Listbox: defineAsyncComponent(() => import('./Components/Listbox.vue')),
    Logo: defineAsyncComponent(() => import('./Components/Logo.vue')),
    // Rating: defineAsyncComponent(() => import('./Components/Rating.vue')), // Removed/Commented out
    Breadcrumb: defineAsyncComponent(() => import('./Components/Breadcrumb.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
