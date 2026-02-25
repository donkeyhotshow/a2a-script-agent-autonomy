# types/

В этой папке хранятся атомарные инструкции для работы с базовыми типами данных:
- bool
- string
- number
- object
- array
- null

## Принципы
- Каждый файл — отдельная инструкция для одного типа.
- Формат: JSON-объект с ключами `type`, `instructions`.
- Используйте только необходимые поля: value, to, from, batch и т.д.

## Пример: bool.json
```json
{
    "type": "Instructions",
    "instructions": [
        {
            "action": "update",
            "value": true,
            "to": "buffer:flag"
        }
    ]
}
```

## Пример: object.json
```json
{
    "type": "Instructions",
    "instructions": [
        {
            "action": "update",
            "value": {
                "profile": {
                    "id": 1,
                    "name": "Bob"
                }
            },
            "to": "buffer:userData"
        }
    ]
}
``` 