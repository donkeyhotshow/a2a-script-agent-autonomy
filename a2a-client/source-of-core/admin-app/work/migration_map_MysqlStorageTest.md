# Migration Map for tests/Feature/AiRudeDepot/StorageDataModules/MysqlStorageTest.php

Эта карта сопоставляет Feature-тесты из `MysqlStorageTest.php` с соответствующими классами, методами и операциями в приложении, связанными с доступом к MySQL через DataHub.

## Обзор
Тесты проверяют интеграцию DataHub с базой данных MySQL (используя SQLite в тестах) для различных CRUD-операций и запросов через формат адресов `mysql!table`.

---

Test Method: `test_parse_mysql_address`
- Функциональность: Проверка корректности разбора адресов хранилища MySQL, включая операции (`find`, `where`) и параметры.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\StoragePathParser::parse`

---

Test Method: `test_address_returns_data_instance`
- Функциональность: Проверка, что вызов `DataHub->address('mysql!...')` возвращает экземпляр Processors\InstructionProcessor.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `App\\AiRudeDepot\\Processors\\InstructionProcessor` (возвращаемый тип)

---

Test Method: `test_select_operation`
- Функциональность: Выполнение простой операции SELECT (получение всех записей из таблицы) через `DataHub->address('mysql!table')->get()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::get` (для выполнения операции и получения результата)
  - Внутренняя логика обработки адресов типа `mysql!` в DataHub или связанных контроллерах/процессорах.
  - Взаимодействие с Laravel DB Facade или Eloquent.

---

Test Method: `test_mysql_count_operation`
- Функциональность: Выполнение операции COUNT (подсчет записей), как для всей таблицы, так и с условием `where`, через `DataHub->address('mysql!table/count/...')->get()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (обработка адресов с `/count` и `/where/`)
  - `DataHub::get` (для выполнения операции и получения результата-числа)
  - Внутренняя логика COUNT в DataHub.
  - Взаимодействие с Laravel DB Facade (например, `DB::table('...')->count()`, `DB::table('...')->where(...)->count()`).

---

Test Method: `test_insert_operation`
- Функциональность: Вставка новой записи в таблицу через `DataHub->address('mysql!table')->set($data)->save()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::set` (для передачи данных для вставки)
  - `DataHub::save` (для выполнения операции INSERT)
  - Внутренняя логика INSERT в DataHub.
  - Взаимодействие с Laravel DB Facade (`DB::table('...')->insert(...)`) или Eloquent Model (`Model::create(...)`).

---

Test Method: `test_update_operation`
- Функциональность: Обновление существующей записи, найденной по ID (`find/{id}`), через `DataHub->address('mysql!table/find/{id}')->set($data)->save()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (обработка адресов с `/find/{id}`)
  - `DataHub::set` (для передачи данных для обновления)
  - `DataHub::save` (для выполнения операции UPDATE)
  - Внутренняя логика UPDATE в DataHub.
  - Взаимодействие с Laravel DB Facade (`DB::table('...')->where('id', ...)->update(...)`) или Eloquent Model (`Model::find(...)->update(...)`).

---

Test Method: `test_delete_operation`
- Функциональность: Удаление существующей записи, найденной по ID (`find/{id}`), через `DataHub->address('mysql!table/find/{id}')->remove()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (обработка адресов с `/find/{id}`)
  - `DataHub::remove` (для выполнения операции DELETE)
  - Внутренняя логика DELETE в DataHub.
  - Взаимодействие с Laravel DB Facade (`DB::table('...')->where('id', ...)->delete()`) или Eloquent Model (`Model::find(...)->delete()`).

---

Test Method: `test_find_operation_success`
- Функциональность: Получение одной записи по ID (`find/{id}`) при её наличии через `DataHub->address('mysql!table/find/{id}')->get()`. Ожидается массив с данными записи.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (обработка адресов с `/find/{id}`)
  - `DataHub::get` (для выполнения операции FIND и получения результата)
  - Внутренняя логика FIND в DataHub.
  - Взаимодействие с Laravel DB Facade (`DB::table('...')->find(...)`) или Eloquent Model (`Model::find(...)`).

---

Test Method: `test_find_operation_not_found`
- Функциональность: Получение записи по несуществующему ID (`find/{id}`). Ожидается `null`.
- Потенциальная зона кода:
  - Та же, что и `test_find_operation_success`, но проверяется случай, когда запись не найдена.

---

Test Method: `testWhereOperationResults`
- Функциональность: Получение записей с фильтрацией по условию `where` (`where/column/value`) через `DataHub->address('mysql!table/where/column/value')->get()`. Проверяются случаи с несколькими результатами, одним результатом и отсутствием результатов.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (обработка адресов с `/where/column/value`)
  - `DataHub::get` (для выполнения операции WHERE и получения массива результатов)
  - Внутренняя логика WHERE в DataHub.
  - Взаимодействие с Laravel DB Facade (`DB::table('...')->where('column', 'value')->get()`) или Eloquent Model (`Model::where('column', 'value')->get()`).

---

