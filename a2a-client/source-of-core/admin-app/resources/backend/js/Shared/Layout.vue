<template>
  <Head>
    <title>{{ title }}</title>
    <meta :content="description" name="description" />
  </Head>

  <div>
    <slot />
    <UniDialog />
    <Toast ref="toast" />
    <AlertManager />
  </div>
</template>

<script>
import Toast from 'primevue/toast'
import UniDialog from '../Components/Modal/UniDialog.vue'
import AlertManager from '@common/components/AlertManager.vue'
import { Head } from '@inertiajs/vue3'

export default {
  name: 'Layout',
  components: { UniDialog, Toast, AlertManager, Head },
  inject: ['hub'],
  props: {
    title: String,
    description: String,
  },
  mounted() {
    if (this.hub) this.hub.toast = this.$refs.toast
  },
  computed: {},
}
</script>
