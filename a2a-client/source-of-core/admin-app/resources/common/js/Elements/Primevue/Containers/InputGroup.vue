<template>
  <InputGroup v-bind="$attrs">
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </InputGroup>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import InputGroup from 'primevue/inputgroup'

export default {
  name: 'CustomInputGroup',
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
    InputGroup,
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
