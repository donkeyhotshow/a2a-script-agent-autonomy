<template>

  <label :for="inputId">{{ component.props?.label || '' }}</label>
  <component
    :is="component.type"
    :id="inputId"
    v-bind="$attrs"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomInput',
  inject: ['hub'],
  components: {
    // AutoComplete: defineAsyncComponent(() => import('./Input/AutoComplete.vue')),
    // ColorPicker: defineAsyncComponent(() => import('./Input/ColorPicker.vue')),
    // FileUpload: defineAsyncComponent(() => import('./Input/FileUpload.vue')),
    // InputNumber: defineAsyncComponent(() => import('./Input/InputNumber.vue')),
    InputText: defineAsyncComponent(() => import('./Input/InputText.vue')),
    Knob: defineAsyncComponent(() => import('./Input/Knob.vue')),
    Password: defineAsyncComponent(() => import('./Input/Password.vue')),
    // RadioButton: defineAsyncComponent(() => import('./Checkbox/RadioButton.vue')),
    // Slider: defineAsyncComponent(() => import('./Input/Slider.vue')),
    Textarea: defineAsyncComponent(() => import('./Input/Textarea.vue')),
    // ToggleButton: defineAsyncComponent(() => import('./Input/ToggleButton.vue')),
    // ToggleSwitch: defineAsyncComponent(() => import('./Input/ToggleSwitch.vue')),
  },
  props: {
    component: Object,
    inputId: String,
  },
  computed: {},
  methods: {
    updateValue(event) {
      this.hub.debug('Input', 'updateValue', `Input change event:`, event)
      // Реализуйте необходимую логику обработки изменения значения
    },
  },
}
</script>

<style scoped>
/* Ваши стили */
</style>
