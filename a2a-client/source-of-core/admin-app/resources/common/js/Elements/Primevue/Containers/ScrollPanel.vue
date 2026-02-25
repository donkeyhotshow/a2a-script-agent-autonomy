<template>
  <ScrollPanel>
    <RenderJson
      v-for="(child, index) in children"
      :key="index"
      :component="child"
    />
  </ScrollPanel>
</template>

<script>
import ScrollPanel from 'primevue/scrollpanel'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomScrollPanel',
  components: {
    ScrollPanel,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),

  },
  props: {
    component: Object,
  },
  computed: {
    children() {
      let ret = Array.isArray(this.component.children) ? this.component.children : null
      if (!ret) ret = Array.isArray(this.component.items) ? this.component.items : null
      if (ret) return ret
      return []
    },
  },
}
</script>

