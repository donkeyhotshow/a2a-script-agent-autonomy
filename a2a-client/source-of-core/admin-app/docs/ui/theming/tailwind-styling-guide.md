## (Innactive standard/recheck)  Руководство по стилизации с Tailwind CSS

Данный документ описывает принципы использования Tailwind CSS в модульной системе JSON UI.

> **Важно:** Для полного понимания Tailwind CSS обращайтесь
> к [официальной документации Tailwind CSS](https://tailwindcss.com/docs).

## Приоритеты стилизации

1. **Vue Flow** (Базовые стили)
2. **PrimeVue** (Стили компонентов)
3. **Tailwind CSS** (Утилитарные классы)

## Применение классов

Классы Tailwind применяются через `props.class` в JSON-структурах компонентов:

```json
{
  "type": "Card",
  "props": {
    "class": "w-full max-w-md mx-auto mt-8 p-6 bg-surface-900 text-surface-0 rounded-lg shadow-xl"
  }
}
```

## Интеграция с PrimeVue

Классы Tailwind могут переопределять или дополнять стили PrimeVue:

```json
{
  "type": "Button",
  "props": {
    "label": "Submit",
    "class": "bg-primary-600 hover:bg-primary-700 border-primary-600 text-white px-4 py-2 rounded-lg"
  }
}
```

> **Внимание:** Будьте осторожны при переопределении базовых стилей PrimeVue, чтобы не нарушить функциональность или
> доступность компонента.

## Темизация и цвета

- Используйте цветовую палитру, определенную в [Рекомендациях по дизайну](./design-guidelines.md).
- Для темной темы используйте префикс `dark:`.

```json
{
  "type": "Card",
  "props": {
    "class": "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
  }
}
```

## Стилистические рекомендации

- **Группировка:** Группируйте классы по назначению (размеры, отступы, цвета) для читаемости.
- **Пользовательские классы:** Для повторяющихся комбинаций используйте `@apply` в SCSS файлах или плагины Tailwind.
- **Консистентность:** Придерживайтесь единых паттернов стилизации для схожих элементов.

## Оптимизация

- **PurgeCSS:** Настройте PurgeCSS в `tailwind.config.js` для удаления неиспользуемых стилей в продакшн-сборке.

```js
// tailwind.config.js
module.exports = {
  purge: [
    './storage/json-ui/**/*.json',
    './resources/**/*.blade.php',
    './resources/**/*.vue'
  ],
  // ...
}
```

## Связанные документы

- [Официальная документация Tailwind CSS](https://tailwindcss.com/docs)
- [Рекомендации по дизайну](./design-guidelines.md)
- [Использование компонентов PrimeVue](./primevue-components.md)
- [Примеры модульных интерфейсов](./ui-examples.md) 
