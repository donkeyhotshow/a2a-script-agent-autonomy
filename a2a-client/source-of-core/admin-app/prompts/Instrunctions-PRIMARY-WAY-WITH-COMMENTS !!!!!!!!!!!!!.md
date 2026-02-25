```json
{
    // Бигуди для fileSelected.json: аккуратно, шаг за шагом!
    "type": "Instructions",
    "instructions": [
        // 1. (Отключено) Вывести входные данные для отладки
        {
            "disabled": true,
            "action": "print_r",
            "from": "input"
        },
        // 2. (Отключено) Вывести выходные данные для отладки
        {
            "disabled": true,
            "action": "print_r",
            "from": "output"
        },
        // 3. Обновить выбранный адрес в секции программы
        {
            "disabled": false,
            "action": "update",
            "from": "input",
            "to": "primary-form/data/program-section:selectedAddressItem"
        },
        // 4. Пометить, что адрес обновлён
        {
            "action": "update",
            "value": true,
            "to": "primary-form/data/program-section:addressIsUpdated"
        },
        // 5. Сохранить состояние секции программы
        {
            "action": "save",
            "from": "primary-form/data/program-section"
        },
        // 6. Установить флаг "output:full" в 1 (для дальнейшей логики)
        {
            "action": "update",
            "value": 1,
            "to": "output:full"
        }
    ]
    // Каждый шаг — отдельный виток бигуди: не спешим, всё фиксируем!
}
```