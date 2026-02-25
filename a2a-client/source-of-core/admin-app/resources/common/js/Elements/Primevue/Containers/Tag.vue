<template>
  <component :is="getComponentName()" v-if="!component.children" v-bind="$attrs" v-html="getContent()" />

  <component :is="getComponentName()" v-else v-bind="$attrs">
    <RenderJson v-for="(child, childIndex) in renderableChildren"
                :key="`child-${childIndex}`"
                :component="child"
    />
  </component>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomTag',
  inheritAttrs: false,
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
  methods: {
    getContent() {
      return (
        this.component.props?.content ??
        this.component.content ??
        this.component.props?.value ??
        this.component.value ??
        ''
      )
    },
    getComponentName() {
      let t = this.component.type
      if (t) {
        let tag_list = ['pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', `p`, `ul`, `li`, `img`, 'span', `table`, `tr`, `td`, `th`, `div`]
        return !tag_list.includes(t.toLowerCase()) ? 'div' : t.toLowerCase()
      } else {
        // console.log('component.type is not defined', this.component)
        return 'div'
      }
    },
  },

}
</script>


