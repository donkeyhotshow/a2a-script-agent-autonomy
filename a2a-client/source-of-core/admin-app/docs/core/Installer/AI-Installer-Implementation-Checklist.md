# AI Installer Implementation Checklist

## Critical Directory Setup

- [x] Ensure that the directories `storage/aiCore`, `storage/aiInstaller`, `storage/aiStored`, `storage/aiScene`, and
  `storage/ai` exist and are accessible.

## Module Structure and Metadata

- [x] Verify that each module contains installation metadata in JSON format.
- [x] Confirm that the JSON configuration includes instructions for file copying, hook registration, and migration
  support.
- [x] Validate module naming conventions.
- [x] Ensure module `_i/` directory contains necessary files:
    - `_i/meta.json`
    - `_i/files-by-block.json`
    - `_i/common.json` (or `_i/useAnyway.json` - clarify requirement)
    - `_i/storeBerforeActions.json`
    - `_i/links.json`
    - `_i/css.json` (New: lists JSON style files)
    - `_i/assets.json` (New: lists assets to copy)
- [ ] заменить логику инсталяции по умолчнию и `common.json` на `useAnyway.json`. нужно чтоб `common.json`
  устанавливался только при наличии выбраного минимум 1 блока, а `useAnyway.json` устанавливался при любом выборе.

## Installation Process

- [x] Validate the InstallerController interface rendered via Inertia.js.
- [x] Ensure parameter validation through the saveParams method.
- [x] Create backups of critical files from source modules.
- [x] Validate file copying, backup creation, and restoration processes.
- [x] Check hook registration and integration.
- [x] Verify migration support if migration files are available.
- [x] Verify CSS generation using `CssProcessor` (reading from `aiInstaller`, writing to `ai/system/css`, generating
  manifest).
- [x] Verify Asset copying using `AssetProcessor` (reading `_i/assets.json` from `aiInstaller`, writing to
  `app/public/assets`).
- [x] Confirm Node.js CSS script is no longer used or required.

<!-- ## Integration with JsonPathEditor -->

<!-- - [ ] Create installation configuration for JsonPathEditor: -->

    <!-- - [ ] Define controller and class files for installation. -->
    <!-- - [ ] Create necessary storage directories for handling various path types. -->
    <!-- - [ ] Configure routes and permissions for JsonPathEditor. -->

- [ ] Implement the installation process for JsonPathEditor:
    <!-- - [ ] Copy and configure the class `app/AiRudeDepot/Support/JsonPathEditor.php`. -->
    <!-- - [ ] Install `app/AiRudeDepot/Support/JsonValidator.php`. -->
    <!-- - [ ] Integrate with storage modules (File, MySQL, Buffer, Session, Model). -->

<!-- - [ ] Set up integration hooks for JsonPathEditor: -->

    <!-- - [ ] Create a hook `post-install-jsonpath-editor` for final configuration. -->
    <!-- - [ ] Add a hook `register-jsonpath-schemas` for validation schema registration. -->

## Integration with URLController

- [ ] Create installation configuration for URLController:
    - [ ] Define necessary controller and class files.
    - [ ] Set up directories for URL storage and overrides.
    - [x] Create routes for URL management.
    - [ ] Create permissions for URL management.

<!-- - [ ] Integrate URLController with existing modules: -->

    <!-- - [ ] Add a hook `post-install-url-controller` for scanning installed modules. -->
    <!-- - [ ] Create a mechanism for updating URLController when new modules are installed. -->
    <!-- - [ ] Implement an interface for overriding module URL settings. -->

## Extensions and Improvements

- [ ] HookManager correctly registers and executes hooks.
- [x] ConfigurationManager effectively manages installer configuration.
- [x] UpdateManager tracks module updates and supports rollbacks.
- [x] TemplateEngine processes templates for file generation.
- [x] Extended validations and error handling implemented.

## Testing and Documentation

- [ ] Planned improvements such as dynamic hook registration and live configuration reload are noted.

# Документация по реализации модуля

Этот документ описывает процесс и структуру реализации модулей в рамках AI Installer.

## Процесс установки модуля

1. **Хранение модулей**
    - Модули хранятся в директории `storage/aiInstaller/`.
    - Каждый модуль должен включать папку (обычно названную _i), содержащую инструкции по установке и метаданные в
      формате JSON.
        - `_i/files-by-block.json` содержит файлы для установки модуля.
        - `_i/common.json` содержит файлы для установки модуля (устанавливаются, если выбран хотя бы один блок).
        - (Нужно добавить/уточнить `useAnyway.json`, если он используется).
        - `_i/meta.json` содержит основные метаданные модуля.
        - `_i/storeBerforeActions.json` содержит файлы для резервного копирования перед установкой.
        - `_i/links.json` содержит определения пермалинков и ссылок топ-бара.
        - `_i/css.json` (New) содержит список JSON-файлов стилей (относительно корня модуля).
        - `_i/assets.json` (New) содержит список файлов/папок ассетов для копирования (относительно папки `assets/`
          модуля).

2. **Структура метаданных**
    - Установочные метаданные включают:
        - `_i`:
        - `actions`:
        - `templates`:
        - `commands`:
        - `data`:
        - `migration` (опционально):

3. **Операции с файлами**
    - **Резервное копирование**: `storage/aiStored`
    - **Копирование**: Файлы копируются из директории источника модуля в целевую директорию установки (`storage/ai`).
    - **Восстановление**: Если у модуля есть резервная копия, установщик может восстановить файлы из архива.

4. **Регистрация хуков**
    - Хуки модуля хранятся в отдельных файлах от кода модуля.

5. **Соглашения об именовании**
    - Все модули должны соответствовать заранее определенным стандартам именования для обеспечения согласованности в
      установках.

## Жизненный цикл модуля

- **Установка**: Копирование файлов, по алгоритму, из `storage/aiInstaller` в `storage/ai`, регистрация хуков и
  установка конфигураций.
- **Обновление**: переустановка.
- **Удаление**: удаление из `storage/ai`.

## Дополнительная информация

- Для деталей по хукам смотрите документ `Installing-Hooks-Guide.md`.
