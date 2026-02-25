<template>
  <PrimaryIndex v-bind="$attrs" />
</template>

<script>
import PrimaryIndex from '../../../../backend/js/Pages/Dynamic/Index.vue'

export default {
  name: 'FrontendIndex',
  components: { PrimaryIndex },
  mounted() {
    console.log('FrontendIndex mounted')
  },
}
</script>
