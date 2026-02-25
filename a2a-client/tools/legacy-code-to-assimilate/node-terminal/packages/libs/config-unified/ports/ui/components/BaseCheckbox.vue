<template>
  <div class="base-checkbox-wrapper">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="handleInput"
      :disabled="disabled"
      :required="required"
      :autofocus="autofocus"
      :aria-label="ariaLabel"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid"
      :aria-required="required"
      class="base-checkbox"
      :class="{ 'base-checkbox--error': ariaInvalid }"
    />
    <label v-if="label" class="base-checkbox-label" @click="toggleCheckbox">
      {{ label }}
    </label>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  label: String,
  disabled: Boolean,
  required: Boolean,
  autofocus: Boolean,
  ariaLabel: String,
  ariaDescribedby: String,
  ariaInvalid: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const handleInput = (event) => {
  emit('update:modelValue', event.target.checked);
};

const toggleCheckbox = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
};
</script>

<style scoped>
.base-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.base-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
  flex-shrink: 0;
}

.base-checkbox:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.base-checkbox:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.base-checkbox--error {
  border-color: #ef4444;
}

.base-checkbox-label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  margin: 0;
}

.base-checkbox:disabled + .base-checkbox-label {
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
