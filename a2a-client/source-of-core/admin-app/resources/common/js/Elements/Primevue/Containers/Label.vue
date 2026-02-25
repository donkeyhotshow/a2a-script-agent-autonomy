<template>
  <label v-if="!component.children" v-bind="component.props" v-html="component.props.content"></label>

  <label v-else v-bind="component.props">
    <RenderJson v-for="(child, childIndex) in renderableChildren"
                :key="`child-${childIndex}`"
                :component="child"
    />
  </label>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomLabel',

  components: {
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


