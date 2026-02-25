# Migration Map for tests/Feature/AiRudeDepot/App/AiRudeDepotMainTest.php

Эта карта сопоставляет Feature-тесты из `AiRudeDepotMainTest.php` с соответствующими классами, методами и операциями в приложении, связанными с основной логикой выполнения приложения (класс `Main`).

## Обзор
Тесты проверяют основной поток выполнения запросов в приложении, включая разрешение пермалинков, запуск модулей, обработку различных типов запросов (GET, POST), обработку данных, валидации, редиректов, аутентификации, авторизации и ошибок (403, 404, 500) через метод `Main::runAppEnv` и вспомогательные методы.

---

Test Method: `setUp` и `tearDown`
- Функциональность: Настройка и очистка тестовой среды, включая мокирование зависимостей (`ModuleClassResolver`), переопределение пермалинков (`PermanentLinkManager`), настройку фейкового диска Storage, создание экземпляров `DataHub` и `Main` (через service container).
- Потенциальная зона кода:
  - `App\AiRudeDepot\Storage\DataHub::__construct`
  - `App\AiRudeDepot\App\Main::__construct`
  - `App\AiRudeDepot\Managers\PermanentLinkManager::overridePermalinks`
  - `App\AiRudeDepot\Managers\PermanentLinkManager::resetPermalinks`
  - `App\AiRudeDepot\App\Helpers\ModuleClassResolver::resolve` (мокирование)
  - `Illuminate\Support\Facades\Storage::fake`
  - `Illuminate\Foundation\Testing\RefreshDatabase` (trait)
  - `Mockery` (для мокирования)
  - Laravel service container (`app()`, `app()->instance`, `app()->make`)

---

Test Method: `setupTestPermalinksAndOverride`
- Функциональность: Вспомогательный метод для определения и установки тестового набора пермалинков.
- Потенциальная зона кода:
  - `App\AiRudeDepot\Managers\PermanentLinkManager::overridePermalinks`

---

Test Method: `test_construct_app_resolves_base_app_class`
- Функциональность: Тестирование корректного создания экземпляра класса модуля (`App`) методом `Main::constructApp`.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::constructApp`
  - `App\AiRudeDepot\App\App::__construct` (вызов конструктора модуля)
  - Инъекция зависимостей в конструктор модуля (`DataHub`, `Request`, `Application`).

---

Test Method: `test_construct_app_throws_exception_for_non_existent_class`
- Функциональность: Проверка, что `Main::constructApp` выбрасывает исключение для несуществующего класса модуля.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::constructApp` (логика проверки существования класса и выброса исключения).

---

Test Method: `test_run_app_env_get_success`
- Функциональность: Тестирование успешного выполнения GET запроса к пермалинку (`test-page`), проверка HTTP-статуса (200) и структуры ответа Inertia (наличие props).
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (основной метод обработки запроса)
  - Логика разрешения пермалинка (использует `PermanentLinkManager`).
  - Логика выполнения модуля (использует `ModuleClassResolver` и метод `moduleRun` модуля).
  - Формирование ответа Inertia (`Inertia::render`).

---

Test Method: `test_run_app_env_get_404`
- Функциональность: Тестирование обработки несуществующего пермалинка, проверка HTTP-статуса (404) и выполнения модуля для 404 ошибки (`test-error`).
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика обработки ненайденного пермалинка).
  - Логика разрешения пермалинка для ошибки 404 (`PermanentLinkManager`).
  - Выполнение модуля ошибки (использует `ModuleClassResolver` и метод `moduleRun` модуля ошибки).

---

Test Method: `test_run_app_env_get_admin_access_denied_403`
- Функциональность: Тестирование доступа неаутентифицированного пользователя к пермалинку, требующему права администратора (`admin/dashboard`), проверка HTTP-статуса (403) и выполнения модуля для 403 ошибки.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика проверки прав доступа на основе `metadata.required_access`).
  - Взаимодействие с Laravel Auth Facade (`Auth::check`, `Auth::user`).
  - Логика разрешения пермалинка для ошибки 403.
  - Выполнение модуля ошибки.

---

Test Method: `test_run_app_env_get_admin_access_granted`
- Функциональность: Тестирование доступа аутентифицированного пользователя (с ролью admin) к пермалинку, требующему права администратора (`admin/dashboard`), проверка успешного выполнения (HTTP 200).
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика проверки прав доступа).
  - Взаимодействие с Laravel Auth Facade (`Auth::check`, `Auth::user`).
  - Проверка роли пользователя (модель `User`, геттер `isAdmin`).
  - Выполнение модуля (`test-admin`).

---

Test Method: `test_run_app_env_get_permalink_link_resolution`
- Функциональность: Тестирование разрешения пермалинка, который ссылается (`link`) на другой пермалинк (`linked-page-source` -> `target-page`). Проверка, что выполняется модуль целевого пермалинка (`test-page`).
- Потенциальная зона кода:
  - `App\AiRudeDepot\Managers\PermanentLinkManager::getPermalink` (логика разрешения цепочек ссылок).
  - `App\AiRudeDepot\App\Main::runAppEnv` (использование результата разрешения пермалинка).

---

Test Method: `test_run_app_env_post_permalink_redirect_response`
- Функциональность: Тестирование обработки POST запроса, который возвращает RedirectResponse из модуля (`test-post`). Проверка, что `Main::runAppEnv` корректно обрабатывает такой ответ и возвращает его.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика обработки `RedirectResponse` из `moduleRun`).
  - Возвращаемый тип из метода `moduleRun` модуля.

---

Test Method: `test_run_app_env_post_success_with_merged_data`
- Функциональность: Тестирование успешного POST запроса, проверка слияния данных из `StepResponse` (возвращаемого модулем) в общий контекст `ProgramResponse`, который затем используется для Inertia-props.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика слияния результатов `moduleRun` в `ProgramResponse`).
  - `App\AiRudeDepot\App\StepResponse\ProgramResponse::merge` (используется внутри `Main`).
  - Метод `moduleRun` модуля (`test-post`) возвращает `StepResponse` с данными.

---

Test Method: `test_run_app_env_post_validation_error_re_renders_with_datahub`
- Функциональность: Тестирование обработки ошибки валидации в POST запросе. Проверка, что система возвращает HTTP 200 (для Inertia), сохраняет данные запроса и ошибки валидации в DataHub, и рендерит страницу с доступом к этим данным через DataHub.
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (логика обработки исключений валидации, сохранение в DataHub).
  - Взаимодействие с Laravel Validator Facade (`Validator::make`).
  - Использование `DataHub` для временного хранения данных запроса и ошибок (`datahub:request`, `datahub:validationErrors`).
  - Рендеринг Inertia с данными из DataHub.
  - Перенаправление на GET-версию текущего URL.

---

Test Method: `test_run_app_env_exception_in_action_triggers_500`
- Функциональность: Тестирование обработки неперехваченного исключения, возникшего *внутри* метода `action` модуля. Проверка, что система возвращает HTTP 500 и выполняет модуль для 500 ошибки (`test-error`).
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (общий блок `try...catch` для обработки исключений).
  - Логика разрешения пермалинка для ошибки 500.
  - Выполнение модуля ошибки.
  - Метод `action` модуля (`test-error`?) генерирует исключение.

---

Test Method: `test_run_app_env_exception_in_run_triggers_500`
- Функциональность: Тестирование обработки неперехваченного исключения, возникшего *внутри* метода `moduleRun` модуля. Проверка, что система возвращает HTTP 500 и выполняет модуль для 500 ошибки (`test-error`).
- Потенциальная зона кода:
  - `App\AiRudeDepot\App\Main::runAppEnv` (общий блок `try...catch`).
  - Логика разрешения пермалинка для ошибки 500.
  - Выполнение модуля ошибки.
  - Метод `moduleRun` модуля генерирует исключение.

---

Test Method: `getExpectedClassForTestSlug`
- Функциональность: Вспомогательный метод, который по тестовому 'slug' возвращает ожидаемое имя класса модуля. Используется в тестах для проверки, что разрешитель классов (`ModuleClassResolver`) возвращает правильный класс.
- Потенциальная зона кода: Не тестирует код приложения напрямую, является вспомогательным методом теста.

---

