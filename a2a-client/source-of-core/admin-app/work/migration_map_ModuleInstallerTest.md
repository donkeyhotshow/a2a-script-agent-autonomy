# Migration Map for tests/Feature/Controllers/ModuleInstallerTest.php

Эта карта сопоставляет тесты из `ModuleInstallerTest.php` с методами `App\Http\Controllers\Backend\InstallerController` и показывает, какие части кода необходимо корректировать в тестах.

Feature-тесты для установки модуля через HTTP-запрос покрывают:
- Методы контроллера: `index()`, `show()`, `install()`, `uninstall()`, `update()`, `upload()`, `saveParamsRequest()`.
- Валидацию данных запроса в `install(Request $request)`: правила `modules` и `activeSections`.
- Работу с файловой системой через `App\Hooks\FileFacade` (отчистка логов, создание/удаление директорий, копирование файлов).

---

Test Method: `test_installs_module_via_http_request`
Tests: HTTP POST `/admin/installer/install`, вызывающий метод `InstallerController::install`
Potential App Code Area:
- `InstallerController::install(Request $request)`
- Валидация `$request->validate(['modules', 'activeSections'])`
- `InstallerController::clearTopBarLinksDirectory()`
- `InstallerController::processModuleFiles()`
- `InstallerController::processJsonFile()`

**Необходимые изменения в тесте**:
- Использовать правильный ключ `activeSections` вместо `active_sections`.
- Создавать тестовые файлы и директории под путём `base_path('install-modules/aiInstaller/...')` с помощью `FileFacade`, а не `Storage::disk('local')`.
- Удалять директории модуля и файлы после теста через `FileFacade::deleteDirectory(base_path('install-modules/aiInstaller/...'))`.

---

Test Method: `test_installs_module_with_full_copy` (deprecated)
Tests: Прямой вызов `InstallerController::install()` с `Request`, проверяющий полное копирование файлами.
Potential App Code Area:
- `InstallerController::install(Request $request)` (тот же метод)
- `InstallerController::processModuleFiles()`
- `InstallerController::copyFiles()`

**Необходимые изменения в тесте**:
- Аналогично основному тесту: исправить ключи запроса и работу с файловой системой.

---


