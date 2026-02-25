<template>
  <component :is="component.type"
             :component="component"
             v-bind="$attrs"
  />
</template>
<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomCustoms',
  components: {
    PathBreadcrumb: defineAsyncComponent(() => import('../Customs/PathBreadcrumb.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
