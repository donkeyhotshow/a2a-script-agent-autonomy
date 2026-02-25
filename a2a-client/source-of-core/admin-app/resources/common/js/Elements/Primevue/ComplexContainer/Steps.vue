<template>
  <Steps
    :activeIndex="activeIndex"
    :model="steps"
    @change="handleChange"
  />
</template>

<script>
import { Steps } from 'primevue'

export default {
  name: 'RenderSteps',
  components: { Steps },
  props: {
    component: Object,
    steps: {
      type: Array,
      default: () => [],
    },
    activeIndex: {
      type: Number,
      default: 0,
    },
  },
  methods: {
    handleChange(event) {

    },
  },
}
</script>
