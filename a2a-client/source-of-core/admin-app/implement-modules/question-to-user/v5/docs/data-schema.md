# Схемы Данных: Модуль `question-to-user` (QTU) v5

Этот документ описывает основные структуры данных (JSON), используемые модулем QTU v5.

## 1. Определения Наборов Вопросов

- **Расположение**: `implement-modules/question-to-user/v5/data/question_sets/*.json` (например, `default-set.json`)
- **Формат**: JSON-массив объектов, где каждый объект представляет один вопрос.

**Структура объекта вопроса:**

```json
{
  "id": "q001",                         // String. Уникальный идентификатор вопроса в рамках набора.
  "type": "InputText",                  // String. Тип UI-компонента для отображения.
                                        // Примеры: "InputText", "Textarea", "Select", "Checkbox", "RadioButtonGroup".
                                        // Должен соответствовать компонентам, поддерживаемым UI-фреймворком.
  "label": "Ваш основной запрос?",       // String. Текст вопроса или метка для поля ввода.
  "modelField": "mainQuery",            // String. Имя поля в модели данных формы. Ответ пользователя будет связан с этим ключом.
  "props": {                            // Object. Дополнительные свойства, передаваемые UI-компоненту. Содержимое зависит от `type`.
    "placeholder": "Например, улучшить производительность...", // (Для InputText, Textarea)
    "required": true,                   // Boolean. (Общее) Является ли ответ на вопрос обязательным.
    "options": [                        // Array. (Для Select, RadioButtonGroup, Checkbox с несколькими опциями)
      {"label": "Формальный", "value": "formal"}, // Объекты с `label` (отображаемый текст) и `value` (сохраняемое значение).
      {"label": "Неформальный", "value": "informal"}
      // Могут быть и просто строки, если label и value совпадают: "Option 1", "Option 2"
    ],
    "rows": 3                           // Number. (Для Textarea) Количество строк.
    // ... другие свойства, специфичные для компонента (например, `class`, `style`, `disabled`, etc.)
  },
  "validationRules": [                  // Array (Необязательно). Правила валидации для поля (синтаксис зависит от UI-фреймворка).
    // {"type": "required", "message": "Это поле обязательно для заполнения."}
    // {"type": "minLength", "value": 5, "message": "Минимальная длина 5 символов."}
  ],
  "defaultValue": ""                    // Any (Необязательно). Значение по умолчанию для поля.
}
```

**Ключевые поля:**

- `id`: Важен для уникальной идентификации, особенно если на UI-структуру ссылаются.
- `type`: Определяет, какой UI-компонент будет создан.
- `label`: Текст, видимый пользователю.
- `modelField`: Связывает UI-компонент с полем в объекте данных формы.
- `props`: Позволяет тонко настраивать внешний вид и поведение компонента.

## 2. Ответы Пользователя

- **Расположение**: `implement-modules/question-to-user/v5/data/user_answer_sets/*.json` (например,
  `current_answers.json`)
- **Формат**: JSON-объект, где ключи — это значения `modelField` из определений вопросов, а значения — ответы, введенные
  пользователем.

**Пример структуры:**

```json
{
  "mainQuery": "Оптимизировать процесс X.",
  "communicationStyle": "formal",
  "additionalDetails": "Хотелось бы также учесть фактор Y.",
  "acceptedTerms": true
  // ... другие поля, соответствующие modelField из набора вопросов
}
```

## 3. Сгенерированная UI-структура для формы

- **Расположение (пример сохранения для отладки)**:
  `implement-modules/question-to-user/v5/data/generated/question-ui.json`
- **Хранение в буфере**: `buffer:qtu.generatedUI`
- **Формат**: JSON-массив объектов, где каждый объект представляет UI-компонент, сгенерированный действием
  `load-question-set.json`. Структура этих объектов должна соответствовать ожиданиям UI-фреймворка для динамического
  рендеринга.

**Пример элемента в массиве (концептуально):**

```json
{
  "type": "InputText", // Соответствует `type` из определения вопроса
  "props": {
    "label": "Ваш основной запрос?",
    "placeholder": "Например, улучшить производительность...",
    "required": true
    // ... другие props, переданные или модифицированные
  },
  "model": { // Информация для привязки данных
    "form": "mainQtuResponseForm", // ID формы
    "field": "mainQuery"           // modelField
  }
  // ... другие атрибуты, необходимые UI-фреймворку
}
```

Точная структура зависит от реализации `load-question-set.json` и требований UI-фреймворка.

## 4. Данные для взаимодействия со сценариями

Эти структуры используются действиями `execute-main-work-scenario.json` и `reset-main-work-scenario.json`.

* **Маркеры сценариев**:
    * **Расположение**: `implement-modules/question-to-user/v5/data/markers/{scenarioId}.{contextId}.json` (или просто
      `{scenarioId}.json`)
    * **Формат**: JSON-объект для отслеживания состояния и передачи минимального контекста.
    * **Пример**: `{"status": "pending_execution", "timestamp": "2024-07-30T12:00:00Z", "inputHash": "xyz..."}`

* **Входные данные для сценариев**:
    * **Расположение**: `implement-modules/question-to-user/v5/data/scenario_inputs/{scenarioId}.json`
    * **Формат**: JSON-объект, содержащий данные, которые должен обработать сценарий.
    * **Пример**: `{"taskId": "TASK-001", "userInput": "some value", "params": {"mode": "detailed"}}`

* **Выходные данные сценариев**:
    * **Расположение**: `implement-modules/question-to-user/v5/data/scenario_outputs/{scenarioId}.json`
    * **Формат**: JSON-объект, содержащий результат выполнения сценария.
    * **Пример**: `{"status": "completed", "result": {"data": [...]}, "message": "Processed successfully."}`

## 5. Mock-данные для списков

- **Расположение**: `implement-modules/question-to-user/v5/data/system_lists/*.json`
    - `tasks.json`, `scenarios.json`, `dialog-definitions.json`
- **Формат**: JSON-массив объектов, каждый из которых обычно содержит `id` и `name` (или `label`).
- **Пример (`tasks.json`):**
  ```json
  [
    {"id": "TASK-001", "name": "Sample Task Alpha"},
    {"id": "TASK-002", "name": "Research Beta Topic"}
  ]
  ```

Эти схемы являются основой для работы модуля QTU v5. Важно поддерживать их консистентность и документировать любые
изменения. 
