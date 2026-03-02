# ESLint Styling Rules - Полная документация

## 📋 Оглавление

1. [Обзор](#обзор)
2. [Установка и настройка](#установка-и-настройка)
3. [Правила](#правила)
4. [Извлечение классов из бандла](#извлечение-классов-из-бандла)
5. [Workflow](#workflow)
6. [CI/CD интеграция](#cicd-интеграция)
7. [Troubleshooting](#troubleshooting)

---

## Обзор

Три ESLint правила для автоматической проверки стилизации Vue компонентов:

| Правило                        | Описание                                               | Уровень |
|--------------------------------|--------------------------------------------------------|---------|
| `no-invalid-classes`           | Обнаруживает несуществующие классы из реального бандла | `error` |
| `require-responsive-classes`   | Проверяет полноту responsive и dark mode               | `warn`  |
| `suggest-styling-improvements` | Предлагает улучшения (экспериментально)                | `off`   |

### Ключевые возможности

- ✅ **Использует реальные данные из бандла** (`public/build/assets`)
- ✅ **Проверяет CSS переменные** `[var(--*)]` на существование
- ✅ **Находит устаревшие классы** при рефакторинге
- ✅ **Минимум ложных срабатываний** - умная фильтрация
- ✅ **Протестировано на реальных файлах** проекта

---

## Установка и настройка

### 1. Правила уже добавлены в проект

Файлы находятся в `docs/archive/eslint-rules/`:

- `no-invalid-classes.cjs`
- `require-responsive-classes.cjs`
- `suggest-styling-improvements.cjs`
- `extract-classes.cjs` (утилита)

### 2. Конфигурация ESLint

Правила уже активированы в `eslint.config.mjs`:

```js
rules: {
  "inertia/no-invalid-classes": "error",
  "inertia/require-responsive-classes": "warn",
  "inertia/suggest-styling-improvements": "off"
}
```

### 3. Первый запуск

```bash
# Соберите проект
npm run build

# Извлеките классы из бандла
node docs/archive/eslint-rules/extract-classes.cjs

# Запустите проверку
npx eslint "features/**/*.vue"
```

---

## Правила

### 1. no-invalid-classes

**Цель:** Обнаруживает классы, которых нет в собранном бандле.

**Что проверяет:**

- Классы из `public/build/assets/*.css` и `*.js`
- CSS переменные `[var(--*)]`
- Пользовательские классы из `features/**/*.css`
- Tailwind классы (50+ паттернов)

**Примеры:**

```vue
<!-- ❌ ERROR: класс не найден -->
<div class="some-unknown-class">

<!-- ❌ ERROR: переменная не существует -->
<div class="rounded-[var(--unknown-var)]">

<!-- ✅ OK: класс из бандла -->
<div class="rounded-lg border p-6">

<!-- ✅ OK: переменная существует -->
<div class="rounded-[var(--tw-translate-x)]">
```

**Конфигурация:**

```js
"inertia/no-invalid-classes": "error" // Рекомендуется
```

---

### 2. require-responsive-classes

**Цель:** Проверяет полноту responsive и dark mode классов.

**Что проверяет:**

- Наличие классов для breakpoints (sm, md, lg, xl, 2xl)
- Dark mode варианты для цветов
- Достаточность стилизации (фон → padding, border → shadow)

**Примеры:**

```vue
<!-- ⚠️ WARNING: нет dark mode -->
<div class="bg-white text-gray-900">

<!-- ✅ OK: есть dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

<!-- ⚠️ WARNING: нет responsive -->
<div class="flex w-full">

<!-- ✅ OK: есть responsive -->
<div class="flex w-full md:w-1/2 lg:w-1/3">

<!-- ⚠️ WARNING: фон без padding -->
<div class="bg-blue-500">

<!-- ✅ OK: полная стилизация -->
<div class="bg-blue-500 p-4 text-white">
```

**Конфигурация:**

```js
"inertia/require-responsive-classes": "warn" // Рекомендуется
```

---

### 3. suggest-styling-improvements (ЭКСПЕРИМЕНТАЛЬНО)

**Цель:** Предлагает улучшения на основе контекста элемента.

**Типы элементов:**

- Card (карточка)
- Button (кнопка)
- Input (поле ввода)
- Container (контейнер)
- Heading (заголовок)
- Link (ссылка)

**Примеры:**

```vue
<!-- ⚠️ WARNING: кнопка без hover -->
<button class="bg-blue-500 text-white px-4 py-2">

<!-- ✅ OK: полная стилизация -->
<button class="bg-blue-500 hover:bg-blue-600 focus:ring-2 px-4 py-2 rounded transition">

<!-- ⚠️ WARNING: карточка без padding -->
<div class="bg-white border rounded">

<!-- ✅ OK: полная стилизация -->
<div class="bg-white border rounded p-4 shadow-md">
```

**Конфигурация:**

```js
"inertia/suggest-styling-improvements": "off" // По умолчанию выключено
```

---

## Извлечение классов из бандла

### Зачем это нужно?

Правило `no-invalid-classes` использует **актуальные данные** из собранного бандла:

1. ✅ Точный список используемых классов
2. ✅ Актуальные CSS переменные
3. ✅ Автоматическое обнаружение устаревших переменных

### Как использовать

```bash
# 1. Соберите проект
npm run build

# 2. Извлеките классы
node docs/archive/eslint-rules/extract-classes.cjs

# Результат:
# Обработано CSS файлов: 2
# Обработано JS файлов: 236
# Найдено уникальных классов: 887
# Найдено Tailwind классов: 433
# Найдено CSS переменных: 328
```

### Что извлекается

Создается файл `extracted-classes.json`:

```json
{
  "meta": {
    "extractedAt": "2024-01-15T10:30:00.000Z",
    "totalClasses": 887,
    "tailwindClasses": 433,
    "cssVariables": 328
  },
  "classes": ["rounded-lg", "border", "p-6", ...],
  "tailwindClasses": ["rounded-lg", "border", ...],
  "cssVariables": ["tw-translate-x", "color-brand-primary", ...]
}
```

---

## Workflow

### Ежедневная разработка

```bash
# Проверка перед коммитом
npx eslint "features/**/*.vue"
```

### При удалении CSS переменных

```bash
# 1. Удаляете переменную из кода
# 2. Собираете проект
npm run build

# 3. Извлекаете актуальные данные
node docs/archive/eslint-rules/extract-classes.cjs

# 4. ESLint найдет все места с удаленной переменной!
npx eslint "features/**/*.vue"
```

### Автоматизация

Добавьте в `package.json`:

```json
{
  "scripts": {
    "build:full": "npm run build && node docs/archive/eslint-rules/extract-classes.cjs",
    "lint:styles": "eslint \"features/**/*.vue\" --rule \"inertia/no-invalid-classes: error\"",
    "precommit": "npm run lint:styles"
  }
}
```

---

## CI/CD интеграция

### GitHub Actions

```yaml
name: Lint Styles

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and extract classes
        run: |
          npm run build
          node docs/archive/eslint-rules/extract-classes.cjs
      
      - name: Lint styles
        run: npx eslint "features/**/*.vue" --rule "inertia/no-invalid-classes: error"
```

### GitLab CI

```yaml
lint-styles:
  stage: test
  script:
    - npm ci
    - npm run build
    - node docs/archive/eslint-rules/extract-classes.cjs
    - npx eslint "features/**/*.vue" --rule "inertia/no-invalid-classes: error"
```

---

## Troubleshooting

### Проблема: Много ложных срабатываний

**Решение:**

```bash
# Пересоберите проект и извлеките классы заново
npm run build
node docs/archive/eslint-rules/extract-classes.cjs
```

### Проблема: Файл extracted-classes.json не создается

**Решение:**
Проверьте, что директория `public/build/assets` существует и содержит собранные файлы.

### Проблема: Правило не находит классы из бандла

**Решение:**
Убедитесь, что `extracted-classes.json` находится в `docs/archive/eslint-rules/` директории.

### Проблема: Динамические классы помечаются как ошибки

**Решение:**
Правило автоматически пропускает:

- Computed классы (переменные)
- Выражения с `{`, `}`, `[`, `]`
- Условные операторы `?`, `:`

Если проблема остается, отключите правило для конкретной строки:

```vue
<!-- eslint-disable-next-line inertia/no-invalid-classes -->
<div :class="dynamicClasses">
```

---

## Статистика проекта

После извлечения классов:

```
Обработано CSS файлов: 2
Обработано JS файлов: 236
Найдено уникальных классов: 887
Найдено Tailwind классов: 433
Найдено CSS переменных: 328
```

### Примеры найденных CSS переменных:

- `--tw-translate-x`, `--tw-translate-y`
- `--tw-scale-x`, `--tw-scale-y`
- `--tw-rotate-x`, `--tw-rotate-y`
- `--color-brand-primary`
- `--radius-button`
- `--shadow-md`

### Примеры найденных Tailwind классов:

- `rounded-lg`, `border`, `p-6`
- `shadow-sm`, `text-gray-900`
- `dark:bg-gray-800`
- `hover:bg-blue-600`
- `focus:ring-2`

---

## Дополнительные ресурсы

- [README-Styling-Rules.md](./README-Styling-Rules.md) - Детальное описание правил
- [README-Extract-Classes.md](./README-Extract-Classes.md) - Руководство по извлечению классов
- [SUMMARY-Styling-Rules.md](./SUMMARY-Styling-Rules.md) - Краткая сводка

---

## Поддержка

При возникновении проблем:

1. Проверьте, что проект собран: `npm run build`
2. Извлеките классы заново: `node docs/archive/eslint-rules/extract-classes.cjs`
3. Проверьте конфигурацию ESLint: `eslint.config.mjs`
4. Проверьте версию Node.js: `node --version` (требуется v20+)

---

**Версия:** 1.0.0  
**Дата:** 2024  
**Статус:** ✅ Production Ready
