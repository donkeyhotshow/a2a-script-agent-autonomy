# Извлечение классов и CSS переменных из бандла

## Зачем это нужно?

Правило `no-invalid-classes` использует **актуальные данные из собранного бандла** для проверки классов:

1. ✅ **Точный список Tailwind классов** - только те, что реально используются
2. ✅ **Актуальные CSS переменные** - проверка `[var(--*)]` на существование
3. ✅ **Пользовательские классы** - из ваших CSS файлов
4. ✅ **Автоматическое обнаружение устаревших переменных** - при удалении переменных

## Как использовать

### 1. Соберите проект

```bash
npm run build
# или
php artisan build
```

### 2. Извлеките классы из бандла

```bash
node docs/archive/eslint-rules/extract-classes.cjs
```

Это создаст файл `extracted-classes.json` с данными:

```json
{
  "meta": {
    "extractedAt": "2024-01-15T10:30:00.000Z",
    "totalClasses": 887,
    "tailwindClasses": 433,
    "cssVariables": 328
  },
  "classes": ["rounded-lg", "border", "p-6", ...],
  "tailwindClasses": ["rounded-lg", "border", "p-6", ...],
  "cssVariables": ["tw-translate-x", "color-brand-primary", ...]
}
```

### 3. Запустите ESLint

```bash
npx eslint "features/**/*.vue"
```

Правило автоматически использует `extracted-classes.json` если он существует.

## Что проверяется

### ✅ Валидные классы из бандла

```vue
<!-- OK: класс найден в бандле -->
<div class="rounded-lg border p-6 shadow-sm">
```

### ✅ Валидные CSS переменные

```vue
<!-- OK: переменная существует в бандле -->
<div class="rounded-[var(--tw-translate-x)]">

<!-- ❌ ERROR: переменная не найдена -->
<div class="rounded-[var(--unknown-variable)]">
```

### ❌ Неактуальные классы

```vue
<!-- ❌ ERROR: класс не найден -->
<div class="some-old-unused-class">
```

## Workflow при удалении CSS переменных

1. Удаляете CSS переменную из кода
2. Собираете проект: `npm run build`
3. Извлекаете классы: `node docs/archive/eslint-rules/extract-classes.cjs`
4. Запускаете ESLint: `npx eslint "features/**/*.vue"`
5. ESLint находит все места, где используется удаленная переменная! 🎯

## Автоматизация

Добавьте в `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "extract-classes": "node docs/archive/eslint-rules/extract-classes.cjs",
    "build:full": "npm run build && npm run extract-classes",
    "lint:styles": "eslint \"features/**/*.vue\" --rule \"inertia/no-invalid-classes: error\""
  }
}
```

Теперь можно:

```bash
# Полная сборка с извлечением
npm run build:full

# Проверка стилей
npm run lint:styles
```

## CI/CD интеграция

```yaml
# .github/workflows/lint.yml
- name: Build and extract classes
  run: |
    npm run build
    node docs/archive/eslint-rules/extract-classes.cjs

- name: Lint styles
  run: npx eslint "features/**/*.vue" --rule "inertia/no-invalid-classes: error"
```

## Статистика

После извлечения вы увидите:

```
Обработано CSS файлов: 2
Обработано JS файлов: 236
Найдено уникальных классов: 887
Найдено Tailwind классов: 433
Найдено CSS переменных: 328
```

## Примеры найденных данных

### CSS переменные:
- `--tw-translate-x`
- `--tw-translate-y`
- `--tw-scale-x`
- `--color-brand-primary`
- `--radius-button`
- `--shadow-md`

### Tailwind классы:
- `rounded-lg`
- `border`
- `p-6`
- `shadow-sm`
- `text-gray-900`
- `dark:bg-gray-800`

## Преимущества

1. **Точность** - проверяются только реально используемые классы
2. **Актуальность** - данные всегда соответствуют текущему бандлу
3. **Производительность** - быстрая проверка по готовому списку
4. **Рефакторинг** - легко находить устаревшие переменные при удалении
5. **CI/CD** - автоматическая проверка в pipeline

## Troubleshooting

### Файл extracted-classes.json не создается

Проверьте, что директория `public/build/assets` существует и содержит собранные файлы.

### Много ложных срабатываний

Пересоберите проект и извлеките классы заново:

```bash
npm run build
node docs/archive/eslint-rules/extract-classes.cjs
```

### Правило не находит классы из бандла

Убедитесь, что `extracted-classes.json` находится в `docs/archive/eslint-rules/` директории.
