<template>
  <!-- Тест 1: Неактуальный класс -->
  <div class="some-unknown-class-that-does-not-exist">
    Test invalid class
  </div>

  <!-- Тест 2: Отсутствие dark mode -->
  <div class="bg-white text-gray-900">
    Missing dark mode
  </div>

  <!-- Тест 3: Отсутствие responsive классов -->
  <div class="flex w-full">
    Missing responsive
  </div>

  <!-- Тест 4: Правильное использование -->
  <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-4 rounded-lg shadow-md">
    Correct usage
  </div>

  <!-- Тест 5: CSS переменные (должны быть валидны) -->
  <div class="rounded-[var(--radius-button)] shadow-[var(--shadow-md)]">
    CSS variables
  </div>

  <!-- Тест 6: Карточка без достаточной стилизации -->
  <div class="bg-white">
    Card without padding
  </div>

  <!-- Тест 7: Кнопка без hover -->
  <button class="bg-blue-500 text-white px-4 py-2">
    Button without hover
  </button>

  <!-- Тест 8: Правильная кнопка -->
  <button class="bg-blue-500 hover:bg-blue-600 focus:ring-2 text-white px-4 py-2 rounded transition">
    Correct button
  </button>
</template>

<script setup lang="ts">
// Test component
</script>
