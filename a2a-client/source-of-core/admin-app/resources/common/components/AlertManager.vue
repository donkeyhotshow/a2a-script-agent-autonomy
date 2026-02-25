<template>
  <div v-if="alertVisible" class="alert-overlay">
    <div class="alert-box">
      <p>{{ alertMessage }}</p>
      <button @click="closeAlert">Close</button>
    </div>
  </div>
</template>

<script>
import { inject } from 'vue'

export default {
  name: 'AlertManager',
  data() {
    return {
      alertVisible: false,
      alertMessage: '',
    }
  },
  methods: {
    showAlert(message) {
      this.alertMessage = message
      this.alertVisible = true
    },
    closeAlert() {
      this.alertVisible = false
      this.alertMessage = ''
    },
  },
  setup() {
    const hub = inject('hub') ///bbb4ggg
    return {
      hub,
    }
  },
  mounted() {
    this.hub.notifyManager.on('showAlert', this.showAlert)
  },
  beforeUnmount() {
    this.hub.notifyManager.off('showAlert', this.showAlert)
  },
}
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.alert-box {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
}
</style>
