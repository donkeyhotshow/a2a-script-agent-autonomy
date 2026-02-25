# Migration Map for tests/Feature/AiRudeDepot/PermalinkSystemTest.php

Эта карта сопоставляет Feature-тесты из `PermalinkSystemTest.php` с соответствующими классами, методами и операциями в приложении, связанными с системой пермалинков и обработкой HTTP-запросов.

## Обзор
Тесты проверяют маршрутизацию на основе пермалинков, разрешение модулей, выполнение модулей и рендеринг ответов (в частности, через Inertia), включая обработку ошибок (404).

---

Test Method: `test_example`
- Функциональность: Тестирование базовой обработки домашней страницы (`/`) через систему пермалинков, включая разрешение пермалинка, выполнение соответствующего модуля и рендеринг Inertia-компонента с данными.
- Потенциальная зона кода:
  - Маршрутизация Laravel (сопоставление URL с контроллером)
  - `App\\AiRudeDepot\\Http\\Controllers\\ModuleResolverController::handle` (контроллер, обрабатывающий пермалинки)
  - `App\\AiRudeDepot\\App\\Main::runAppEnv` (логика выполнения модуля и обработки запроса)
  - `App\\AiRudeDepot\\Managers\\PermanentLinkManager` (неявное использование для разрешения пермалинка)
  - `Inertia\Inertia::render` (вызов рендеринга фронтенд-компонента)
  - `Tests\\Feature\\AiRudeDepot\\TestModules\\TestHomepageModule::moduleRun` (выполнение кода модуля домашней страницы)

---

Test Method: `setUp` и `setupTestPermalinksAndOverride`
- Функциональность: Настройка тестовой среды: мокирование зависимостей (`ModuleClassResolver`), переопределение списка пермалинков для тестов, настройка фейковых дисков Laravel Storage.
- Потенциальная зона кода:
  - `Mockery` (для мокирования)
  - `App\\AiRudeDepot\\Managers\\PermanentLinkManager::overridePermalinks` (для установки тестовых пермалинков)
  - `Illuminate\\Support\\Facades\\Storage::fake` (для создания фейковых дисков)
  - `App\\AiRudeDepot\\App\\Helpers\\ModuleClassResolver::resolve` (мокирование)

---

Test Method: `tearDown`
- Функциональность: Очистка после теста, сброс переопределённых пермалинков.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Managers\\PermanentLinkManager::resetPermalinks`
  - `Mockery::close()`

---

Test Method: `permalink_command_generates_links_file_correctly`
- Функциональность: Тестирование Artisan-команды, которая генерирует файл со списком пермалинков. **(Отмечен как SKIPPED в тесте)**
- Потенциальная зона кода:
  - Artisan command, связанная с пермалинками (точное имя неизвестно без further inspection, вероятно, в `App\Console\Commands\...`)
  - Взаимодействие с `PermanentLinkManager` для получения списка пермалинков.
  - Логика записи файла (возможно, через `FileFacade` или `Storage`).

---

Test Method: `valid_permalink_renders_correct_inertia_component`
- Функциональность: Тестирование доступа к явно определённому пермалинку (`/test-page`), проверка выполнения соответствующего модуля и рендеринга Inertia-компонента с ожидаемыми данными.
- Потенциальная зона кода:
  - Та же, что и `test_example`, но для другого пермалинка и модуля.
  - `App\\AiRudeDepot\\App\\Modules\\PageModule::moduleRun` (модуль, выполняемый для `/test-page`)

---

Test Method: `nonexistent_permalink_renders_404_error_module`
- Функциональность: Тестирование доступа к несуществующему URL, проверка, что система корректно определяет 404 Not Found, выполняет заданный пермалинком 404 модуль и рендерит страницу ошибки через Inertia.
- Потенциальная зона кода:
  - Логика маршрутизации/контроллера для обработки ненайденных маршрутов.
  - `App\\AiRudeDepot\\App\\Main::runAppEnv` или контроллер (логика обработки 404).
  - `App\\AiRudeDepot\\Managers\\PermanentLinkManager::getPermalink` (возвращает null для несуществующего пути)
  - Разрешение пермалинка для 404 ошибки (`errors/404`).
  - `Tests\\Feature\\AiRudeDepot\\TestModules\\TestErrorModule::moduleRun` (выполнение кода 404 модуля).
  - Рендеринг Inertia-компонента с данными ошибки.

---

Test Method: `test_modificator_loads_files_from_correct_paths`
- Функциональность: Тестирование загрузки файлов модификаторов DataProcessor'ом, мокируя `FileFacade`.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\Processors\\DataProcessor::__construct`
  - Логика загрузки модификаторов в `DataProcessor`.
  - `App\\Hooks\\FileFacade::exists` (мокирование)
  - `App\\Hooks\\FileFacade::get` (мокирование)
  - `App\\AiRudeDepot\\Storage\\DataHub::address` (мокирование)
  - `App\\AiRudeDepot\\Processors\\InstructionProcessor::set` и `::get` (мокирование)
  - **Примечание:** Этот тест, кажется, больше связан с DataProcessor и FileFacade, чем с основной системой пермалинков, несмотря на его расположение в этом файле.

---

Test Method: `test_error_during_module_execution_includes_history`
- Функциональность: Тестирование обработки ошибок во время выполнения модуля, проверка, что объект истории ошибок включается в Inertia-props.
- Потенциальная зона кода:
  - `App\\AiRudeDepot\\App\\Main::runAppEnv` (логика обработки исключений/ошибок при выполнении модуля)
  - Механизм сбора истории ошибок (вероятно, в `StepResponse` или связанных классах)
  - Передача данных истории в Inertia-props.
  - `Tests\\Feature\\AiRudeDepot\\TestModules\\TestExceptionTriggerModule::moduleRun` (модуль, генерирующий ошибку)

---

