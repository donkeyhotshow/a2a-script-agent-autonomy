<template>
  <SplitterPanel>
    <RenderJson
      v-for="(pane, index) in component.children"
      :key="index"
      :component="pane"

    >
    </RenderJson>
  </SplitterPanel>
</template>

<script>
import { SplitterPanel } from 'primevue'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'RenderSplitterPanel',
  components: { RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')), SplitterPanel },
  props: {
    component: Object,
  },
  inheritAttrs: false,
}
</script>
