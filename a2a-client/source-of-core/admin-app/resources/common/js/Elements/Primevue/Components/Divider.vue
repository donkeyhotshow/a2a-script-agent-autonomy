<template>
  <divider />
  <!-- <Tag :component="component" /> -->
  <!-- </divider> -->
</template>

<script>
import divider from 'primevue/divider'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'Customdivider',
  components: {
    divider,
    Tag: defineAsyncComponent(() => import('../Containers/Tag.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
