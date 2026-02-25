<template>
  <component
    :is="component.type"
    :component="component"
    :value="component.model.value"
    v-bind="$attrs"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomCheckbox',
  components: {
    Checkbox: defineAsyncComponent(() => import('./Checkbox/Checkbox.vue')),
    // RadioButton: defineAsyncComponent(() => import('./Checkbox/RadioButton.vue')), // Removed/Commented out
  },
  inject: ['hub'],
  props: {
    component: Object,
  },
}
</script>

<style scoped>
/* .text-warning {
  color: var(--p-orange-500);
  font-size: 1.2rem;
  line-height: 1.2rem;
} */
</style>
