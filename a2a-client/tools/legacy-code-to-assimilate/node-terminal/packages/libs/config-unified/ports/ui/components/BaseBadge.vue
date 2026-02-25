<template>
  <span
    class="base-badge"
    :style="{ backgroundColor: backgroundColor, color: textColor }"
    :aria-label="label || text"
  >
    <i v-if="icon" :class="icon" class="base-badge__icon"></i>
    {{ text }}
  </span>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  text: { type: [String, Number], required: true },
  backgroundColor: { type: String, default: '#6b7280' },
  textColor: { type: String, default: '#ffffff' },
  icon: String,
  label: String,
});

const computedTextColor = computed(() => {
  // Basic luminance check for contrast
  const hex = props.backgroundColor.startsWith('#') ? props.backgroundColor.slice(1) : props.backgroundColor;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#374151' : '#ffffff'; // Darker text for light backgrounds, lighter for dark
});
</script>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  text-transform: uppercase;
  white-space: nowrap;
}

.base-badge__icon {
  font-size: 0.8em;
}
</style>
