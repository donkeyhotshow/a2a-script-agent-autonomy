<template>
  <div class="base-radio-group" role="radiogroup" :aria-labelledby="groupId">
    <legend v-if="label" :id="groupId" class="base-radio-group__label">{{ label }}</legend>
    <div
      v-for="option in options"
      :key="option.value"
      class="base-radio-group__item"
    >
      <input
        type="radio"
        :id="`${groupId}-${option.value}`"
        :value="option.value"
        :name="groupName"
        :checked="modelValue === option.value"
        @change="handleInput(option.value)"
        :disabled="disabled || option.disabled"
        :aria-label="option.label"
        :aria-describedby="ariaDescribedby"
        :aria-invalid="ariaInvalid"
        class="base-radio"
        :class="{ 'base-radio--error': ariaInvalid }"
      />
      <label :for="`${groupId}-${option.value}`" class="base-radio-label">
        {{ option.label }}
      </label>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Boolean],
  options: { type: Array, default: () => [] },
  label: String,
  groupName: { type: String, required: true }, // Unique name for the radio group
  disabled: Boolean,
  ariaDescribedby: String,
  ariaInvalid: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const groupId = computed(() => `radio-group-${props.groupName}`);

const handleInput = (value) => {
  emit('update:modelValue', value);
};
</script>

<style scoped>
.base-radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.base-radio-group__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.base-radio-group__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.base-radio {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.base-radio:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.base-radio:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.base-radio--error {
  border-color: #ef4444;
}

.base-radio-label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  margin: 0;
}

.base-radio:disabled + .base-radio-label {
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
