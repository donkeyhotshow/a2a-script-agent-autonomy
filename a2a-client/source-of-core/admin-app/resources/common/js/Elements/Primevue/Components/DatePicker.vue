<template>
  <DatePicker v-bind="$attrs" />
</template>

<script>
import DatePicker from 'primevue/datepicker'

export default {
  name: 'CustomDatePicker',
  components: {
    DatePicker,
  },
  props: {
    component: Object,
  },
}
</script>
