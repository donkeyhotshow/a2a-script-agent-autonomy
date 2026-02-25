# Секция Features (Преимущества)

## Обзор

Секция "Features" (Преимущества) в модуле Landing Page (`landing-main-page`) предназначена для демонстрации ключевых
преимуществ или особенностей сервиса в виде наглядных карточек.

## Структура секции (Пример из `landing-main-page`)

Секция обычно состоит из:

- Основного `div`-контейнера с фоном и отступами.
- Заголовочной части (`div` с текстом `h2` и `span`/`p`).
- Компонента `Grid` (или `div` с классами `Tailwind`) для расположения карточек преимуществ.
- Нескольких компонентов `Card`, каждый из которых представляет одно преимущество.
    - Внутри `Card`:
        - `div` с `Icon` для визуального представления.
        - `div` с текстом (`h5` и `span`/`p`), описывающим преимущество.

<!-- ```json
// Примерная структура, основанная на storage/aiInstaller/landing-main-page/sections/features-section.json
{
  "type": "div",
  "name": "features-section",
  "props": {
    "class": "py-4 sm:py-6 md:py-8 ...",
    "style": "background: linear-gradient(...) ...;"
  },
  "children": [
    // Title div
    {
      "type": "div",
      "props": { "content": "<h2...>Наші переваги</h2>...", "class": "col-span-12 text-center mb-4 ..." }
    },
    // Grid Container
    {
      "type": "div", // Может быть и Grid компонент
      "props": { "class": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ..." },
      "children": [
        // Feature Card 1
        {
          "type": "Card",
          "props": { "class": "p-3 sm:p-4 h-full ...", "style": "background: linear-gradient(...) ...;" },
          "children": [
            // Icon Container
            {
              "type": "div",
              "props": { "class": "flex items-center justify-center mb-3 ... rounded-full", "style": "width: 3.5rem; height: 3.5rem; ..." },
              "children": [ { "type": "Icon", "props": { "class": "pi pi-fw pi-users ..." } } ]
            },
            // Text Container
            {
              "type": "div",
              "props": { "content": "<h5...>Зручний сервіс</h5><span...>...</span>" }
            }
          ]
        },
        // Feature Card 2 (e.g., Сучасний дизайн)
        { ... },
        // Feature Card 3 (e.g., Досвідчені майстри)
        { ... },
        // ... other feature cards
      ]
    }
  ]
}
``` -->

## Компоненты

- `div`: Используется для структурирования, заголовков и текстового контента.
- `Grid`: Для создания сетки карточек (может быть реализован через `div` с классами `Tailwind` grid).
- `Card`: Основной контейнер для каждого преимущества.
- `Icon`: Для визуального представления преимущества (используются иконки `PrimeIcons`).

## Интерактивность

Секция `features-section` в данной реализации является **полностью статической**. Она не содержит:

- Кнопок с действиями (`customHooks`).
- Ссылок (`Link`) для навигации.
- Форм или других интерактивных элементов.

Ее единственная цель - отображение информации о преимуществах.

## Рекомендации

- Используйте консистентный дизайн для всех карточек.
- Подбирайте иконки (`Icon`), которые четко отражают суть преимущества.
- Текст должен быть кратким и понятным.

## Связанные разделы

- [Обзор секций лендинга](mdc:./README.md)
- [Компонент `Card`](mdc:../../../../ui/json-ui/components/card.md) (Предполагается)
- [Компонент `Icon`](mdc:../../../../ui/json-ui/components/icon.md) (Предполагается)

***

*Документация создана на основе анализа `features-section.json` из `landing-main-page` и правил
форматирования [md.mdc](../../../module-creating/md.mdc).* 
