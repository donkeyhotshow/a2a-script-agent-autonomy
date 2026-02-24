# Simulation Action 2 - Analysis

## Request

Клиент одобрил action:
```json
{
  "action": "approve_action",
  "selectedAction": {
    "actionId": "fix-vue-imports"
  }
}
```

## Response

Сервер возвращает DSL скрипт для первого sub-action:

### Выполняется

```json
{
  "actionId": "vue-import-detect",
  "dsl": {
    "script": "vue-import-detect",
    "input": {},
    "output": "broken_imports[]"
  }
}
```

### DSL Script

```typescript
// vue-import-detect.dsl
// Определить сломанные импорты в Vue файлах

const result = await script.execute('vue-import-detect', {
  rootDir: './resources/js',
  extensions: ['.vue', '.js', '.ts'],
  aliases: {
    '@': 'resources/js',
    '~': 'resources'
  }
});

// result = [{ file, line, specifier }]
```

## Workflow

```
approve_action → Сервер → DSL скрипт → Клиент выполняет
                              ↓
                     vue-import-detect
                              ↓
                     Результат → Следующий step
```

## Sub-actions

1. vue-import-detect (текущий)
2. vue-import-resolve
3. vue-import-apply
4. vue-import-cleanup
