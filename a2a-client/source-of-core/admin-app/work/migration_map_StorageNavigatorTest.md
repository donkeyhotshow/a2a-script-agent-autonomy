# Migration Map for tests/Feature/AiRudeDepot/Support/StorageNavigatorTest.php

Эта карта сопоставляет Feature-тесты из `StorageNavigatorTest.php` с соответствующими классами и методами в приложении, связанными с навигацией по хранилищам.

## Обзор
Тесты проверяют функциональность класса `StorageNavigator`, который используется для получения списков элементов (файлов, переменных) и родителей для заданного адреса хранилища. Тесты используют фейковый диск Laravel Storage.

---

Test Method: `setUp` и `tearDown`
- Функциональность: Настройка и очистка тестовой среды, включая создание и удаление фейкового диска Laravel Storage.
- Потенциальная зона кода:
  - `Illuminate\\Support\\Facades\\Storage::fake`
  - `Illuminate\\Support\\Facades\\Storage::disk(...)->deleteDirectory`
  - `Illuminate\\Support\\Facades\\Storage::disk(...)->makeDirectory`
  - `App\\AiRudeDepot\\Managers\\StorageNavigator::__construct` (принимает имя диска)

---

Test Method: `testListItemsForFileWithKeys`, `testListItemsForFileWithKeys_Username`, `testListItemsForFileWithKeys_Password`, `testListItemsForFileWithKeys_ContainsItems`
- Функциональность: Тестирование получения списка элементов (переменных) из JSON-файла по ключам через `StorageNavigator`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\StorageNavigator::itemsList`
  - Внутренняя логика `StorageNavigator` для чтения содержимого файла (вероятно, через Storage Facade) и парсинга JSON.
  - Логика извлечения ключей/значений из JSON-структуры.
  - Формирование объектов результатов (`path`, `itemLabel`).

---

Test Method: `testInvalidPathThrowsException_InvalidType`
- Функциональность: Проверка, что создание `StorageNavigator` с некорректным типом элемента в адресе вызывает исключение `InvalidArgumentException`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\StorageNavigator::__construct` (логика валидации входных параметров, возможно, полагается на `StoragePathParser`).
  - `App\\AiRudeDepot\\Managers\\StoragePathParser::parse` (неявное использование для начального парсинга адреса)

---

