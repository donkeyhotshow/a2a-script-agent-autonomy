# generate-phpdoc

| Параметр | Значение |
|----------|----------|
| actionId | generate-phpdoc |
| categoryId | documentation |
| executorSystemId | agent |
| title | Генерация PHPDoc |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует PHPDoc комментарии для PHP кода.

## PHPDoc теги

- @param - Параметры функции/метода
- @return - Возвращаемое значение
- @throws - Исключения
- @example - Примеры использования
- @see - Ссылки
- @author - Автор
- @version - Версия
- @deprecated - Устаревшие функции
- @since - Версия с которой добавлено
- @link - Ссылки
- @property - Свойства класса
- @method - Методы класса
- @inheritDoc - Наследование документации

## Инструменты

- phpDocumentor
- PHPDoc
- phpDox
- DocBlox

## Генерируемая документация

- Описание классов/интерфейсов/трейтов
- Методы и их сигнатуры
- Свойства
- Константы
- Типы параметров и возврата
- Exceptions
- Examples

## Поддерживаемые языки

- PHP 5.6+
- PHP 7.x
- PHP 8.x
- PHP 8.1+ (attributes)

## Процесс

1. Анализ PHP кода
2. Определение классов, интерфейсов, трейтов
3. Парсинг сигнатур методов
4. Генерация шаблонов документации
5. Валидация PHPDoc синтаксиса
