# detect-weak-crypto

| Параметр | Значение |
|----------|----------|
| actionId | detect-weak-crypto |
| categoryId | security |
| executorSystemId | script |
| title | Детекция слабой криптографии |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет использование слабых криптографических алгоритмов.

## Детекция

### Слабые алгоритмы
- MD5
- SHA1
- DES
- RC4
- ECB mode
- weak PRNG

### Что искать
- Хеширование паролей без соли
- Использование небезопасных IV
- Short keys

## Результат

- Список уязвимых мест
- Рекомендуемые алгоритмы
- Severity

## Инструменты

- SonarQube
- npm audit
- CodeQL
- Bandit (Python)
