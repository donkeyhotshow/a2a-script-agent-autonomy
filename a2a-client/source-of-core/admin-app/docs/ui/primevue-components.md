# PrimeVue в модульной системе JSON UI

Данный документ описывает **специфику интеграции** компонентов PrimeVue в рамках модульной системы JSON UI, включая
структуру JSON, привязку данных, обработку событий и известные ограничения.

> **Важно:** Этот документ **не заменяет** [официальную документацию PrimeVue](https://primevue.org/documentation). Для
> получения полной информации о свойствах (`props`), слотах (`slots`) и событиях каждого компонента обращайтесь к
> официальным ресурсам.

## Общая структура JSON для компонентов PrimeVue

В JSON UI компоненты PrimeVue объявляются с использованием следующей общей структуры:

```json
{
  "type": "ИмяКомпонентаPrimeVue", // Имя компонента PrimeVue (PascalCase)
  "name": "уникальный-идентификатор", // Опциональный идентификатор для компонента
  "props": { // Свойства компонента (См. документацию PrimeVue)
    "свойство1": "значение1", // Статическое значение
    "свойство2": "{data/source/path}", // Привязка к данным из StateManager (hub.get)
    "class": "text-primary-500 bg-surface-100 ...", // Классы Tailwind CSS,
    "content": "Текстовое содержимое" // Для простых компонентов, если применимо
  },
  "model": { // Для двунаправленной привязки данных (v-model)
    "form": "имя-формы", // Имя формы, управляемой FormManager
    "field": "имя-поля" // Имя поля в этой форме
  },
  "customHooks": { // Для обработки событий компонента
    "имяСобытияPrimeVue": [ // События PrimeVue (e.g., click, change, input, select, nodeSelect)
      { // Одно или несколько стандартных действий JSON UI
        "action": "имяСтандартногоДействия", // e.g., sendData, dialogOpened, themeChange
        "data": { ... } // Параметры действия (см. actions-documentation.md)
      }
      // Можно добавить другие действия
    ]
  },
  "children": [ // Для компонентов-контейнеров (Card, Panel, etc.)
    // Вложенные JSON-описания дочерних компонентов (такая же структура)
  ]
}
```

### Ключевые отличия от стандартного Vue

- **Декларативность:** Компоненты и их связи определяются в JSON.
- **Привязка данных:**
    - **Однонаправленная:** Через `props`, с возможностью получения данных из `StateManager` (`hub`) используя синтаксис
      `{path}`.
    - **Двунаправленная:** Через `model`, который связывает поле ввода с [
      `FormManager`](../managers/form/formManager.md).
- **Обработка событий:** Используются `customHooks` для привязки событий PrimeVue
  к [стандартным действиям JSON UI](../constants/actions-documentation.md), которые обрабатываются [
  `ActionManager`](../managers/common/actionManager.md).
- **Вложенность:** Используется массив `children` для компонентов-контейнеров или специфичные `props` (например,
  `options` для `Select`, `nodes` для `TreeSelect`).

## Привязка данных

- **Двунаправленная (`model`):** Связывает компонент ввода с полем в форме, управляемой [
  `FormManager`](../managers/form/formManager.md).
  ```json
  {
    "type": "InputText",
    "props": { "placeholder": "Имя пользователя" },
    "model": { "form": "login-form", "field": "username" }
  }
  ```
- **Однонаправленная (`props`):** Отображает данные из [`StateManager` (hub)](../managers/hub/hubManager.md) или
  статические значения.
  ```json
  {
    "type": "DataTable",
    "props": {
      "value": "{users/list}", // Получить данные из hub.get('users.list')
      "paginator": true,
      "rows": 10
    }
  }
  ```

## Обработка событий (`customHooks`)

События компонентов PrimeVue (полный список в документации PrimeVue) связываются
с [стандартными действиями JSON UI](../constants/actions-documentation.md). Эти действия затем обрабатываются [
`ActionManager`](../managers/common/actionManager.md), который может взаимодействовать с другими менеджерами (
например, [`ToastManager`](../managers/log/toastManager.md), [`ModalManager`](../managers/layout/modalManager.md)).

```json
{
  "type": "Button",
  "props": { "label": "Показать детали", "icon": "pi pi-search" },
  "customHooks": {
    "click": [ // Событие 'click' компонента Button
      {
        "action": "dialogOpened", // Стандартное действие
        "data": { "dialogId": "item-details-modal", "contentPath": "{selectedItem/details}" }
      },
      {
        "action": "logInfo", // Еще одно стандартное действие
        "data": { "message": "Детали показаны для элемента {selectedItem/id}" }
      }
    ]
  }
}
```

> Список доступных **стандартных действий** см. в [Actions Documentation](../constants/actions-documentation.md).
> Список доступных **событий** для каждого компонента PrimeVue см.
> в [официальной документации PrimeVue](https://primevue.org/documentation).

## Стилизация

Стилизация компонентов PrimeVue в JSON UI выполняется преимущественно с помощью **Tailwind CSS**, классы которого
указываются в `props.class`.

```json
{
  "type": "Card",
  "props": {
    "class": "w-full max-w-2xl p-4 border rounded-lg shadow-md bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-200"
  },
  "children": [ ... ]
}
```

> Используйте утилиты и классы,
> предоставляемые [PrimeVue Tailwind Pass Through](https://primevue.org/passthrough/tailwind/), для более глубокой
> кастомизации стандартных стилей PrimeVue.

## Рекомендации

- **Именование:** Используйте `kebab-case` для `name` компонентов и для `form`/`field` в `model`.
- **Производительность:** Для больших списков или таблиц используйте компоненты с пагинацией (`DataTable`, `DataView`)
  или виртуальным скроллингом (`VirtualScroller`), если применимо.
- **Централизация:** Используйте [стандартные события](../constants/events-documentation.md)
  и [действия](../constants/actions-documentation.md) для межкомпонентного взаимодействия вместо прямой передачи
  колбэков через props.
- **Доступность:** Убедитесь, что компоненты правильно сконфигурированы для доступности (ARIA-атрибуты, управление
  фокусом), хотя PrimeVue обычно хорошо справляется с этим по умолчанию.

## Связанные документы

- **[Официальная документация PrimeVue](https://primevue.org/documentation)** (Основной источник по компонентам)
- [JSON UI: Глобальные Менеджеры (`hub`)](../../json-ui/core-concepts/managers.md)
- [JSON UI: Стандартные Действия](../constants/actions-documentation.md)
- [JSON UI: Стандартные События](../constants/events-documentation.md)
- [Документация `FormManager`](../managers/form/formManager.md)
- [Документация `ActionManager`](../managers/common/actionManager.md)
- [Документация `StateManager (hub)`](../managers/hub/hubManager.md)
- [Примеры модульных интерфейсов](./ui-examples.md) (если существует)
- [Руководство по стилизации с Tailwind CSS](./tailwind-styling-guide.md) (если существует)
- [Компонент Link](./technical/link.md) (Пример документации на конкретный компонент/элемент)
