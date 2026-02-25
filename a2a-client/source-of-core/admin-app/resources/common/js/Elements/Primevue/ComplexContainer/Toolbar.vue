<template>
  <Toolbar v-bind="$attrs" />
</template>

<script>
import Toolbar from 'primevue/toolbar'

export default {
  name: 'CustomToolbar',
  components: {
    Toolbar,
  }
  ,
  props: {
    component: Object,
  },
}
</script>
