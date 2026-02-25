<template>
  <component :is="component.type ||  'Tag'"
             :component="component"
             :empty-values="[null, undefined]"
             v-bind="$attrs"
  />
</template>


<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomSelect',
  components: {
    // MultiSelect: defineAsyncComponent(() => import('./Select/MultiSelect.vue')),
    Select: defineAsyncComponent(() => import('./Select/Select.vue')),
    SelectButton: defineAsyncComponent(() => import('./Select/SelectButton.vue')),
    TreeSelect: defineAsyncComponent(() => import('./Select/TreeSelect.vue')),
  },
  inject: ['hub'],
  inheritAttrs: false,
  props: {
    component: Object,
  },
}
</script>
