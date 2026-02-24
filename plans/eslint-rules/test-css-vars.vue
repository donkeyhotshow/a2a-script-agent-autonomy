<script setup lang="ts">
interface Props {
  test?: string
}
defineProps<Props>()
</script>

<template>
  <!-- Тест: Существующая CSS переменная -->
  <div class="rounded-[var(--tw-translate-x)]">Valid CSS var</div>

  <!-- Тест: Несуществующая CSS переменная -->
  <div class="rounded-[var(--unknown-variable)]">Invalid CSS var</div>

  <!-- Тест: Неактуальный класс -->
  <div class="some-unknown-class-xyz">Invalid class</div>

  <!-- Тест: Валидный Tailwind класс из бандла -->
  <div class="rounded-lg border p-6 shadow-sm">Valid from bundle</div>
</template>
