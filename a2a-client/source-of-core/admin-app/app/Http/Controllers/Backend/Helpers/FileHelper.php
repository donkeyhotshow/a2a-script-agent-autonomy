<?php

namespace App\Http\Controllers\Backend\Helpers;

// Используем новый общий FileHelper
use App\Helpers\FileHelper as CommonFileHelper; 
use App\Hooks\FileFacade; // Оставляем, если все еще нужен для чего-то специфичного, или если CommonFileHelper его не полностью заменяет
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use InvalidArgumentException;

class FileHelper
{
    /**
     * Copy files from source to destination.
     *
     * @param string $sourcePath
     * @param string $destinationPath
     * @param array $files
     * @param array &$log
     * @param bool $isCommon
     * @return bool
     * @throws InvalidArgumentException
     */
    public function copyFiles(string $sourcePath, string $destinationPath, array $files, array &$log, bool $isCommon = false): bool
    {
        // Validate paths
        if (!PathHelper::isValid($sourcePath) || !PathHelper::isValid($destinationPath)) {
            throw new InvalidArgumentException('Invalid source or destination path');
        }

        // Check if source directory exists and is accessible
        if (!CommonFileHelper::isAccessible($sourcePath)) {
            LogHelper::warning('FileHelper::copyFiles', 'Source directory not found or not accessible', [
                'sourcePath' => $sourcePath
            ]);
            $log[] = "Ошибка: исходная директория не найдена или недоступна: {$sourcePath}";
            return false;
        }

        // Check if destination directory exists and is writable
        if (!CommonFileHelper::isWritable($destinationPath)) {
            LogHelper::warning('FileHelper::copyFiles', 'Destination directory not writable', [
                'destinationPath' => $destinationPath
            ]);
            $log[] = "Ошибка: директория назначения недоступна для записи: {$destinationPath}";
            return false;
        }

        try {
            // Use common helper to copy files
            if (CommonFileHelper::copyItems($sourcePath, $destinationPath, $files, true)) {
                foreach ($files as $file) {
                    $log[] = ($isCommon ? "    Копирование общ" : "    Копирование") . " элемента: {$file} - Успешно";
                }
                return true;
            }

            // Log error for each file
            foreach ($files as $file) {
                $log[] = ($isCommon ? "    Копирование общ" : "    Копирование") . " элемента: {$file} - Ошибка";
            }
            return false;

        } catch (\Exception $e) {
            LogHelper::error('FileHelper::copyFiles', 'Failed to copy files', [
                'sourcePath' => $sourcePath,
                'destinationPath' => $destinationPath,
                'error' => $e->getMessage()
            ]);
            $log[] = "Ошибка при копировании группы элементов: {$e->getMessage()}";
            return false;
        }
    }

    /**
     * Delete files from the source directory.
     *
     * @param string $moduleName
     * @param string $basePath
     * @param array $files
     * @param array &$log
     * @return bool
     * @throws InvalidArgumentException
     */
    public function deleteFiles(string $moduleName, string $basePath, array $files, array &$log): bool
    {
        // Validate path
        if (!PathHelper::isValid($basePath)) {
            throw new InvalidArgumentException('Invalid base path');
        }

        // Check if base directory exists and is accessible
        if (!CommonFileHelper::isAccessible($basePath)) {
            LogHelper::warning('FileHelper::deleteFiles', 'Base directory not found or not accessible', [
                'basePath' => $basePath,
                'moduleName' => $moduleName
            ]);
            $log[] = "Ошибка: базовая директория не найдена или недоступна: {$basePath}";
            return false;
        }

        try {
            // Use common helper to delete files
            if (CommonFileHelper::deleteItems($basePath, $files)) {
                foreach ($files as $filePath) {
                    $log[] = "  Удален элемент: {$filePath} из модуля {$moduleName}";
                }
                return true;
            }

            // Log error for each file
            foreach ($files as $filePath) {
                $log[] = "  Ошибка удаления элемента: {$filePath} из модуля {$moduleName}";
            }
            return false;

        } catch (\Exception $e) {
            LogHelper::error('FileHelper::deleteFiles', 'Failed to delete files', [
                'basePath' => $basePath,
                'moduleName' => $moduleName,
                'error' => $e->getMessage()
            ]);
            $log[] = "Ошибка при удалении группы элементов: {$e->getMessage()}";
            return false;
        }
    }

    /**
     * Clear the scene directory.
     *
     * @param string $sceneDir
     * @param array &$log
     * @return bool
     * @throws InvalidArgumentException
     */
    public function clearSceneDirectory(string $sceneDir, array &$log): bool
    {
        // Validate path
        if (!PathHelper::isValid($sceneDir)) {
            throw new InvalidArgumentException('Invalid scene directory path');
        }

        // Check if scene directory exists and is accessible
        if (!CommonFileHelper::isAccessible($sceneDir)) {
            LogHelper::warning('FileHelper::clearSceneDirectory', 'Scene directory not found or not accessible', [
                'sceneDir' => $sceneDir
            ]);
            $log[] = "Ошибка: директория сцены не найдена или недоступна: {$sceneDir}";
            return false;
        }

        try {
            // Get module directories
            $items = FileFacade::isDirectory($sceneDir) ? scandir($sceneDir) : [];
            $moduleDirs = array_filter($items, function ($item) use ($sceneDir) {
                return $item !== '.' && $item !== '..' && FileFacade::isDirectory(PathHelper::join($sceneDir, $item));
            });

            $success = true;
            foreach ($moduleDirs as $moduleName) {
                $moduleSceneDir = PathHelper::join($sceneDir, $moduleName);
                if (CommonFileHelper::deleteDirectory($moduleSceneDir)) {
                    $log[] = "Директория сцены модуля {$moduleName} очищена";
                } else {
                    $log[] = "Ошибка при очистке директории сцены модуля {$moduleName}";
                    $success = false;
                }
            }

            return $success;

        } catch (\Exception $e) {
            LogHelper::error('FileHelper::clearSceneDirectory', 'Failed to clear scene directory', [
                'sceneDir' => $sceneDir,
                'error' => $e->getMessage()
            ]);
            $log[] = "Ошибка при очистке директории сцены: {$e->getMessage()}";
            return false;
        }
    }

    // Удалены методы: recursiveCopy, copyDirectory, copyDirectoryRecursive, recursiveDelete, 
    // так как их функциональность покрывается новым App\Helpers\FileHelper
}
