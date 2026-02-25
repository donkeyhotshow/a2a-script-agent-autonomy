# Simulation: analyze-vue

## Опис

Тестуємо екшен "Аналіз Vue компонентів" - перевірка структури, props, emits, composition API та стилів.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати Vue компоненти")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-vue з 7 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-vue-files)
           ↓
5. Client → Server: step_result (scan-vue-files) + context
           ↓
6. Server → Client: action_executing + context (analyze-vue-props)
           ↓
7. Client → Server: step_result (analyze-vue-props) + context
           ↓
8. Server → Client: action_executing + context (generate-vue-report)
           ↓
9. Client → Server: step_result (generate-vue-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-vue-files** - сканування Vue файлів
2. **analyze-vue-props** - аналіз props
3. **analyze-vue-emits** - аналіз emits
4. **generate-vue-report** - генерація звіту

## Очікувані результати

- Сервер пропонує екшен analyze-vue з 7 sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з Vue звітом
