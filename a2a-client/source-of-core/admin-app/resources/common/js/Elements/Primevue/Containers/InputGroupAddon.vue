<template>
  <InputGroupAddon v-bind="$attrs">
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
  </InputGroupAddon>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import InputGroupAddon from 'primevue/inputgroupaddon'

export default {
  name: 'CustomInputGroupAddon',
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
    InputGroupAddon,
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
