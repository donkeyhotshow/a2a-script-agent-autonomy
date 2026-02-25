# Simulation: fix-vue-imports

## Опис

Тестуємо екшен "Виправити зламані імпорти у Vue файлах".

## Workflow

```
1. Client → Server: task_request (task: "виправити імпорти у vue компонентах")
              ↓
2. Server → Client: action_proposal + context (пропонує fix-vue-imports з 4 sub-actions)
              ↓
3. Client → Server: approve_action + context
              ↓
4. Server → Client: action_executing + context
              ↓
5. Client → Server: step_result (vue-import-detect) + context
              ↓
6. Server → Client: action_executing + context
              ↓
... повторюється для кожного sub-action
```

## Sub-actions

1. **vue-import-detect** - сканує файли, знаходить зламані імпорти
2. **vue-import-resolve** - знаходить правильні шляхи
3. **vue-import-apply** - застосовує виправлення
4. **vue-import-cleanup** - очищує тимчасові файли

## Очікувані результати

- Сервер пропонує екшен fix-vue-imports з 4 sub-actions
- Кожен крок повертає action_executing з оновленим context
- Фінальний крок повертає action_complete
