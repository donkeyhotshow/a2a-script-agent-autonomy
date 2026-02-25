## 📝 Шпаргалка: PHP & Composer

### Описание:
Данная шпаргалка содержит наиболее часто используемые команды и концепции, связанные с разработкой на PHP и управлением зависимостями с помощью Composer. Предназначена для быстрого доступа к информации и повышения эффективности работы.

### Содержание:

#### Composer - Управление Зависимостями
- **Установка зависимостей:**
    ```bash
    composer install        # Установить зависимости из composer.lock
    composer update         # Обновить зависимости до последних версий
    ```
- **Добавление зависимостей:**
    ```bash
    composer require vendor/package         # Добавить новую зависимость
    composer require vendor/package --dev   # Добавить как dev-зависимость
    ```
- **Удаление зависимостей:**
    ```bash
    composer remove vendor/package
    ```
- **Обновление автозагрузки:**
    ```bash
    composer dump-autoload  # Перегенерировать файлы автозагрузки
    ```
- **Валидация `composer.json`:**
    ```bash
    composer validate
    ```

#### PHP - Основные Команды и Концепции
- **Запуск встроенного сервера:**
    ```bash
    php -S localhost:8000 -t public/
    ```
- **Проверка версии PHP:**
    ```bash
    php -v
    ```
- **Исполнение PHP-скрипта:**
    ```bash
    php your-script.php
    ```
- **Основы ООП:**
    - Классы, Объекты, Свойства, Методы.
    - Наследование, Полиморфизм, Абстракция, Инкапсуляция.
- **Основные функции:** `echo`, `print_r`, `var_dump`, `isset`, `empty`, `count`, `array_*` функции.
- **Обработка ошибок и исключений:** `try-catch`, `throw Exception`.

#### PHPUnit - Тестирование
- **Запуск всех тестов:**
    ```bash
    ./vendor/bin/phpunit
    ```
- **Запуск конкретного тестового файла:**
    ```bash
    ./vendor/bin/phpunit tests/Unit/ExampleTest.php
    ```
- **Запуск конкретного теста в файле:**
    ```bash
    ./vendor/bin/phpunit --filter testBasicExample tests/Unit/ExampleTest.php
    ```
- **Генерация покрытия кода (Code Coverage):**
    ```bash
    ./vendor/bin/phpunit --coverage-html coverage_report/
    ```

---
*Создано автоматически*

