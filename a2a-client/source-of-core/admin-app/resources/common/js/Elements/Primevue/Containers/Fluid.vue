<template>
  <Fluid>
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </Fluid>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import Fluid from 'primevue/fluid'

export default {
  name: 'CustomFluid',
  components: {
    Fluid,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),

  },
  props: {
    component: Object,
  },
  computed: {
    renderableChildren() {
      if (Array.isArray(this.component?.children)) {
        return this.component.children
      }
      if (Array.isArray(this.component?.items)) {
        return this.component.items
      }
      return []
    },
  },
}
</script>
