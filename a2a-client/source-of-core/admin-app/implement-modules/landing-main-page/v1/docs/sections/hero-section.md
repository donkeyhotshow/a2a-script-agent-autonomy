# Секция Hero (Основной Экран)

## Обзор

Секция Hero представляет собой первый экран лендинг-страницы. В реализации `landing-main-page` она содержит фоновое
изображение/градиент, основной заголовок, подзаголовок, две кнопки призыва к действию (CTA) и теги с социальным
доказательством (рейтинг, количество клиентов).

## Структура секции (Пример из `landing-main-page`)

Основной контейнер - `div` с фоном и flex/grid layout. Внутри него:

- Вложенные `div` для создания фоновых эффектов (градиенты, блюр).
- Основной контентный `div` (часто с использованием grid layout `col-span-X`).
    - `div` с заголовком (`h1`) и подзаголовком (`p`), часто обернутые для стилизации (например, полупрозрачный фон).
    - Компонент `ButtonGroup` для группировки кнопок CTA.
        - Два компонента `Button` ("Записатися зараз", "Наші послуги") с `customHooks` (`navigateTo` с `route`).
    - `div` с компонентами `Tag` для отображения рейтинга и количества клиентов.
- Дополнительные декоративные `div` или `Image`.

<!-- ```json
// Примерная структура, основанная на storage/aiInstaller/landing-main-page/sections/hero-section.json
{
  "type": "div",
  "name": "hero-section",
  "props": {
    "class": "flex flex-col ... relative min-h-[600px]",
    "style": "background: linear-gradient(...) ...;"
  },
  "children": [
    // Background effect divs
    { "type": "div", "props": { "class": "absolute inset-0 ..." } },
    // Main content grid container
    {
      "type": "div",
      "props": { "class": "grid grid-cols-12 ... relative z-10" },
      "children": [
        // Text content column
        {
          "type": "div",
          "props": { "class": "col-span-12 md:col-span-7 ..." },
          "children": [
            // Heading and Subheading div (with styling)
            {
              "type": "div",
              "props": { "content": "<h1...>...</h1><p>...</p>", "class": "mb-4 ... backdrop-blur-sm ..." }
            },
            // ButtonGroup for CTAs
            {
              "type": "ButtonGroup",
              "props": { "class": "flex ... gap-3 ..." },
              "children": [
                // Button "Записатися зараз"
                {
                  "type": "Button",
                  "props": { "label": "Записатися зараз", ... },
                  "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/booking" } }] }
                },
                // Button "Наші послуги"
                {
                  "type": "Button",
                  "props": { "label": "Наші послуги", ... },
                  "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/services" } }] }
                }
              ]
            },
            // Social Proof Tags div
            {
              "type": "div",
              "props": { "class": "flex ... gap-3 ... mt-6 ..." },
              "children": [
                { "type": "Tag", "props": { "value": "4.9/5 рейтинг", ... } },
                { "type": "Tag", "props": { "value": "1000+ клієнтів", ... } }
              ]
            }
          ]
        },
        // Image/Placeholder column
        {
          "type": "div",
          "props": { "class": "col-span-12 md:col-span-5 ..." },
          "children": [ ... ] // Placeholder image/content
        }
      ]
    },
    // Decorative elements
    { "type": "div", "name": "belt-placeholder", "props": { ... } }
  ]
}
``` -->

## Использование `navigateTo` в секции Hero

Кнопки призыва к действию (CTA) в Hero секции используют `customHooks` с действием `navigateTo` и параметром `route` для
перенаправления пользователя на другие страницы модуля (например, на страницу бронирования или услуг).

### Пример кнопки CTA

<!-- ```json
{
  "type": "Button",
  "props": {
    "label": "Записатися зараз",
    "class": "p-button-lg p-button-rounded ...",
    "style": "background-color: #F46700; ..."
  },
  "customHooks": {
    "click": [
      {
        "action": "navigateTo",
        "data": {
          // Внутренний путь для перехода
          "route": "/landing-main-page/booking"
        }
      }
    ]
  }
}
``` -->

## Рекомендации по созданию Hero-секции

- **Ясный заголовок:** Используйте `h1` для основного заголовка.
- **Привлекательный фон:** Используйте качественное фоновое изображение или градиенты.
- **Сильный CTA:** Используйте `Button` с `customHooks` (`navigateTo` с `route`) для кнопок призыва к действию.
- **Адаптивность:** Используйте grid layout (`grid-cols-X`) и `flexbox` для корректного отображения на разных
  устройствах.
- **Компоненты:** Используйте стандартные компоненты `div`, `Button`, `Tag`, `ButtonGroup`.

## Связанные разделы

- [UI Действия (`navigateTo`)](mdc:../../../../ui/json-ui/commands-and-operations/reference.md)
- [Компонент `Button`](mdc:../../../../ui/json-ui/components/button.md) (Предполагается)
- [Обзор секций лендинга](mdc:./README.md)

***

*Документация обновлена для соответствия реализации в `landing-main-page` и правилам
форматирования [md.mdc](../../../module-creating/md.mdc).* 
