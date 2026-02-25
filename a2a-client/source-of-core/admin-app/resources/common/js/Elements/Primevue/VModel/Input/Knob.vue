<template>
  <Knob v-bind="$attrs" />
</template>

<script>
import Knob from 'primevue/knob'

export default {
  name: 'CustomKnob',
  components: {
    Knob,
  },
  props: {
    component: Object,
  },
}
</script>
