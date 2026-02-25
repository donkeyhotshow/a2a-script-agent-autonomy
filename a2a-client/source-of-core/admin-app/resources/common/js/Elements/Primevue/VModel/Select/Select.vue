<template>
  <Select v-bind="$attrs" />

</template>

<script>
import Select from 'primevue/select'

export default {
  name: 'CustomInputSelect',
  components: {
    Select,
  },
  props: {
    component: Object,
  },
}
</script>
