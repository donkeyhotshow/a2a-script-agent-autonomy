# Страница Записи (`booking.json`)

## Обзор

Файл `booking.json` в модуле Landing Page v1 (`landing-main-page`) определяет отдельную страницу,
предназначенную для записи на прием.

## Структура страницы

Страница "Запис на прийом" состоит из следующих основных блоков:

1. **Хедер:** Включается стандартный хедер модуля (`sections/header-section`) с помощью операции `include`.
2. **Заголовок страницы:** `div` с основным заголовком (`h1`) и подзаголовком (`p`).
3. **Табы:** Компонент `Tabs` для разделения форм записи на разные типы услуг:
    * **Вкладка "Барбер послуги":**
        * Включает секцию с формой записи на барбер-услуги (`sections/booking/booking-form-section`) с помощью операции
          `include`.
        * **Форма (из `booking-form-section.json`):** Содержит `Dropdown` для выбора услуги и мастера, `Calendar` для
          даты/времени, `InputText` для имени/телефона, `Textarea` для комментария. Используются `model` для привязки
          данных, но кнопка "Записатись" **неактивна** (нет `customHooks`).
    * **Вкладка "Тату сесії":**
        * Содержит встроенную `Form` для записи на тату-сессию.
        * **Форма:** Содержит `InputText` (имя, email, телефон), `Dropdown` (тип сессии, мастер), `Calendar` (дата),
          `InputTextarea` (описание идеи). Кнопка "Записатися на сеанс" **неактивна** (нет `customHooks`).
    * **Вкладка "Преміум-пакети":**
        * Содержит статическое описание премиум-пакетов (вероятно, с использованием `Card`).
4. **Футер:** *(Предполагается, что должен включаться стандартный футер, хотя в проанализированном `booking.json`
   операция `include` (или `add`) для футера отсутствовала)*.

<!-- ```json
// Примерная структура booking.json
{
  "page": {
    "title": "Запис на прийом",
    "description": "...",
    "content": {
      "type": "Panel",
      "name": "booking-page",
      "children": [
        // Include Header
        { "type": "operation", "action": "include", "source": ".../header-section" },
        // Page Title div
        { "type": "div", "props": { ... }, "children": [...] },
        // Tabs Section
        {
          "type": "div",
          "name": "booking-tabs-section",
          "children": [
            {
              "type": "Tabs",
              "children": [
                // TabPanel "Барбер послуги"
                {
                  "type": "TabPanel",
                  "props": { "header": "Барбер послуги", ... },
                  "children": [
                    // Include Barber Booking Form Section
                    { "type": "operation", "action": "include", "source": ".../sections/booking/booking-form-section" }
                    // --> Contains Form with non-functional Button

                  ]
                },
                // TabPanel "Тату сесії"
                {
                  "type": "TabPanel",
                  "props": { "header": "Тату сесії", ... },
                  "children": [
                    // Inline div wrapper
                    {
                      "type": "div",
                      "children": [
                        // Title/Description
                        { ... },
                        // Inline Tattoo Booking Form
                        {
                          "type": "Form",
                          "children": [
                            // ... InputText, Dropdown, Calendar, Textarea ...
                            {
                              "type": "Button",
                              "props": { "label": "Записатися на сеанс", ... } // No customHooks
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                // TabPanel "Преміум-пакети"
                {
                  "type": "TabPanel",
                  "props": { "header": "Преміум-пакети", ... },
                  "children": [ ... ] // Static content (likely Cards)
                }
              ]
            }
          ]
        }
        // Missing Footer Include?
      ]
    }

}
}

``` -->

## Компоненты

- `Panel`, `div`, `Grid`, `Column`: Для структуры и разметки.
- `Tabs`, `TabPanel`: Для организации контента по вкладкам.
- `Form`: Контейнер для полей ввода.
- `InputText`, `Dropdown`, `Calendar`, `Textarea`: Компоненты для ввода данных.
- `Button`: Кнопки (в формах v1 - неактивные).
- `Card`: Для отображения премиум-пакетов (предположительно).

## Интерактивность (v1)

- **Функциональные формы отсутствуют:** Кнопки отправки форм ("Записатись", "Записатися на сеанс") не имеют `customHooks` и **не выполняют никаких действий** при нажатии.
- **Привязка данных (`model`):** Наличие `model` у полей ввода указывает на подготовку к v2+, где эти данные будут обрабатываться (вероятно, через `FormManager`), но в v1 это не имеет функционального эффекта.
- **Встроенная интерактивность:** Компонент `Tabs` предоставляет навигацию по вкладкам.

## Назначение в v1

Страница `booking.json` в версии v1 служит для **визуального представления интерфейса записи**. Она показывает пользователю, какие поля необходимо будет заполнить, но не позволяет реально отправить заявку.

## Связанные разделы

- [Обзор модуля Landing Page (v1)](mdc:./_index.md)
- [Секция Header](mdc:./sections/header-section.md)
- [Компонент Tabs](mdc:../../../../ui/json-ui/components/tabs.md) (Предполагается)
- [Компонент Form](mdc:../../../../ui/json-ui/components/form.md) (Предполагается)

***

*Документация создана на основе анализа `booking.json` и связанных секций из `landing-main-page` (v1)*. 
