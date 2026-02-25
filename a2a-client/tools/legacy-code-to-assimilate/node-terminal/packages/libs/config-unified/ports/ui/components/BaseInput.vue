<template>
  <input
    :type="type"
    :value="modelValue"
    @input="handleInput"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :autofocus="autofocus"
    :min="min"
    :max="max"
    :step="step"
    :maxlength="maxLength"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    :aria-invalid="ariaInvalid"
    :aria-required="required"
    class="base-input"
    :class="{ 'base-input--error': ariaInvalid, 'base-input--number': type === 'number' }"
  />
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: String,
  disabled: Boolean,
  required: Boolean,
  autofocus: Boolean,
  min: [String, Number],
  max: [String, Number],
  step: [String, Number],
  maxLength: [String, Number],
  ariaLabel: String,
  ariaDescribedby: String,
  ariaInvalid: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const handleInput = (event) => {
  let value = event.target.value;
  if (props.type === 'number') {
    value = Number(value);
    if (isNaN(value)) {
      value = null; // Or handle as per requirement
    }
  }
  emit('update:modelValue', value);
};
</script>

<style scoped>
.base-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #ffffff;
  color: #111827;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.base-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.base-input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.base-input--error {
  border-color: #ef4444;
}

.base-input--error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.base-input--number {
  -moz-appearance: textfield; /* Firefox */
}

.base-input--number::-webkit-outer-spin-button,
.base-input--number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
