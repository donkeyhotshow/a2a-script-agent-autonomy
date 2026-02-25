<template>
  <div :class="classs">
    <span v-if="header" class="text-sm text-warning">{{ header }}</span>

    <div class="flex flex-row gap-2">
      <Checkbox
        :inputId="inputId" :name="`${component.model.form}.${component.model.field}`" class="flex-shrink"
        v-bind="$attrs"
      />
      <label v-if="label" :for="inputId" class="flex-grow">{{ label }}</label>
    </div>


  </div>
</template>

<script>
import Checkbox from 'primevue/checkbox'

export default {
  name: 'CheckboxComponent',
  components: {
    Checkbox,
  },
  inheritAttrs: false,
  props: {
    component: Object,
    header: String,
    label: [Array, String, Object],
    inputId: String,
    class: String,
  },
  data() {
    return {
      classs: this.class,
      modelValue: this.modelValue,
    }
  },

}
</script>

<style scoped>
.text-warning {
  color: var(--p-orange-500);
  font-size: 1.2rem;
  line-height: 1.2rem;
}
</style>
