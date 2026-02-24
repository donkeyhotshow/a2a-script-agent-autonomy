# detect-xss

| Параметр | Значение |
|----------|----------|
| actionId | detect-xss |
| categoryId | security |
| executorSystemId | script |
| title | Детекция XSS |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет потенциальные уязвимости XSS (Cross-Site Scripting) в коде.

## Детекция

### Типы XSS
- Reflected XSS
- Stored XSS
- DOM-based XSS

### Паттерны для поиска
- innerHTML без экранирования
- eval() с пользовательским вводом
- document.write()
- Небезопасные React/Vue patterns

## Результат

- Список уязвимых мест
- Номера строк
- Тип XSS
- Severity
- Рекомендации

## Примеры

### Уязвимый код
```
javascript
// Плохо
document.getElementById('output').innerHTML = userInput;
```

### Защищенный код
```
javascript
// Хорошо
document.getElementById('output').textContent = userInput;
