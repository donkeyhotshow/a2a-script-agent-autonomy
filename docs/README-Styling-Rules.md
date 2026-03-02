# Styling Validation Rules

Правила для валидации CSS классов в Vue компонентах. Протестированы на реальных файлах проекта.

**🎯 Используют актуальные данные из собранного бандла для точной проверки!**

## 📋 Обзор

Созданы три новых ESLint правила для автоматической проверки стилизации:

1. **no-invalid-classes** - обнаруживает несуществующие классы **из реального бандла**
2. **require-responsive-classes** - проверяет полноту responsive и dark mode
3. **suggest-styling-improvements** - предлагает улучшения (экспериментально)

## 🚀 Быстрый старт

### 1. Соберите проект и извлеките классы

```bash
npm run build
node docs/archive/eslint-rules/extract-classes.cjs
```

### 2. Запустите проверку

```bash
npx eslint "features/**/*.vue"
```

## Правила

### 1. no-invalid-classes

**Цель:** Обнаруживает неактуальные классы, которых нет ни в Tailwind теме, ни в подключенных CSS файлах.

**Что проверяет:**

- Все классы в `class` атрибутах Vue компонентов
- Сравнивает с **реальными классами из собранного бандла** (`public/build/assets`)
- Проверяет **существование CSS переменных** `[var(--*)]`
- Сканирует CSS файлы в директории `features/` для поиска пользовательских классов
- Поддерживает модификаторы: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `hover:`, `focus:`, `active:`, `dark:`

**Как использовать:**

1. Соберите проект и извлеките классы:

```bash
npm run build
node docs/archive/eslint-rules/extract-classes.cjs
```

2. Запустите проверку:

```bash
npx eslint "features/**/*.vue"
```

**Примеры ошибок:**

```vue
<!-- ❌ Неправильно: класс не существует -->
<div class="custom-unknown-class">

<!-- ✅ Правильно: Tailwind класс -->
<div class="bg-blue-500 text-white">

<!-- ✅ Правильно: класс из CSS файла -->
<div class="my-custom-class">
```

**Конфигурация:**

```js
{
  "rules": {
    "inertia/no-invalid-classes": "error"
  }
}
```

---

### 2. require-responsive-classes

**Цель:** Проверяет полноту responsive и dark mode классов для обеспечения адаптивности и поддержки темной темы.

**Что проверяет:**

- Наличие responsive классов для всех breakpoints (sm, md, lg, xl, 2xl)
- Наличие dark mode вариантов для цветовых классов
- Достаточность стилизации элементов (фон, padding, цвет текста, hover состояния)

**Примеры ошибок:**

```vue
<!-- ❌ Неправильно: нет responsive вариантов -->
<div class="flex w-full">

<!-- ✅ Правильно: есть responsive варианты -->
<div class="flex w-full md:w-1/2 lg:w-1/3">

<!-- ❌ Неправильно: нет dark mode -->
<div class="bg-white text-gray-900">

<!-- ✅ Правильно: есть dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

<!-- ❌ Неправильно: фон без padding и цвета текста -->
<div class="bg-blue-500">

<!-- ✅ Правильно: полная стилизация -->
<div class="bg-blue-500 dark:bg-blue-700 p-4 text-white dark:text-gray-100">
```

**Конфигурация:**

```js
{
  "rules": {
    "inertia/require-responsive-classes": "warn"
  }
}
```

---

### 3. suggest-styling-improvements (ЭКСПЕРИМЕНТАЛЬНОЕ)

**Цель:** Экспериментально определяет потребность в дополнительных классах на основе контекста элемента.

**Что проверяет:**

- Анализирует тип элемента (card, button, input, container, heading, link)
- Предлагает улучшения на основе UI паттернов
- Проверяет контраст цветов
- Определяет недостающие интерактивные состояния

**Типы элементов и рекомендации:**

#### Card (Карточка)

```vue
<!-- ❌ Недостаточно стилизовано -->
<div class="bg-white">

<!-- ✅ Полная стилизация -->
<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
```

#### Button (Кнопка)

```vue
<!-- ❌ Недостаточно стилизовано -->
<button class="bg-blue-500">

<!-- ✅ Полная стилизация -->
<button class="bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 px-4 py-2 rounded-md transition-colors cursor-pointer">
```

#### Input (Поле ввода)

```vue
<!-- ❌ Недостаточно стилизовано -->
<input class="border">

<!-- ✅ Полная стилизация -->
<input class="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3 py-2 rounded-md">
```

#### Container (Контейнер)

```vue
<!-- ❌ Недостаточно стилизовано -->
<div class="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- ✅ Полная стилизация -->
<div class="flex gap-4 justify-between items-center">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

#### Heading (Заголовок)

```vue
<!-- ❌ Недостаточно стилизовано -->
<h1 class="text-2xl">

<!-- ✅ Полная стилизация -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">
```

#### Link (Ссылка)

```vue
<!-- ❌ Недостаточно стилизовано -->
<a href="#">Link</a>

<!-- ✅ Полная стилизация -->
<a href="#" class="text-blue-500 hover:text-blue-700 hover:underline transition-colors">Link</a>
```

**Проверки:**

1. **Фон и контраст**
    - Элементы с фоном должны иметь padding и явный цвет текста
    - Проверка контраста между фоном и текстом

2. **Интерактивность**
    - Кнопки и ссылки должны иметь hover и focus состояния
    - Интерактивные элементы должны иметь cursor-pointer
    - Состояния должны иметь transition для плавности

3. **Структура**
    - Flex/Grid контейнеры должны иметь gap/space для отступов
    - Контейнеры должны иметь выравнивание (justify, items)

4. **Визуальная глубина**
    - Карточки должны иметь тень или границу
    - Элементы должны иметь rounded для мягкости углов

**Конфигурация:**

```js
{
  "rules": {
    "inertia/suggest-styling-improvements": "warn" // или "off" для отключения
  }
}
```

---

## Использование

### В .eslintrc.cjs

```js
module.exports = {
  plugins: ['inertia'],
  rules: {
    // Обязательные правила
    'inertia/no-invalid-classes': 'error',
    'inertia/require-responsive-classes': 'warn',
    
    // Экспериментальное правило (опционально)
    'inertia/suggest-styling-improvements': 'warn'
  }
}
```

### Отключение для конкретных файлов

```vue
<!-- eslint-disable inertia/suggest-styling-improvements -->
<template>
  <div class="simple-div">
    <!-- Экспериментальное правило отключено для этого файла -->
  </div>
</template>
```

### Отключение для конкретной строки

```vue
<template>
  <!-- eslint-disable-next-line inertia/require-responsive-classes -->
  <div class="flex w-full">
    <!-- Правило отключено только для этого элемента -->
  </div>
</template>
```

---

## Рекомендации

1. **no-invalid-classes** - используйте как `error` для предотвращения опечаток
2. **require-responsive-classes** - используйте как `warn` для напоминания о responsive дизайне
3. **suggest-styling-improvements** - используйте как `warn` или отключите, если слишком много предупреждений

## Интеграция с CI/CD

```bash
# Проверка только критичных ошибок
npm run lint -- --rule 'inertia/no-invalid-classes: error'

# Проверка всех правил стилизации
npm run lint -- --rule 'inertia/no-invalid-classes: error' --rule 'inertia/require-responsive-classes: warn'
```

## Тестирование правил

Для тестирования правил на реальных файлах:

```bash
# Проверка конкретного файла
npx eslint features/shared/design-system/resources/js/components/BaseCard.vue

# Проверка всех Vue файлов в features
npx eslint "features/**/resources/**/*.vue"

# Проверка с выводом только ошибок
npx eslint "features/**/resources/**/*.vue" --quiet
```

### Примеры реальных файлов

Правила протестированы на:

- `features/shared/design-system/resources/js/components/BaseButton.vue`
- `features/shared/design-system/resources/js/components/BaseCard.vue`
- `features/business/auth/resources/js/components/LoginForm.vue`

### Особенности реализации

1. **CSS переменные**: Правила корректно обрабатывают Tailwind классы с CSS переменными вида
   `rounded-[var(--radius-button)]`
2. **Умеренность**: Правила настроены на минимальное количество ложных срабатываний
3. **Контекстность**: Экспериментальное правило анализирует контекст элемента перед выдачей рекомендаций
