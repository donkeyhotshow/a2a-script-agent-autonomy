<template>
  <slot />

  <Toast />
</template>

<script>
import Toast from 'primevue/toast'

export default {
  name: 'BarberLayout',
  components: { Toast },
}
</script>
