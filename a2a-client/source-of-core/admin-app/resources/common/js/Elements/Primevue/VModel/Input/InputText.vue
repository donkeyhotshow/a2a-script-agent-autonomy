<template>
  <InputText v-bind="$attrs" />
</template>

<script>
import InputText from 'primevue/inputtext'
import { generateId } from '@common/managers/imports/data.js'

export default {
  name: 'CustomInputText',
  components: {
    InputText,
  },
  props: {
    component: Object,
  },
  data() {
    return {
      id: generateId(),
    }
  },
}
</script>
