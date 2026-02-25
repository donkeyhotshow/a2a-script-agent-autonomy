<template>
  <InputIcon v-bind="$attrs" />
</template>

<script>
import InputIcon from 'primevue/inputicon'

export default {
  name: 'CustomInputIcon',
  components: {
    InputIcon,
  },
  props: {
    component: Object,
  },
}
</script>
