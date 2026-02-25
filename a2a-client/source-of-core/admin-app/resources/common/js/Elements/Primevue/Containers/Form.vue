<template>
  <div style="position: relative;" v-bind="$attrs">
    <RenderJson
      v-for="(child, index) in renderableChildren"
      :key="index"
      :component="child"
    />
    <div v-if="form.pending" class="overlay overlayBg">
      <h1>Loading...</h1>
    </div>
    <div v-if="form.pending" class="overlay overlayGr"></div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomForm',
  inject: ['hub'],
  inheritAttrs: false,
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
  computed: {
    renderableChildren() {
      if (Array.isArray(this.component?.children)) return this.component.children
      // if (Array.isArray(this.component?.items)) {
      //   return this.component.items;
      // }
      return []
    },
  },
  data() {
    return {
      form: {},
      loading: false,
      error: null,
      moduleName: null,
    }
  },
  methods: {
    // handleFormSubmit(formName) {
    //   console.log('Form submitted:', formName);
    //   const data = this.hub.formManager.getData(formName);
    //   this.handleSubmit(data);
    // },
    // handleSubmit(data) {
    //   alert('!!!handleSubmit data :'+data);
    //   // console.log('Handling submit with data:', data);
    //   // if (process.env.NODE_ENV === 'development111') {
    //   //   this.hub.alertManager.showAlert(`Debug: Form Submit\nForm Data: ${JSON.stringify(data, null, 2)}`);
    //   // }
    //   // this.loading = true;
    //   // this.error = null;
    //   // this.hub.handleStandardEvent('SEND_DATA', {
    //   //   module: this.moduleName,
    //   //   action: `${this.component.name}/submit`,
    //   //   data: data
    //   // }).then(() => {
    //   //   this.loading = false;
    //   // }).catch(error => {
    //   //   this.loading = false;
    //   //   this.error = error.message || 'Ошибка при отправке формы.';
    //   // });
    // }
  },
  mounted() {
    // console.log('CustomForm mounted:', this.component.name);
    this.moduleName = this.$page.props.module
    this.form = this.hub.formManager.registerForm(this.component.name, this.component.model ?? {}, this.component?.fields ?? {})
    // this.hub.notifyManager.on('formSubmit', this.handleFormSubmit);
  },
  beforeUnmount() {
    // console.log('CustomForm beforeUnmount:', this.component.name);
    // this.hub.notifyManager.off('formSubmit', this.handleFormSubmit);
  },
}
</script>

<style scoped>

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.overlayGr {

  background: linear-gradient(90deg, transparent, rgba(0, 0, 255, 0.5) 50%, transparent);
  background-size: 200% 100%;
  animation: slide 2s linear infinite;
  z-index: 10;
}

.overlayBg {
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

@keyframes slide {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.error-message {
  color: red;
  /* Другие стили для сообщений об ошибках */
}
</style>
