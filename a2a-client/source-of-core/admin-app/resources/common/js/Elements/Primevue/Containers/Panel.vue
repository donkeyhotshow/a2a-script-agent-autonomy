<template>
  <Panel>
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </Panel>
</template>

<script>
import Panel from 'primevue/panel'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomPanel',
  components: {
    Panel,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),

  }, props: {
    component: Object,
  },
  computed: {
    renderableChildren() {
      if (Array.isArray(this.component?.children)) return this.component.children
      return []
    },
  },
}
</script>
