# suggest-package-updates

| Параметр | Значение |
|----------|----------|
| actionId | suggest-package-updates |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение обновлений пакетов |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует зависимости и предлагает безопасные обновления пакетов.

## Анализ

### Критерии предложений
- Security patches
- Major/minor/patch обновления
- Breaking changes
- Deprecation warnings

### Типы обновлений
1. **Security updates** - Критические патчи безопасности
2. **Bug fixes** - Исправления багов
3. **Minor updates** - Новые функции без breaking changes
4. **Major updates** - Потенциально breaking changes

## Рекомендации

```
json
{
  "package": "lodash",
  "current": "4.17.15",
  "recommended": "4.17.21",
  "reason": "Security patch for CVE-2021-23337",
  "breaking": false
}
```

## Best Practices

- Использовать npm-check-updates
- Тестировать перед обновлением
- Использовать lock файлы
- Обновлять регулярно
- Использовать Dependabot
