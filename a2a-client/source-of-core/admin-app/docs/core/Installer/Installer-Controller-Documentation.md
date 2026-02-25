# Документация контроллера установки

**Source File:** `app/Http/Controllers/Backend/InstallerController.php`

Этот документ предоставляет подробный обзор InstallerController, используемого в модуле AI Installer. Этот контроллер
отвечает за управление процессом установки через интерфейс Inertia.js.

## Обзор

- Контроллер InstallerController расширяет общий InstallController и интегрируется с Inertia.js для фронтенд-интерфейса.
- Он обрабатывает валидацию параметров, резервное копирование и копирование файлов, регистрацию хуков и процессы
  установки модулей.

## Ключевые Свойства

- `$installerDir` (`'aiInstaller'`): Директория в `storage/`, содержащая исходные файлы модулей для установки.
- `$storedDir` (`'aiStored'`): Директория в `storage/`, используемая для временного хранения (резервного копирования)
  данных и файлов модуля перед его обновлением/переустановкой.
- `$destinationDir` (`'ai'`): Целевая рабочая директория в `storage/`, куда устанавливаются активные модули.
- `$sceneDir` (`'aiScene'`): (Не используется активно в методе `install`, но объявлен).
- `$coreDir` (`'aiCore'`): Директория в `storage/`, содержащая основные файлы конфигурации, включая параметры
  инсталлятора (`installer/form-data.json`).
- `$linkManager`: Экземпляр `PermanentLinkManager` для управления постоянными ссылками (пермалинками).
- `$installHelper`, `$fileHelper`, `$jsonHelper`, `$logHelper`: Экземпляры классов-хелперов для делегирования
  специфических задач (работа с файлами, JSON, логирование, логика установки).

## Ключевые методы

### index()

- Отображает интерфейс установщика, используя `Inertia::render('Installer/Index', ...)` для отображения формы установки
  и текущих параметров.
- Передает на фронтенд:
    - `formSchema`: Структура формы выбора модулей/компонентов, загруженная с помощью `SchemaHelper::getFormSchema()`.
    - `currentParams`: Текущие сохраненные параметры установки (какие модули/компоненты активны), загруженные из
      `$coreDir/installer/form-data.json`.

### saveParams(Request $request)

- Валидирует входящие параметры (ожидает массив).
- Сохраняет новые параметры в `$coreDir/installer/form-data.json` с помощью `saveNewParams()`.
- Возвращает JSON-ответ, указывающий на успешное сохранение.

### install(Request $request)

Это основной метод, выполняющий процесс установки/обновления:

1. **Валидация:** Проверяет наличие `modules` (состояние чекбоксов) и `activeSections` (какие секции/модули активны) в
   запросе.
2. **Загрузка Данных:** Получает схему формы (`getFormSchema`) и текущие параметры (`getCurrentParams`).
3. **Очистка TopBar Links:** Удаляет и заново создает директорию `storage/ai/top-bar-links` (
   `clearTopBarLinksDirectory`).
4. **Итерация по Секциям (Модулям):** Проходит по каждой секции (`$section`), определенной в `formSchema`.
    - Определяет пути: `$source` (`aiInstaller/`), `$storage` (`aiStored/`), `$destination` (`ai/`).
    - Проверяет существование исходной папки модуля (`$source`).
    - **Резервное копирование:** Вызывает `processModuleFiles()` для бэкапа файлов из `$destination` в `$storage`
      согласно `_i/storeBerforeActions.json`.
    - **Очистка:** Удаляет существующую папку модуля в целевой директории (`$destination`).
    - **Если Секция/Модуль Активен:**
        - Создает целевую папку (`$destination`).
        - Проходит по компонентам модуля (`$item`).
        - **Если Компонент Активен:**
            - **Копирование Файлов Компонента:** Копирует файлы компонента из `$source` в `$destination` согласно
              `$item['files']`.
            - **Обработка Ссылок:** Обрабатывает `_i/links.json` для создания пермалинков и ссылок топ-бара.
        - Устанавливает флаг `$moduleInstalled = true`.
    - **Копирование Общих Файлов:** Если модуль был активен и `$moduleInstalled` = true, копирует общие файлы (
      `_i/common.json`) из `$source` в `$destination`.
    - **Восстановление из Бэкапа:** Если модуль был активен и существует бэкап (`$storage`), копирует его содержимое в
      `$destination`.
    - Если `$moduleInstalled` = true, добавляет `$moduleName` в массив `$processedModules`.
5. **Обработка Assets:**
    - Создает экземпляр `AssetProcessor`.
    - Вызывает `$assetProcessor->processAllModuleAssets()`. Этот метод:
        - Итерирует по всем модулям в `storage/aiInstaller/`.
        - Читает `_i/assets.json`.
        - Копирует указанные ассеты из `storage/aiInstaller/{moduleName}/assets/` в
          `storage/app/public/assets/{moduleName}/`.
    - Добавляет лог `AssetProcessor` в `$installLog`.
6. **Обработка CSS:**
    - Создает экземпляр `CssProcessor`.
    - Вызывает `$cssProcessor->processAllModules($processedModules)`. Этот метод:
        - Итерирует только по модулям, которые были реально установлены/обновлены (`$processedModules`).
        - Читает `_i/css.json` и связанные файлы стилей из `storage/aiInstaller/`.
        - Генерирует CSS и сохраняет его в `storage/ai/system/css/{moduleName}.css`.
        - Генерирует/обновляет манифест `storage/ai/system/css/modules-imports.scss`.
    - Добавляет лог `CssProcessor` в `$installLog`.
7. **Сохранение Параметров:** Обновляет `form-data.json`.
8. **Сохранение Лога:** Записывает объединенный лог установки `$installLog`.
9. **Редирект:** Возвращает пользователя на страницу инсталлятора.

### processModuleFiles($moduleName, $sourcePath, $destinationPath, $storageDir, &$log)

- Обрабатывает файл `storeBerforeActions.json` из **исходной** директории модуля (`$sourcePath/_i/`).
- Извлекает пути к файлам.
- Вызывает `backupFiles()` для копирования файлов из **текущей установленной** версии (`$destinationPath`) в директорию
  бэкапа (`$storageDir`).

## Дополнительные методы (Вспомогательные)

- **processJsonFile()**: Читает и декодирует JSON-конфигурацию для операций с файлами.
- **extractFilePaths()**: Рекурсивно извлекает пути к файлам из JSON-конфигурации.
- **backupFiles()**: Резервирует файлы модуля, копируя их в назначенную директорию хранения.
- **installModule()**: Ведет журнал процесса установки для конкретного модуля (этот метод в основном используется для
  ведения журнала).
- **(Другие приватные методы):** `getFormSchema`, `getCurrentParams`, `clearTopBarLinksDirectory`, `copyFiles`,
  `processLinksFile`, `appendLinkToRoleFile`, `saveNewParams`.

## Взаимодействие с Хелперами

`InstallerController` активно делегирует задачи специализированным хелперам:

- `SchemaHelper`: Загружает схему формы инсталлятора.
- `InstallHelper`: Содержит основную логику обработки файлов модуля перед установкой (`processModuleFiles`,
  `backupFiles`).
- `FileHelper`: Выполняет базовые файловые операции.
- `JsonHelper`: Помогает в обработке JSON файлов.
- `LogHelper`: Записывает лог установки.
- `PermanentLinkManager`: Управляет пермалинками.
- `CssProcessor` (New): Генерирует CSS из JSON и создает манифест импортов.
- `AssetProcessor` (New): Копирует ассеты модуля согласно `assets.json`.

## Интеграция с Inertia.js

- Контроллер использует `Inertia::render` для интеграции с фронтендом Vue 3 (Options API).
- Это обеспечивает реактивность интерфейса установщика и возможность обработки динамических обновлений формы.
