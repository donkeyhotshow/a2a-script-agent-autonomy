<template>
  Carousel Is Not Implemented
  <Carousel v-bind="$attrs">
  </Carousel>
</template>


<script>
import Carousel from 'primevue/carousel'
import { defineAsyncComponent } from 'vue'


export default {
  name: 'CustomCarousel',
  components: {
    Carousel,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: Object,
  },
}
</script>
