# Логика преобразования правил валидации в формат Instructions

Этот документ описывает шаги и принципы преобразования правил валидации, определенных в формате `ValidationRules` / `ValidationRuleSet`, в последовательность инструкций формата Instructions. Цель — сохранить логику валидации и ее результаты (`validationFailed`, `validationErrors`) в формате, пригодном для выполнения процессором инструкций.

**Ключевой принцип:** Каждое правило валидации (например, `required`, `minLength`, `maxLength`, `regex`) преобразуется в одну или несколько инструкций `update` с соответствующим параметром `condition`.

## Шаги преобразования:

1.  **Инициализация состояния валидации:** В начале последовательности Instructions добавляются инструкции для инициализации буферных переменных, хранящих состояние валидации. По умолчанию валидация считается успешной.
    *   `update` с `value: false` в `buffer:validationFailed`
    *   `update` с `value: {}` в `buffer:validationErrors`

2.  **Обработка каждого правила валидации:** Для каждого правила в `ValidationRules` / `ValidationRuleSet` генерируется инструкция `update` с блоком `batch`.

3.  **Формирование условия (condition):** Логика правила валидации преобразуется в выражение для параметра `condition` инструкции `update`.
    *   Правило `required`: Преобразуется в условие `["isEmpty", "input:<имя_поля>"]`.
    *   Правило `minLength`: Преобразуется в условие `["lessThan", {"with": "count", "from": "input:<имя_поля>"}, <минимальная_длина>]`. Может комбинироваться с условием на `!buffer:validationFailed`, чтобы избежать дублирования ошибок, если поле уже провалило `required`.
    *   _(_**Примечание:** _Логика преобразования других типов правил валидации (например, `maxLength`, `regex`, `email`, `numeric`) должна быть добавлена здесь по мере их анализа и верификации._*)

4.  **Формирование блока batch:** Блок `batch` инструкции `update` содержит действия, выполняемые при срабатывании условия (то есть, при провале валидации).
    *   Первое действие в `batch`: `update` с `value: true` в `buffer:validationFailed`.
    *   Второе действие в `batch`: `update` с сообщением об ошибке в соответствующий ключ в объекте `buffer:validationErrors`. Рекомендуется использовать составной ключ, например, `buffer:validationErrors.<имя_поля>_<тип_правила>`, чтобы разные правила для одного поля не перезаписывали друг друга.

5.  **Последовательность инструкций:** Инструкции для разных правил валидации добавляются в общую последовательность `instructions`.

6.  **Доступность результатов:** Результаты валидации (`buffer:validationFailed`, `buffer:validationErrors`) доступны в буфере после выполнения последовательности инструкций и могут быть использованы последующими инструкциями или вызвавшей логикой.

## Пример преобразования (`ai-probe-validation.json`)

**Исходные правила (концептуально):**

```json
{
  // ... другие поля ...
  "validationRules": {
    "defaultField": [
      {"rule": "required"},
      {"rule": "minLength", "value": 3}
    ]
  }
  // ... другие поля ...
}
```

**Преобразовано в формат Instructions:**

```json
{
    "type": "Instructions",
    "instructions": [
        {
            "action": "update",
            "value": false,
            "to": "buffer:validationFailed"
        },
        {
            "action": "update",
            "value": {},
            "to": "buffer:validationErrors"
        },
        {
            "action": "update",
            "condition": [
                "isEmpty",
                "input:defaultField"
            ],
            "batch": [
                {
                    "value": true,
                    "to": "buffer:validationFailed"
                },
                {
                    "value": "This field cannot be empty",
                    "to": "buffer:validationErrors.defaultField_required"
                }
            ]
        },
        {
            "action": "update",
            "condition": [
                "and",
                "!buffer:validationFailed", // Проверяем minLength только если required пройден
                ["lessThan", {"with": "count", "from": "input:defaultField"}, 3]
            ],
            "batch": [
                {
                    "value": true,
                    "to": "buffer:validationFailed"
                },
                 {
                    "value": "Answer must be at least 3 characters long",
                    "to": "buffer:validationErrors.defaultField_minLength"
                }
            ]
        }
    ]
}
```

## Areas for further analysis:

-   Документировать преобразование всех поддерживаемых правил валидации в условия Instructions.
-   Уточнить, как обрабатываются кастомные правила валидации, если таковые имеются.
-   Проверить, требуется ли инструкция `save` после валидации, и если да, то при каких условиях и куда сохраняются результаты.

**Source File Type:** Validation definition (e.g., `ai-probe-validation.json`)
**Target File Type:** Instructions (standard structure: `{"type": "Instructions", "instructions": [...]}`)
**Reference Example:** [`implement-modules/login-form/v1/validations/login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json)

## Open Questions / Analysis Needed:

- Confirmation of the exact source address for data being validated if not consistently `input:`.
- How the calling context expects the validation results (`buffer:validationFailed`, `buffer:validationErrors`) to be used or propagated.