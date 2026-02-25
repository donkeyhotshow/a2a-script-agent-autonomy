<template>
  <Button v-bind="$attrs" @click="handleClick" />
</template>
<script>
import Button from 'primevue/button'

export default {
  name: 'CustomButton',
  inject: ['hub'],
  props: {
    component: Object,


  },
  methods: {
    handleClick() {
      if (this.component.props.dialogConfig) {
        this.hub.notifyManager.emit('dialogOpened', this.component.props.dialogConfig)
      }
    },
  },
  components: {
    Button,
  },
}
</script>
