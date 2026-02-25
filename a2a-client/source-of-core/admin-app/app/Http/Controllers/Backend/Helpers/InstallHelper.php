<?php

namespace App\Http\Controllers\Backend\Helpers;

use App\Hooks\FileFacade;


class InstallHelper extends FileHelper
{
    public $fileHelper;
    public $jsonHelper;
    public $logHelper;

    public function __construct(FileHelper $fileHelper = null, JsonHelper $jsonHelper = null, LogHelper $logHelper = null)
    {
        $this->fileHelper = $fileHelper ?? new FileHelper();
        $this->jsonHelper = $jsonHelper ?? new JsonHelper();
        $this->logHelper = $logHelper ?? new LogHelper();
    }

    /**
     * Static method to install modules or sections.
     *
     * @param string $storageTargetName Target storage directory name (e.g., 'ai', 'aiTest', 'aiScene')
     * @param string $moduleName Name of the module
     * @param array $items Array of item names to install (component names)
     * @param bool $includeCommon Include common files for the module
     */
    public static function install(
        $storageTargetName,
        $moduleName,
        $items,
        $includeCommon = false
    )
    {
        // Create an instance to use non-static methods
        $instance = new self(new FileHelper(), new JsonHelper(), new LogHelper());
        return $instance->installModule($storageTargetName, $moduleName, $items, $includeCommon);
    }

    /**
     * Instance method to install modules.
     */
    public function installModule(
        $storageTargetName,
        $moduleName,
        $items,
        $includeCommon = false
    )
    {
        $installerDir = 'aiInstaller';
        $storedDir = 'aiStored';

        $source = base_path("install-modules/{$installerDir}/{$moduleName}");
        $storage = base_path("storage/{$storedDir}/{$moduleName}");
        $destination = storage_path("{$storageTargetName}/{$moduleName}");

        $installLog = [];

        if (!FileFacade::exists($source)) {
            $installLog[] = "Модуль {$moduleName}: исходная директория не найдена.";
            return $installLog;
        }

        // --- 1. BACKUP FILES BASED ON storeBerforeActions.json ---
        $installLog[] = "Модуль {$moduleName}: резервное копирование файлов согласно storeBerforeActions.json...";
        $this->processModuleFiles($moduleName, $source, $destination, $storage, $installLog);

        // --- 2. CLEAR DESTINATION DIRECTORY ---
        if (FileFacade::exists($destination)) {
            $installLog[] = "Модуль {$moduleName}: очистка папки модуля...";
            FileFacade::deleteDirectory($destination);
        }

        // --- 3. INSTALLATION ---
        if (!FileFacade::exists($destination)) {
            FileFacade::makeDirectory($destination, 0777, true);
        }
        $installLog[] = "Модуль {$moduleName}: установка активированных компонентов...";
        $hasActiveComponents = false;

        // Get form schema to access section items and common files
        $formSchema = SchemaHelper::getFormSchema($installerDir);
        $moduleSection = null;
        foreach ($formSchema['sections'] as $section) {
            if ($section['name'] === $moduleName) {
                $moduleSection = $section;
                break;
            }
        }

        if (!$moduleSection) {
            $installLog[] = "Модуль {$moduleName}: секция не найдена в схеме.";
            return $installLog;
        }

        foreach ($moduleSection['items'] as $item) {
            $itemName = $item['name'];
            $componentName = str_replace($moduleName . '-', '', $itemName);

            if (in_array($componentName, $items)) {
                $hasActiveComponents = true;
                $installLog[] = "  Компонент {$componentName}: установка...";
                if (!empty($item['files'])) {
                    $this->fileHelper->copyFiles($source, $destination, $item['files'], $installLog);
                } else {
                    $installLog[] = "    Для компонента не указаны файлы для копирования.";
                }
            }
        }

        if ($includeCommon && $hasActiveComponents && !empty($moduleSection['commonFiles'])) {
            $installLog[] = "  Установка общих файлов модуля...";
            $this->fileHelper->copyFiles($source, $destination, $moduleSection['commonFiles'], $installLog, true);
        }

        // --- 4. RESTORE FROM BACKUP (if backup exists) ---
        if (FileFacade::exists($storage)) {
            $installLog[] = "Модуль {$moduleName}: восстановление данных из резервной копии...";
            if (!FileFacade::exists($destination)) {
                FileFacade::makeDirectory($destination, 0777, true);
            }
            FileFacade::copyDirectory($storage, $destination);
            $installLog[] = "  Модуль {$moduleName}: данные восстановлены из {$storedDir}.";
        }

        return $installLog;
    }

    /**
     * Process module files - handles backup based on 'storeBerforeActions.json'.
     */
    public function processModuleFiles($moduleName, $sourcePath, $destinationPath, $storageDir, &$log)
    {
        $log[] = "  Модуль {$moduleName}: обработка файлов согласно storeBerforeActions.json...";
        $this->jsonHelper->processJsonFile(
            $moduleName,
            $sourcePath,
            $destinationPath,
            'storeBerforeActions.json',
            function ($filesToProcess) use ($moduleName, $sourcePath, $destinationPath, $storageDir, &$log) {
                $this->backupFiles($moduleName, $sourcePath, $destinationPath, $storageDir, $filesToProcess, $log);
            }
        );
    }

    /**
     * Backup files from destination to storage directory.
     */
    public function backupFiles($moduleName, $sourcePath, $destinationPath, $storageDir, $files, &$log)
    {
        $log[] = "  Модуль {$moduleName}: резервное копирование файлов согласно storeBerforeActions.json..." . json_encode($files);

        if (!FileFacade::exists($storageDir)) {
            FileFacade::makeDirectory($storageDir, 0777, true);
            $log[] = "  Создана директория для хранения данных модуля {$moduleName}.";
        }

        foreach ($files as $filePath) {
            $srcFile = $destinationPath . DIRECTORY_SEPARATOR . $filePath;
            $destFile = $storageDir . DIRECTORY_SEPARATOR . $filePath;

            if (FileFacade::exists($srcFile)) {
                FileFacade::ensureDirectoryExists(dirname($destFile));

                if (is_dir($srcFile)) {
                    FileFacade::copyDirectory($srcFile, $destFile);
                    $log[] = "  Сохранена директория: {$filePath} из модуля {$moduleName}.";
                } else {
                    FileFacade::copy($srcFile, $destFile);
                    $log[] = "  Сохранен файл: {$filePath} из модуля {$moduleName}.";
                }
            } else {
                $log[] = "  ПРОПУЩЕНО (файл не найден): {$filePath} в модуле {$moduleName}.";
            }
        }
    }
}
