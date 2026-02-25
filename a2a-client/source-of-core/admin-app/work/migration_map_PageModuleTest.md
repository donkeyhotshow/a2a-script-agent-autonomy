# Migration Map for tests/Feature/AiRudeDepot/DataProcessor/JsonBased/PageModuleTest.php

Эта карта сопоставляет Feature-тесты из `PageModuleTest.php` с соответствующими классами и методами в приложении, связанными с обработкой данных на основе JSON и специфичного "pageModule" модификатора.

## Обзор
Тесты в этом файле проверяют функциональность загрузки и обработки данных модификаторов (`DataProcessor`), особенно тех, которые хранятся в JSON файлах и относятся к определенным окружениям (`aiTest`, `aiCoreTest`). Фокус на проверке того, как `DataProcessor` обрабатывает запросы `address()` для загрузки модификаторов и как работает специфичный "pageModule" модификатор. Тесты включают настройку тестовой среды с фейковыми дисками Storage, копирование реальных файлов модификаторов и создание тестовых пермалинков.

---

Test Method: `setUp` и `tearDown`
- Функциональность: Настройка и очистка тестовой среды. Включает конфигурацию и использование фейковых дисков Laravel Storage (`aiCoreTest`, `aiTest`), создание необходимых директорий, инстанцирование `DataHub` для обоих дисков, копирование реального файла `pageModule.json` в тестовое окружение, создание общих тестовых модификаторов и пермалинков, а также очистку тестовых файлов и директорий.
- Потенциальная зона кода:
  - `Illuminate\Support\Facades\Storage::disk`, `::makeDirectory`, `::put`
  - `Illuminate\Support\Facades\File::exists`, `::get`, `::delete`, `::makeDirectory`
  - `Illuminate\Support\Facades\Log::debug`, `::warning`
  - `Illuminate\Support\Facades\Config::set`
  - `App\AiRudeDepot\Storage\DataHub::__construct`
  - `App\AiRudeDepot\Storage\DataHub::address`, `::set`, `::save`
  - Создание тестовых данных пермалинков и модификаторов (JSON структура).
  - Вспомогательные методы `createTestDirectories`, `cleanupTestFiles`, `createPermalinks`, `createModificators`.
  - Сброс статического экземпляра `DataHub` через рефлексию.
  - `@rmdir` для очистки директорий.

---

Test Method: `testEnvironmentSpecificModificator`
- Функциональность: Тестирование загрузки модификаторов с учетом специфичного окружения (`aiTest`, `aiCoreTest`) через метод `DataProcessor::address()`. Проверяет, что `DataProcessor` загружает правильный файл модификатора (`envPathMod.json`) в зависимости от переданного имени окружения.
- Потенциальная зона кода:
  - `App\AiRudeDepot\Processors\DataProcessor::address` (логика определения пути файла модификатора на основе имени окружения).
  - Чтение файлов модификаторов с диска.
  - *Примечание: Тест помечен как пропущенный (`markTestSkipped`), указывая на то, что эта функциональность может быть неактивной или реализована иначе.*

---

Test Method: `testPageModuleModificator`, `testPageModuleWithDifferentPaths`, `testPageModule`
- Функциональность: Тестирование специфичного "pageModule" модификатора. Проверяет, как `DataProcessor` обрабатывает вызов метода `pageModule()` (через `__call`), как он взаимодействует с данными пермалинков (полученными из `DataHub`) и какой результат возвращает этот модификатор для различных путей пермалинков.
- Потенциальная зона кода:
  - `App\AiRudeDepot\Processors\DataProcessor::__call` (логика перехвата вызова метода и определения имени модификатора).
  - Внутренняя логика "pageModule" модификатора (возможно, в отдельном классе или замыкании, ассоциированном с этим именем).
  - Взаимодействие с `DataHub` для получения данных пермалинков (`this->storage`, `this->coreStorage`).
  - Логика обработки пермалинков и формирования результата внутри "pageModule" модификатора.
  - Метод `result()` в `DataProcessor` для получения окончательного результата обработки.
  - *Примечание: Тесты помечены как пропущенные (`markTestSkipped`), указывая на то, что эта функциональность может быть неактивной или реализована иначе, возможно, не через динамический вызов модификатора по имени.*

---

