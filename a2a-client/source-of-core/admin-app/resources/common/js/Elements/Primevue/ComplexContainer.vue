<template>
  <component
    :is="component.type"
    :component="component"
    v-bind="$attrs"
  />
</template>
<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomComplexContainer',
  components: {
    Accordion: defineAsyncComponent(() => import('./ComplexContainer/Accordion.vue')),
    Card: defineAsyncComponent(() => import('./ComplexContainer/Card.vue')),
    Carousel: defineAsyncComponent(() => import('./ComplexContainer/Carousel.vue')),
    DataTable: defineAsyncComponent(() => import('./ComplexContainer/DataTable.vue')),
    Drawer: defineAsyncComponent(() => import('./ComplexContainer/Drawer.vue')),
    Grid: defineAsyncComponent(() => import('./ComplexContainer/Grid.vue')),
    Splitter: defineAsyncComponent(() => import('./ComplexContainer/Splitter.vue')),
    SplitterPanel: defineAsyncComponent(() => import('./ComplexContainer/SplitterPanel.vue')),
    Steps: defineAsyncComponent(() => import('./ComplexContainer/Steps.vue')),
    Tabs: defineAsyncComponent(() => import('./ComplexContainer/Tabs.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
