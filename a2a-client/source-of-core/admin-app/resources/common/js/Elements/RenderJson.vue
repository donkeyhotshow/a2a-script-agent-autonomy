<template>
  <Presets v-if="component.disabled !== true" :component="component" />
</template>

<script>
import Presets from './Presets.vue'

export default {
  name: 'RenderJson',
  components: { Presets },
  props: { component: Object },

}
</script>
