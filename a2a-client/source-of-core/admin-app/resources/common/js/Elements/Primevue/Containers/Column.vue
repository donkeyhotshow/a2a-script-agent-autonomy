<template>
  <!-- <div v-bind="$attrs"> -->
  <RenderJson
    v-for="(child, index) in children"
    :key="index"
    :component="child"
  />
  <!-- </div> -->
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  name: 'CustomColumn',
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
