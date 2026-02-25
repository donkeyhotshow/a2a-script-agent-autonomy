<template>
  <Splitter>
    <RenderJson
      v-for="(pane, index) in component.children"
      :key="index"
      :component="pane"
    />
  </Splitter>
</template>

<script>
import Splitter from 'primevue/splitter'
import { defineAsyncComponent } from 'vue'


export default {
  name: 'RenderSplitter',
  components: { RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')), Splitter },
  props: {
    component: Object,
  },
  inheritAttrs: false,
}
</script>
