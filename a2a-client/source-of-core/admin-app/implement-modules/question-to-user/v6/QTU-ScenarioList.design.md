# QTU-ScenarioList: Проектирование

## Назначение
Список доступных сценариев, фильтрация, поиск, быстрый старт.

---

## Best Practices
- Для списка использовать table (см. page, playground).
- Для фильтрации и поиска — отдельные секции/шаблоны (см. playground, landing-main-page).
- Для статусов и тегов — массивы, а не строки (см. playground).
- Для динамических секций использовать operation: include (см. page/sections, playground/sections).

### Пример секции с dynamic include
```json
{
  "type": "section",
  "props": { "title": "Фильтры" },
  "children": [
    { "operation": "include", "source": "file!qtu/sections/scenario-filters.json" }
  ]
}
```

---

## Пример структуры данных (view-only)
```json
{
  "type": "Page",
  "props": { "title": "Сценарии QTU" },
  "content": [
    {
      "type": "table",
      "props": {
        "columns": [
          { "label": "Название", "field": "title" },
          { "label": "Категория", "field": "category" },
          { "label": "Статус", "field": "status" }
        ],
        "data": "file!qtu/data/scenario-list.json"
      }
    },
    {
      "type": "section",
      "props": { "title": "Фильтры" },
      "children": [
        { "operation": "include", "source": "file!qtu/sections/scenario-filters.json" }
      ]
    }
  ]
}
```

---

## Расширяемость
- Для добавления новых фильтров — добавить шаблон в sections и использовать operation: include.
- Для динамических секций — использовать только operation: include.

## [Вопросы для обсуждения]
- Какие фильтры нужны в первую очередь?
- Какие данные из других модулей стоит отображать в списке сценариев? 