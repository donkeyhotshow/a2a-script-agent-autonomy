<template>
  <Textarea
    v-bind="$attrs"
  />
</template>

<script>
import Textarea from 'primevue/textarea'

export default {
  name: 'CustomTextarea',
  components: {
    Textarea,
  },
  props: {
    component: Object,
  },
}
</script>
