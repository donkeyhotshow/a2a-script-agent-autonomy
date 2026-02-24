# detect-sql-injection

| Параметр | Значение |
|----------|----------|
| actionId | detect-sql-injection |
| categoryId | security |
| executorSystemId | script |
| title | Детекция SQL injection |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет потенциальные уязвимости SQL injection в коде.

## Детекция

### Паттерны для поиска
- Конкатенация строк в SQL запросах
- Непараметризованные запросы
- Raw queries без экранирования
- Динамический SQL

### Файлы для сканирования
- *.php (Laravel)
- *.js, *.ts (Node.js)
- *.py (Python)

## Результат

- Список уязвимых мест
- Номера строк
- Severity (High/Medium/Low)
- Рекомендации по исправлению

## Примеры

### Уязвимый код
```
php
// Плохо
$query = "SELECT * FROM users WHERE id = " . $_GET['id'];
```

### Защищенный код
```
php
// Хорошо
$query = "SELECT * FROM users WHERE id = ?";
DB::select($query, [$_GET['id']]);
