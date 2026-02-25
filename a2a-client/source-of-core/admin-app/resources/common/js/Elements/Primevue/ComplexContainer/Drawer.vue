<template>
  <Drawer v-bind="$attrs">
    <RenderJson
      v-for="(child, index) in component.children"
      :key="index"
      :component="child"
    />
  </Drawer>
</template>


<script>
import Drawer from 'primevue/drawer'
import { defineAsyncComponent } from 'vue'


export default {
  name: 'CustomDrawer',
  components: {
    Drawer,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
