# AI Installer Overview

This document provides an overview of the AI Installer module, combining the current implementation with planned
enhancements as outlined in the ai-installer-plan-extendings documentation.

## Critical Directory Structure

- `storage/aiCore`: Core installation files including permalinks and installation configuration.
- `storage/aiInstaller`: Source modules and installation scripts.
- `storage/ai`: Destination directory for installed modules.

## Module Structure

- Modules are stored in `storage/aiInstaller/`.
- Each module includes installation metadata in JSON format in the `_i/` subdirectory, defining:
    - `_i/meta.json`: Basic module information (name, label).
    - `_i/files-by-block.json`: Files associated with specific installable components/blocks within the module.
    - `_i/common.json`: Files common to the module, installed if any component is active.
    - `_i/storeBerforeActions.json`: Files/directories to back up from the destination (`storage/ai/`) to
      `storage/aiStored/` before installation.
    - `_i/links.json`: Defines permalinks and top-bar menu links.
    - `_i/css.json`: (New) Lists JSON files (relative to module root, e.g., `css/styles.json`) containing CSS
      definitions.
    - `_i/assets.json`: (New) Lists asset files/directories (relative to module `assets/` folder) to be copied to
      `public/storage/assets/{moduleName}`.
- Module code (PHP classes) should reside in `code/` subdirectory (e.g.,
  `storage/aiInstaller/{moduleName}/code/{ModuleName}.php`).
- Module CSS definitions are typically in `css/` subdirectory (e.g.,
  `storage/aiInstaller/{moduleName}/css/styles.json`).
- Module static assets (images, fonts) should be in `assets/` subdirectory.
- Migration support is available if migration files are provided.

## Installation Process

- The installer interface is rendered using Inertia.js via the InstallerController.
- The process involves validating parameters, backing up and copying module files, restoring backups if necessary, and
  integrating hooks and routes.

## Component Integration

### JsonPathEditor Integration

The AI Installer now supports the installation and configuration of the JsonPathEditor component, which allows editing
data at specific paths using the Path syntax:

- **Installation Files**:
    - Controllers: `app/Http/Controllers/Backend/JsonPathEditorController.php`
    - Classes: `app/AiRudeDepot/Support/JsonPathEditor.php` and `app/AiRudeDepot/Support/JsonValidator.php`
    - Views: Inertia components for the editor interface

- **Setup Process**:
    - Creates necessary storage directories for JSON files
    - Registers routes for the JsonPathEditor in the admin panel
    - Sets up permissions for path editing
    - Configures default paths and schema validations

- **Configuration**:
    - Enables editing of various storage types:
        - `file!`: JSON files
        - `mysql!`: Database records
        - `model!`: Model data
        - `session`: Session data
        - `buffer`: Buffer data

### URLController Integration

The AI Installer also handles the installation and configuration of the URLController, which provides centralized
management of URLs registered by modules:

- **Installation Files**:
    - Controllers: `app/Http/Controllers/Backend/UrlController.php`
    - Services: `app/AiRudeDepot/Storage/PermanentLinkManager.php` and `app/AiRudeDepot/Storage/UrlStorage.php`
    - Views: Inertia components for URL management

- **Setup Process**:
    - Sets up the URL storage directory structure
    - Registers routes for the URL management interface
    - Creates default URL configurations
    - Integrates with existing modules to scan their `meta.json` files for routes

- **Configuration**:
    - Provides settings for URL customization and overrides
    - Establishes permissions for URL management
    - Configures URL resolution behavior

## Synchronization Notes

- Synchronized with the latest @version-upgrade documentation.
- Existing functionality is preserved.
- Planned enhancements include improved migration support, extended hook registration, and enhanced error handling.
- For detailed tasks, refer to the AI-Installer-Implementation-Checklist.md.

## Dependencies

- **JsonPathEditor Dependencies**:
    - StoragePathParser
    - Path class
    - StorageDataModules (File, MySQL, Buffer, Session, Model)
    - JSONPath library for parsing and querying

- **URLController Dependencies**:
    - PermanentLinkManager
    - UrlStorage
    - Ability to scan and parse module meta.json files

## Installation Hooks

New hooks have been added to the AI Installer to support the integration of JsonPathEditor and URLController:

- `post-install-jsonpath-editor`: Executes after JsonPathEditor installation to set up paths and configurations
- `post-install-url-controller`: Executes after URLController installation to scan modules and register initial URLs
- `register-url-controller-modules`: Registers additional modules with the URL controller
- `register-jsonpath-schemas`: Registers JSON schemas for validation in the JsonPathEditor

## Major Actions for Reinstallation

- Implement methods for system reinstallation and integrate with other components.
- Implement methods for managing backups and add support for different types of backups.
- Implement methods for managing system state and add state validation.
- Implement methods for managing logs and add support for different types of logs.

## Testing and Documentation

- Write tests for PageRenderer and its descendants.
- Write tests for UrlController and UrlStorage.
- Write tests for JsonPathEditor and validators.
- Write tests for AiInstaller and its components.
- Write tests for SystemReinstaller and its components.

## Future Improvements

- Implement comprehensive logging and monitoring for system modules.
- Integrate role-based access control for module operations.
- Improve error handling and feedback mechanisms for users.
- Automate testing of all modules to ensure reliability.
- Create comprehensive documentation and usage guides.
- Implement audit trails for all module actions.
- Strengthen scalability and flexibility of modules.
- Integrate with external systems and services for extended functionality.
- Implement automated rollback and recovery procedures in case of installation failures.
- Develop user-friendly interfaces for module management.
- Enhance the template engine with additional features.
- Add feature flags for experimental module capabilities.
- Improve module discovery and enumeration mechanisms.

## CSS and Asset Handling (Refactored)

- **Removed Node.js Dependency:** The previous Node.js script (`css-schema-processor`) for handling CSS is no longer
  used.
- **PHP `CssProcessor`:**
    - A new helper class (`App\Http\Controllers\Backend\Helpers\CssProcessor`) runs during installation.
    - Reads `_i/css.json` from the module source (`storage/aiInstaller/{moduleName}/_i/css.json`).
    - Reads the referenced JSON style files (e.g., `storage/aiInstaller/{moduleName}/css/styles.json`).
    - Converts the JSON structure directly into CSS syntax.
    - Saves the generated CSS for each *processed* module to `storage/ai/system/css/{moduleName}.css`.
    - Generates a central import manifest `storage/ai/system/css/modules-imports.scss` containing
      `@import './{moduleName}.css';` rules only for the modules processed in the current run.
- **PHP `AssetProcessor`:**
    - A new helper class (`App\Http\Controllers\Backend\Helpers\AssetProcessor`) runs during installation.
    - Reads `_i/assets.json` from the module source (`storage/aiInstaller/{moduleName}/_i/assets.json`).
    - Parses the list of files/directories specified (relative to `storage/aiInstaller/{moduleName}/assets/`).
    - Copies *only* the listed assets to the public storage directory `storage/app/public/assets/{moduleName}/` (
      requires `php artisan storage:link`).
- **Frontend Integration:**
    - The main application CSS (`resources/common/template/css/app.css`) now imports the generated manifest:
      `@import '../../../../storage/ai/system/css/modules-imports.scss';`.
    - The Vite build process includes these imported module styles.

# AI Installer - Основные действия по установке системы

## Критическая структура директорий

1. Создать основную директорию: `storage/aiCore` ✓
2. Создать директорию для хуков модулей: `storage/aiCore/hooks` (заменяет предыдущую концепцию модулей)
3. Создать директорию постоянных ссылок: `storage/aiCore/permalinks` ✓
4. Создать директорию источников установщика: `storage/aiInstaller/` ✓
6. Создать целевую директорию: `storage/ai/` ✓
7. Установить правильные разрешения на чтение/запись для этих директорий (0755) ✓

## Структура модуля

1. Модули хранятся в директории `storage/aiInstaller/`
2. Каждый модуль имеет папку `_i` с инструкциями по установке
3. Установка модуля копирует из `storage/aiInstaller/` в `storage/ai/`
4. Метаданные модуля хранятся в виде JSON-файлов
5. Хуки модуля хранятся в отдельных файлах от кода модуля
6. Упаковка в zip или символические ссылки не требуется; однако поддержка миграций доступна, если в конфигурации
   установки модуля предоставлены файлы миграции.
7. Модули должны следовать установленным соглашениям об именовании

## Архитектура системы хуков

1. Категории хуков:
    - `routes` - Для регистрации маршрутов модуля
    - `menu` - Для интеграции меню
    - `permissions` - Для регистрации разрешений
    - `assets` - Для включения CSS/JS
2. Особенности:
    - Регистрируются во время установки модуля
    - Хранятся в центральном реестре
    - Классифицируются по типу
    - Поддерживают приоритеты выполнения
    - Поддерживают условную активацию
    - Могут быть отключены индивидуально, если возникают проблемы
    - Кэширование или проверка целостности не требуется

## Интеграция меню и маршрутов

1. Меню модулей автоматически регистрируются через универсальную регистрацию
2. Маршруты модулей автоматически регистрируются
3. У маршрутов есть префикс имени модуля
4. Элементы меню поддерживают иерархическую структуру
5. Маршруты поддерживают привязку модели
6. Поддержка перевода для элементов меню отсутствует
7. Версионирование для маршрутов отсутствует

## Интеграция системы URL

1. Структура URL на основе модуля с форматом: `/{module}/{slug}`
2. Хранение URL в JSON-файлах по адресу `storage/aiCore/permalinks/{module}`
3. Динамическое рендеринг контента на основе модуля и параметров
4. Первая часть пути URL определяет имя модуля

## Реализация контроллера установки

`InstallerController` отвечает за управление процессом установки:

```php
class InstallerController extends InstallController
{
    public $installerDir = 'aiInstaller';
    public $storedDir = 'aiStored';
    public $destinationDir = 'ai';    
    public $sceneDir = 'aiScene';           
    public $coreDir = 'aiCore';
    
    // Другие методы...
}
```

Ключевые методы включают:

1. `index()` - Отображает интерфейс установщика
2. `saveParams()` - Сохраняет параметры установки
3. `install()` - Управляет процессом установки модуля
4. `processModuleFiles()` - Обрабатывает файлы на основе конфигурации

## Вспомогательные классы

Несколько вспомогательных классов поддерживают процесс установки:

1. `FileHelper` - Управляет операциями с файлами (копирование, удаление).
2. `InstallHelper` - Облегчает установку модуля (основная логика копирования и восстановления).
3. `JsonHelper` - Обрабатывает данные JSON (извлечение списков файлов из `_i/*.json`).
4. `LogHelper` - Обрабатывает ведение журнала установки.
5. `SchemaHelper` - Генерирует схему формы для UI инсталлятора.
6. `CssProcessor` - (New) Генерирует CSS из JSON-определений модуля и создает манифест импортов.
7. `AssetProcessor` - (New) Копирует указанные ассеты модуля в публичное хранилище.

## Интеграция фронтенда

Интерфейс установки реализован как компонент Vue:

```vue
<template>
    <div class="container mx-auto p-4 bg-white rounded-lg shadow-md">
        <h1 class="text-2xl font-bold mb-6">Установщик AiRudeDepot</h1>
        <form @submit.prevent="handleSave">
            <!-- Элементы формы для выбора модуля -->
        </form>
    </div>
</template>
```

## Контрольный список установки

1. Создать необходимые директории хранения
2. Реализовать контроллер установки модуля (уже реализован в контроллере и вспомогательных классах)
3. Настроить систему регистрации хуков
4. Настроить интеграцию меню и маршрутов
5. Протестировать с образцовым модулем

## Ключевые особенности

- Установка из `storage/aiInstaller/` в `storage/ai/`
- Метаданные модуля в формате JSON
- Система хуков для точек расширения
- Автоматическая регистрация меню и маршрутов
- Модули могут расширять основные функции

## Примечания по синхронизации

- Это обновление синхронизировано с документацией @version-upgrade.
- Функциональность, существующая в текущей реализации инсталлера, сохранена: обработка модулей, копирование файлов,
  регистрация хуков, меню и маршрутов остается неизменной.
- Добавлена поддержка миграций, если в модуле предоставлены соответствующие файлы, без удаления или деактивации
  существующего функционала.
- Для актуального состояния и правильных правок см. обновленный чек-лист в файле `!implementation-checklist.md`.

# Расширение plans/ai-installer/* до plans/ai-installer-extend

## Новая функция: Регистрация постоянных ссылок из метаданных модуля

### Обзор

Эта функция позволит регистрировать постоянные ссылки на основе метаданных модулей. Установщик будет включать
URL-контроль для управления постоянными ссылками, с возможностями сохранения и изменения конфигураций.

### Шаги реализации

1. **Определение структуры постоянных ссылок**:
    - Определить структуру постоянных ссылок на основе метаданных модуля.
    - Создать модель данных для хранения постоянных ссылок.

2. **Обновление установщика**:
    - Изменить установщик, чтобы включить новый раздел для конфигурации постоянных ссылок.
    - Добавить кнопку для сохранения и изменения постоянных ссылок.

3. **Реализация логики управления URL**:
    - Создать функции в `PermanentLinkManager` для обработки регистрации постоянных ссылок.
    - Обеспечить сохранение постоянных ссылок в постоянном хранилище (например, база данных или JSON-файл).

4. **Интеграция с существующими метаданными**:
    - Извлечь соответствующую информацию из метаданных модуля для заполнения полей постоянной ссылки.
    - Обеспечить возможность системы обрабатывать обновления существующих постоянных ссылок.

5. **Тестирование**:
    - Протестировать новую функциональность, чтобы убедиться, что постоянные ссылки регистрируются правильно и что
      параметры конфигурации работают как задумано.

### Модернизация контроллера маршрутов

1. **Определение цели**:
    - Контроллер будет считывать маршруты, определенные в метаданных модуля, и регистрировать их как постоянные ссылки в
      `storage/aiCore/permalinks`.

2. **Идентификация маршрутов**:
    - Определить, как маршруты определены в метаданных модуля (например, в файлах `meta.json`).
    - Создать метод для извлечения этих маршрутов из метаданных.

3. **Реализация логики чтения маршрутов**:
    - Создать функцию в контроллере для чтения маршрутов из метаданных модуля.
    - Обеспечить возможность функции обрабатывать несколько модулей и их соответствующие маршруты.

4. **Регистрация постоянных ссылок**:
    - Реализовать логику для сохранения извлеченных маршрутов в `storage/aiCore/permalinks`.
    - Обеспечить хранение постоянных ссылок в структурированном формате, который позволяет легко извлекать и управлять
      ими.

5. **Тестирование**:
    - Протестировать контроллер, чтобы убедиться, что он правильно считывает маршруты и регистрирует их как постоянные
      ссылки.
    - Проверить, что постоянные ссылки доступны и функционируют как задумано.

### Заключение

Эта новая функция улучшит функциональность AI-установщика, позволяя динамически управлять постоянными ссылками, улучшая
общий пользовательский опыт и организацию системы.

## Overview of Extensions

- **HookManager**: Manages the registration and execution of hooks. Responsible for pre- and post-install scripts, menu
  integration, route registration, and conditional activation of components.
- **ConfigurationManager**: Handles module configuration management, maintaining installation parameters and integration
  settings.
- **UpdateManager**: Controls module updates, including update processes, integrity checks, and rollback support.
- **TemplateEngine**: Simplifies file generation from templates and supports customizable script generation based on
  provided parameters.

## Interfaces

- **HookInterface**: Defines methods for registering and executing hooks.
- **InstallerExtensionInterface**: Standard interface for installer extensions, ensuring consistent integration.
- **TemplateEngineInterface**: Defines necessary methods for handling templates in the installer.

## Planned Improvements

- [ ] Enhanced dynamic hook registration with priority settings and conditional execution.
- [ ] Live reloading capabilities and improved integration for configuration changes in ConfigurationManager.
- [ ] Automatic update notifications and complex rollback functionality in UpdateManager.
- [ ] Extended template handling with support for more complex scenarios in TemplateEngine.

## Integration with AI Installer

- The extensions are designed to seamlessly integrate with the core AI Installer functionality, enhancing its
  capabilities and providing a more flexible installation process.
- Each extension is built to be modular, allowing for easy updates and maintenance.

## Conclusion

These extensions significantly improve the functionality of the AI Installer, allowing for dynamic management of
installation processes and enhancing the overall user experience and system organization.
