# Migration Map for tests/Feature/AiRudeDepot/StorageDataModules/FileStorageTest.php

Эта карта сопоставляет Feature-тесты из `FileStorageTest.php` с соответствующими классами, методами и операциями в приложении, связанными с доступом к файлам через DataHub.

## Обзор
Тесты проверяют интеграцию DataHub с файловой системой (используя Laravel Storage facade) для различных операций чтения, записи и удаления данных в JSON-файлах через формат адресов `file!path/to/file` или `path/to/file:key.nested`.

---

Test Method: `test_parse_file_address`
- Функциональность: Проверка корректности разбора адресов файлового хранилища, включая префикс `file!`, пути к файлам (без расширения `.json`), вложенные ключи и использование диска Storage Facade.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\StoragePathParser::parse` (должен корректно обрабатывать префикс `file!`, пути к файлам и опциональное расширение `.json`)

---

Test Method: `test_address_returns_data_instance`
- Функциональность: Проверка, что вызов `DataHub->address('file!...')` возвращает экземпляр Processors\InstructionProcessor.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `App\\AiRudeDepot\\Processors\\InstructionProcessor` (возвращаемый тип)

---

Test Method: `test_get_file_data`
- Функциональность: Тестирование получения данных из JSON-файлов, включая чтение всего файла, конкретных свойств (верхнеуровневых и вложенных), и элементов массивов через `DataHub->address('file:...')->get()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::get` (для выполнения операции чтения и получения данных)
  - Внутренняя логика обработки адресов типа `file!` в DataHub или связанных контроллерах/процессорах (`App\\AiRudeDepot\\Storage\\Data\\Controllers\\File`)
  - Взаимодействие с Laravel Storage Facade (`Storage::disk(...)->get(...)`)
  - Логика разбора JSON и навигации по `keyPath`.

---

Test Method: `test_set_file_data`
- Функциональность: Тестирование записи данных в JSON-файлы, включая создание новых файлов и обновление существующих (полностью или по конкретному свойству) через `DataHub->address('file:...')->set(...)->save()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::set` (для передачи данных для записи/обновления)
  - `DataHub::save` (для выполнения операции записи)
  - Внутренняя логика обработки адресов типа `file!` в DataHub или связанных контроллерах/процессорах (`App\\AiRudeDepot\\Storage\\Data\\Controllers\\File`)
  - Взаимодействие с Laravel Storage Facade (`Storage::disk(...)->put(...)`)
  - Логика сериализации данных в JSON.

---

Test Method: `test_remove_file_data`
- Функциональность: Тестирование удаления данных из JSON-файлов, специфически удаление свойств внутри файла, через `DataHub->address('file:...')->remove()->save()`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Storage\\DataHub::address`
  - `DataHub::remove` (для выполнения операции удаления свойства)
  - `DataHub::save` (для сохранения изменённого файла)
  - Внутренняя логика обработки адресов типа `file!` в DataHub или связанных контроллерах/процессорах (`App\\AiRudeDepot\\Storage\\Data\\Controllers\\File`)
  - Взаимодействие с Laravel Storage Facade (`Storage::disk(...)->put(...)` с изменённым содержимым).
  - Логика модификации структуры данных файла (удаление ключа) и сериализации обратно в JSON.

---

