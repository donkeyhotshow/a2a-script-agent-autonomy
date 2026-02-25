<?php

namespace Tests\Traits;

use App\Hooks\FileFacade;

// Используем наш фасад
use Illuminate\Support\Facades\Storage;

// Можно использовать и стандартный Storage

trait ModuleTestingSetup
{
    protected string $realModuleBase = 'storage/ai'; // Путь к реальным модулям
    protected string $realPermalinkBase = 'storage/ai/permalinks'; // Путь к реальным пермалинкам
    protected string $realCoreBase = 'storage/aiCore'; // Путь к реальному ядру (для модификаторов)

    protected string $testModuleBase = 'storage/aiTest/modules'; // Куда копировать модули для теста
    protected string $testPermalinkBase = 'storage/aiTest/permalinks'; // Куда копировать пермалинки для теста
    protected string $testCoreBase = 'storage/aiCoreTest/modules/modificators'; // Куда копировать модификаторы для теста

    /**
     * Настраивает тестовое окружение для указанного модуля.
     *
     * @param string $moduleName Имя директории модуля (например, 'primary-form')
     * @param string $permalinkPath Путь пермалинка ОТНОСИТЕЛЬНО $realPermalinkBase (например, 'primary-form/page')
     * @param array $requiredModificators Список имен файлов модификаторов без .json (например, ['pageModule', 'topBarModule'])
     * @param string|null $moduleSourcePath Опциональный путь к исходникам модуля (если не storage/ai/{$moduleName})
     * @return array Данные скопированного пермалинка
     */
    protected function setUpModuleEnvironment(string $moduleName, string $permalinkPath, array $requiredModificators = [], ?string $moduleSourcePath = null): array
    {
        // --- Настройка путей ---
        $sourceModuleDir = storage_path($moduleSourcePath ?? $this->realModuleBase . '/' . $moduleName);
        $targetModuleDir = storage_path($this->testModuleBase . '/' . $moduleName);

        $sourcePermalinkFile = storage_path($this->realPermalinkBase . '/' . $permalinkPath . '.json');
        $targetPermalinkDir = storage_path($this->testPermalinkBase . '/' . dirname($permalinkPath));
        $targetPermalinkFile = storage_path($this->testPermalinkBase . '/' . $permalinkPath . '.json');

        $sourceModificatorDir = storage_path($this->realCoreBase . '/modules/modificators');
        $targetModificatorDir = storage_path($this->testCoreBase);

        // --- Очистка и создание директорий ---
        FileFacade::deleteDirectory($targetModuleDir);
        FileFacade::deleteDirectory(dirname($targetPermalinkFile)); // Удаляем директорию пермалинка
        FileFacade::deleteDirectory($targetModificatorDir);

        FileFacade::makeDirectory($targetModuleDir, 0755, true, true);
        FileFacade::makeDirectory($targetPermalinkDir, 0755, true, true);
        FileFacade::makeDirectory($targetModificatorDir, 0755, true, true);

        // --- Копирование Файлов ---
        // Копируем модуль
        if (!FileFacade::exists($sourceModuleDir)) {
            $this->fail("Исходная директория модуля не найдена: {$sourceModuleDir}");
        }
        FileFacade::copyDirectory($sourceModuleDir, $targetModuleDir);
        dump("Copied module '{$moduleName}' from {$sourceModuleDir} to {$targetModuleDir}");

        // Копируем пермалинк
        if (!FileFacade::exists($sourcePermalinkFile)) {
            $this->fail("Исходный файл пермалинка не найден: {$sourcePermalinkFile}");
        }
        FileFacade::copy($sourcePermalinkFile, $targetPermalinkFile);
        dump("Copied permalink '{$permalinkPath}' from {$sourcePermalinkFile} to {$targetPermalinkFile}");

        // Копируем необходимые модификаторы
        foreach ($requiredModificators as $modName) {
            $sourceModFile = $sourceModificatorDir . '/' . $modName . '.json';
            $targetModFile = $targetModificatorDir . '/' . $modName . '.json';
            if (FileFacade::exists($sourceModFile)) {
                FileFacade::copy($sourceModFile, $targetModFile);
                dump("Copied modificator '{$modName}' from {$sourceModFile} to {$targetModFile}");
            } else {
                dump("Warning: Required modificator '{$modName}' not found at {$sourceModFile}");
                // Можно добавить $this->fail() если модификатор критичен
            }
        }

        // Настройка конфигов для теста
        config(['ai.test_env_path' => 'aiTest']);
        config(['ai.test_core_env_path' => 'aiCoreTest']);

        // Читаем и возвращаем данные пермалинка для использования в тесте
        $permalinkData = json_decode(FileFacade::get($targetPermalinkFile), true);
        $permalinkData['__file_path'] = $targetPermalinkFile; // Добавляем путь для контроллера
        return $permalinkData;
    }

    /**
     * Очищает тестовое окружение для указанного модуля.
     *
     * @param string $moduleName
     * @param string $permalinkPath Путь пермалинка ОТНОСИТЕЛЬНО $realPermalinkBase
     */
    protected function tearDownModuleEnvironment(string $moduleName, string $permalinkPath): void
    {
        FileFacade::deleteDirectory(storage_path($this->testModuleBase . '/' . $moduleName));
        // Удаляем всю директорию пермалинка, чтобы не оставлять пустых папок
        $permalinkDir = dirname($permalinkPath);
        if ($permalinkDir !== '.') { // Не удаляем корневую папку пермалинков
            FileFacade::deleteDirectory(storage_path($this->testPermalinkBase . '/' . $permalinkDir));
        } else {
            FileFacade::delete(storage_path($this->testPermalinkBase . '/' . $permalinkPath . '.json'));
        }

        // Не очищаем модификаторы, т.к. они могут использоваться другими тестами в рамках одного запуска
        // FileFacade::deleteDirectory(storage_path($this->testCoreBase));
    }

    protected function getRealPermalinkData(string $permalinkPath): ?array
    {
        $path = storage_path($this->realPermalinkBase . '/' . $permalinkPath . '.json');
        if (!FileFacade::exists($path)) {
            return null;
        }
        return json_decode(FileFacade::get($path), true);
    }

    protected function getRealModuleJson(string $moduleName, string $fileName): ?array
    {
        $path = storage_path($this->realModuleBase . '/' . $moduleName . '/' . $fileName);
        if (!FileFacade::exists($path)) {
            return null;
        }
        return json_decode(FileFacade::get($path), true);
    }
}
