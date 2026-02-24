# update-snapshots

| Параметр | Значение |
|----------|----------|
| actionId | update-snapshots |
| categoryId | snapshot |
| executorSystemId | script |
| title | Обновление snapshots |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически обновляет snapshot файлы после изменений в коде.

## Команды

### Jest
```
bash
# Обновить все snapshots
jest --updateSnapshot

# Обновить связанные snapshots
jest -u

# Обновить snapshot для конкретного файла
jest --updateSnapshot --testPathPattern=MyComponent
```

### Vitest
```
bash
# Обновить все snapshots
vitest update

# Обновить связанные snapshots
vitest -u
```

## Best Practices

- Проверить изменения перед обновлением
- Использовать --ci в CI/CD
- Review snapshots в PR
- Использовать --exclude для игнорирования
