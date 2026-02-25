<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    @click="handleClick"
    class="base-button"
    :class="[
      `base-button--${variant}`,
      { 'base-button--loading': loading }
    ]"
    :aria-label="ariaLabel || label"
    :aria-busy="loading"
  >
    <i v-if="icon && !loading" :class="icon"></i>
    <span v-if="!loading && label">{{ label }}</span>
    <span v-if="loading" class="base-button__spinner"></span>
  </button>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  label: String,
  icon: String,
  type: { type: String, default: 'button' }, // 'button', 'submit', 'reset'
  variant: { type: String, default: 'primary' }, // 'primary', 'secondary', 'danger', 'success', 'warning', 'info'
  disabled: Boolean,
  loading: Boolean,
  ariaLabel: String,
});

const emit = defineEmits(['click']);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
}

.base-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.base-button:disabled,
.base-button--loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-button--primary {
  background-color: #3b82f6;
  color: #ffffff;
}

.base-button--primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.base-button--secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.base-button--secondary:hover:not(:disabled) {
  background-color: #d1d5db;
}

.base-button--danger {
  background-color: #ef4444;
  color: #ffffff;
}

.base-button--danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.base-button--success {
  background-color: #10b981;
  color: #ffffff;
}

.base-button--success:hover:not(:disabled) {
  background-color: #059669;
}

.base-button--warning {
  background-color: #f59e0b;
  color: #ffffff;
}

.base-button--warning:hover:not(:disabled) {
  background-color: #d97706;
}

.base-button--info {
  background-color: #3b82f6;
  color: #ffffff;
}

.base-button--info:hover:not(:disabled) {
  background-color: #2563eb;
}

.base-button__spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  width: 1em;
  height: 1em;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
