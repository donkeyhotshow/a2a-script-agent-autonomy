# Migration Map for tests/Feature/AiRudeDepot/StorageDataModules/SessionStorageTest.php

Эта карта сопоставляет Feature-тесты из `SessionStorageTest.php` с соответствующими классами, методами и операциями в приложении, связанными с доступом к данным сессии через DataHub.

## Обзор
Тесты проверяют интеграцию DataHub с хранилищем сессии Laravel для различных операций чтения, записи и удаления данных сессии через формат адресов `session!key` или `session:key.nested`.

---

Test Method: `test_parse_session_address`
- Функциональность: Проверка корректности разбора адресов хранилища сессии, включая вложенные ключи.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\StoragePathParser::parse`

---

Test Method: `test_address_returns_data_instance`
- Функциональность: Проверка, что вызов `DataHub->address('session!...')` возвращает экземпляр Processors\InstructionProcessor.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `App\\AiRudeDepot\\Processors\\InstructionProcessor` (возвращаемый тип)

---

Test Method: `test_set_get_session_data`
- Функциональность: Тестирование установки и получения данных сессии, включая простые и вложенные ключи, через `DataHub->address('session:...')->set(...)` и `->get()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::set` (для передачи данных для записи)
  - `DataHub::get` (для получения данных)
  - Внутренняя логика обработки адресов типа `session!` в DataHub или связанных контроллерах/процессорах (вероятно, `App\\AiRudeDepot\\Storage\\Data\\Controllers\\Session`).
  - Взаимодействие с Laravel Session Facade (`LaravelSession::put`, `LaravelSession::get`).
  - Хелпер `Illuminate\\Support\\Arr::set` (используется в тесте для подготовки ожидаемых данных).

---

Test Method: `test_remove_session_data`
- Функциональность: Тестирование удаления данных сессии, включая простые и вложенные ключи, через `DataHub->address('session:...')->remove()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::remove` (для выполнения операции удаления)
  - Внутренняя логика обработки адресов типа `session!` в DataHub или связанных контроллерах/процессорах (`App\\AiRudeDepot\\Storage\\Data\\Controllers\\Session`).
  - Взаимодействие с Laravel Session Facade (`LaravelSession::forget`, `LaravelSession::get`).

---

