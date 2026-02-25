<template>
  <div class="grid">
    <component
      :is="column.type || 'div'"
      v-for="(column, colIndex) in component.children"
      :key="`col-${colIndex}`"
      v-bind="column.props"
    >
      <RenderJson
        v-for="(child, childIndex) in column.children"
        :key="`child-${childIndex}`"
        :component="child"
      />
    </component>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomGrid',
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
