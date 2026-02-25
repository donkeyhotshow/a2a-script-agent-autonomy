<script setup lang="ts">
interface Props {
  test?: string
}
defineProps<Props>()
</script>

<template>
  <!-- Тест 1: Неактуальный класс -->
  <div class="some-unknown-class-xyz">Test</div>

  <!-- Тест 2: Отсутствие dark mode -->
  <div class="bg-white text-gray-900">No dark mode</div>

  <!-- Тест 3: CSS переменные (должны быть OK) -->
  <div class="rounded-[var(--radius-button)]">CSS vars OK</div>

  <!-- Тест 4: Правильное использование -->
  <div class="bg-white dark:bg-gray-900 p-4">Correct</div>
</template>
