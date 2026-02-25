<template>
  <Password v-bind="$attrs" />
</template>

<script>
import Password from 'primevue/password'
import { generateId } from '@common/managers/imports/data.js'


export default {
  name: 'CustomPassword',
  components: {
    Password,
  },
  inheritAttrs: false,
  props: {
    placeholder: {
      type: String,
      required: false,
    },
  },
  data() {
    return {
      id: generateId(),
    }
  },
}
</script>
