# detect-god-objects

| Параметр | Значение |
|----------|----------|
| actionId | detect-god-objects |
| categoryId | laravel-arch |
| executorSystemId | script |
| title | Детекция God Objects |
| canMigrateToScript | ✅ |

## Описание

Автоматическое обнаружение "God Objects" - классов, которые знают слишком много или делают слишком много.

## Признаки God Object

- Слишком много публичных методов (> 20)
- Слишком много свойств (> 15)
- Большой размер файла (> 1000 строк)
- Много зависимостей в конструкторе
- Нарушение Single Responsibility Principle
- Классы с именами: Manager, Handler, Helper, Service (слишком общими)

## Метрики для анализа

- Lines of Code (LOC)
- Number of Methods (NOM)
- Number of Properties (NOP)
- Cyclomatic Complexity
- Coupling
- Cohesion (LCOM)

## Примеры проблемных классов

```
php
// God Object - делает всё
class OrderManager
{
    public function create() {}
    public function update() {}
    public function delete() {}
    public function validate() {}
    public function calculate() {}
    public function sendEmail() {}
    public function generatePdf() {}
    public function processPayment() {}
    public function notify() {}
    // ... 50+ методов
}
```

## Рекомендации

- Single Responsibility Principle
- Extract Class
- Extract Subclass
- Delegate Pattern
- Service Layer
