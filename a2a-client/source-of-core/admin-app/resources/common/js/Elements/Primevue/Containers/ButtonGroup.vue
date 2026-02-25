<template>
  <ButtonGroup v-bind="$attrs">
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </ButtonGroup>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import ButtonGroup from 'primevue/buttongroup'

export default {
  name: 'CustomInputGroup',
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
    ButtonGroup,
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
