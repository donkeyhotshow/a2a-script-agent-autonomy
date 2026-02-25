<template>
  <FloatLabel>
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </FloatLabel>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import FloatLabel from 'primevue/floatlabel'

export default {
  name: 'CustomFloatLabel',
  components: {
    FloatLabel,
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
