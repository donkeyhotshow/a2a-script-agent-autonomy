# Секция Header (Навигационная Панель)

## Обзор

Секция Header представляет собой верхнюю навигационную панель лендинг-страницы. В реализации `landing-main-page` она
включает логотип, название сайта (как `Tag`), основное меню навигации для десктопа,
кнопки действий (Записатися, Контакти), статическую информацию (часы работы) и кнопку для переключения мобильного меню.

## Структура секции (Пример из `landing-main-page`)

Основной контейнер - `div` с flex layout. Внутри него:

- Компонент `Logo` (кастомный или стандартный) с `navigateTo` для перехода на главную.
- Компонент `Tag` с названием сайта, также с `navigateTo`.
- `div`, содержащий навигационные `Link` для десктопа (скрыт на мобильных).
- `ButtonGroup`, содержащий основные кнопки действий ("Записатися", "Контакти").
- `div` со статической информацией (часы работы).
- `Button` для переключения мобильного меню (`toggleClass`, виден только на мобильных).
- Скрытый `div` (`mobile-menu`), содержащий навигацию для мобильных.

<!-- ```json
// Примерная структура, основанная на storage/aiInstaller/landing-main-page/sections/header-section.json
{
  "type": "div",
  "name": "header-section",
  "props": {
    "class": "py-6 px-4 ... flex items-center justify-between relative lg:static",
    // ... style ...
  },
  "children": [
    // Logo Component
    {
      "type": "Logo",
      "props": { ... },
      "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/page" } }] }
    },
    // Tag with Site Name
    {
      "type": "Tag",
      "props": { ... },
      "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/page" } }] }
    },
    // Desktop Navigation Links Container (hidden lg:flex)
    {
      "type": "div",
      "props": { "class": "items-center ... hidden lg:flex ..." },
      "children": [
        {
          "type": "div",
          "props": { "class": "list-none ... flex ... gap-4 lg:gap-8" },
          "children": [
            // Multiple Link components for desktop nav
            {
              "type": "Link",
              "props": { "content": "<a>Головна</a>", ... },
              "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/page" } }] }
            },
            // ... other links (Про нас, Послуги, Запис) ...
          ]
        }
      ]
    },
    // ButtonGroup for CTAs
    {
      "type": "ButtonGroup",
      "props": { "class": "flex ... gap-2" },
      "children": [
        // Button "Записатися"
        {
          "type": "Button",
          "props": { "label": "Записатися", ... },
          "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/booking" } }] }
        },
        // Button "Контакти"
        {
          "type": "Button",
          "props": { "label": "Контакти", ... },
          "customHooks": { "click": [{ "action": "navigateTo", "data": { "route": "/landing-main-page/contact" } }] }
        }
      ]
    },
    // Static Info (Opening Hours)
    {
      "type": "div",
      "props": { "class": "hidden md:flex ..." },
      "children": [ ... ] // Icon + Text
    },
    // Mobile Menu Toggle Button (lg:hidden)
    {
      "type": "Button",
      "props": { "icon": "pi pi-bars", "class": "lg:hidden ..." },
      "customHooks": { "click": [{ "action": "toggleClass", "data": { "selector": ".mobile-menu", "class": "hidden" } }] }
    },
    // Hidden Mobile Menu Container
    {
      "type": "div",
      "props": { "class": "mobile-menu hidden ..." },
      "children": [ ... ] // Contains mobile navigation links
    }
  ]
}
``` -->

## Использование `navigateTo` и `toggleClass`

В хедере основными механизмами интерактивности являются:

1. **`navigateTo` с параметром `route`:** Используется для всех внутренних навигационных ссылок (меню, логотип, кнопки
   CTA). Обеспечивает переход на соответствующие страницы модуля.
2. **`toggleClass`:** Используется кнопкой мобильного меню для добавления/удаления класса `hidden` у контейнера
   мобильного меню (`.mobile-menu`).

### Пример навигации с `navigateTo` (`route`)

<!-- ```json
// Внутри компонента Link или Button
"customHooks": {
  "click": [
    {
      "action": "navigateTo",
      "data": {
        // Указываем внутренний путь приложения
        "route": "/landing-main-page/services"
      }
    }
  ]
}
``` -->

### Пример переключения мобильного меню с `toggleClass`

<!-- ```json
// Внутри компонента Button для мобильного меню
"customHooks": {
  "click": [
    {
      "action": "toggleClass",
      "data": {
        // CSS селектор меню
        "selector": ".mobile-menu",
        // Класс для переключения
        "class": "hidden"
      }
    }
  ]
}
``` -->

## Рекомендации по хедеру

1. **Фиксированное положение**: Используйте CSS (например, `fixed top-0`) для закрепления хедера.
2. **Адаптивность**: Реализуйте отдельную логику показа/скрытия для десктопного и мобильного меню (например, с помощью
   `hidden lg:flex` и `lg:hidden`).
3. **Интерактивность**: Используйте `navigateTo` с `route` для внутренней навигации и `toggleClass` для переключения
   видимости элементов (например, мобильного меню).
4. **Консистентность**: Поддерживайте единый стиль навигационных элементов.
5. **Компоненты**: Используйте стандартные (`div`, `Button`, `Link`) и кастомные (`Logo`) компоненты по необходимости.

***

*Документация обновлена для соответствия реализации в `landing-main-page` и правилам
форматирования [md.mdc](../../../module-creating/md.mdc).*
