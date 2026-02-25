<template>
  <Avatar v-bind="$attrs" />
</template>
<script>
import Avatar from 'primevue/avatar'

export default {
  name: 'CustomAvatar',
  props: {
    component: Object,
  },
  components: {
    Avatar,
  },
}
</script>
