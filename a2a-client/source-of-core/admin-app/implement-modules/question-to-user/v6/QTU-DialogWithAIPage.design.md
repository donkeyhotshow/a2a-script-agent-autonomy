# QTU-DialogWithAIPage: Проектирование

## Назначение
Страница для формального диалога с ИИ: обмен текстовыми сообщениями, быстрые команды, получение и отправка структурированных данных.

---

## Best Practices
- Для истории сообщений использовать массив объектов (см. playground).
- Для отправки структурированных форм — отдельные секции/шаблоны (см. playground, page).
- Для ошибок и статусов — отдельные поля error, editable (см. playground).
- Для динамических секций использовать operation: include (см. page/sections, playground/sections).

### Пример секции с dynamic include
```json
{
  "type": "section",
  "props": { "title": "История сообщений" },
  "children": [
    { "operation": "include", "source": "file!qtu/sections/dialog-messages.json" }
  ]
}
```

---

## Пример структуры данных (view-only)
```json
{
  "type": "Page",
  "props": { "title": "Диалог с AI" },
  "content": [
    {
      "type": "section",
      "props": { "title": "История сообщений" },
      "children": [
        { "operation": "include", "source": "file!qtu/sections/dialog-messages.json" }
      ]
    },
    {
      "type": "section",
      "props": { "title": "Отправить сообщение" },
      "children": [
        { "type": "form", "props": { "fields": [/* ... */] } }
      ]
    }
  ]
}
```

---

## Расширяемость
- Для добавления новых типов сообщений — добавить шаблон в sections и использовать operation: include.
- Для динамических секций — использовать только operation: include.

## [Вопросы для обсуждения]
- Какие типы сообщений нужны в первую очередь?
- Какие данные из других модулей стоит отображать в диалоге? 