<template>
  <SelectButton v-bind="$attrs" />
</template>

<script>
import SelectButton from 'primevue/selectbutton'

export default {
  name: 'CustomSelectButton',
  components: {
    SelectButton,
  },
  props: {
    component: Object,
  },
}
</script>
