<template>
  <Image :alt="component.props.alt" :class="component.props.class" :src="component.props.src"
         :style="component.props.style"
  />
</template>
<script>
import Image from 'primevue/image'

export default {
  name: 'CustomImage',
  components: {
    Image,
  },
  props: {
    component: Object,
  },
}
</script>
