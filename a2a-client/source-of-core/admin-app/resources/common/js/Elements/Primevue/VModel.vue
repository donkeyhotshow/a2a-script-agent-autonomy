<template>
  <component
    :is="getComponentType()"
    v-model="modelValue"
    :component="component"
    :input-id="id"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { generateTempId } from '@common/managers/imports/data.js'
import ComponentMapVModel from '@depot/v-model-component-map.json'

export default {
  name: 'VModel',
  components: {
    Checkbox: defineAsyncComponent(() => import('./VModel/Checkbox.vue')),
    Input: defineAsyncComponent(() => import('./VModel/Input.vue')),
    Select: defineAsyncComponent(() => import('./VModel/Select.vue')),
  },
  inject: ['hub'],
  props: {
    component: Object,
  },
  data() {
    return {
      id: generateTempId(),
    }
  },
  computed: {
    modelValue: {
      get() {
        const formName = this.component.model?.form || 'program'
        const fieldName = this.component.model?.field
        if (formName && fieldName) {
          const data = this.hub.formManager.getData(formName)
          return (data && data[fieldName] !== undefined) ? data[fieldName] : this.component.model.value
        }
        return this.component.model.value
      },
      set(val) {
        const formName = this.component.model?.form || 'program'
        const fieldName = this.component.model?.field
        if (formName && fieldName) this.hub.formManager.updateFieldValue(formName, fieldName, val)
      },
    },
  },
  methods: {
    getComponentType() {
      let componentType = this.component.type || ComponentMapVModel.default
      return ComponentMapVModel.items[componentType?.toLowerCase()] || ComponentMapVModel.default
    },
  },
}
</script>
