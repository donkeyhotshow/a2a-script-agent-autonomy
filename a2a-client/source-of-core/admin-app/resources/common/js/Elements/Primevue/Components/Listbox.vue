<template>
  <Listbox v-bind="$attrs" />
</template>

<script>
import Listbox from 'primevue/listbox'

export default {
  name: 'CustomListbox',
  components: {
    Listbox,
  },
  props: {
    component: Object,
  },
}
</script>
