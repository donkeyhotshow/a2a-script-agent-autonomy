<?php

namespace App\Console\Commands;

use App\Helpers\ArrayHelper;
use App\Hooks\FileFacade;
use Illuminate\Console\Command;


class Codebase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'codebase:update';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update codebase structure files based on currentCodebase.json';

    // Флаги для включения/отключения оптимизаций
    private $optimizeSingleItemObjectsEnabled = true;
    private $mergeSingleItemsToEmptyKeyEnabled = true;// --- true
    // private $mergeSingleItemsToEmptyKeyEnabled = false;// --- true
    private $optimizeEmptyKeyStructureEnabled = true;

    private $convertNestedPathsEnabled = true;
    private $deepMergeKeyPathsEnabled = true;


    /**
     * Execute the console command.
     */
    public function handle()
    {
        $currentCodebasePath = storage_path('aiCore/codebase/currentCodebase.json');
        $targetDir = storage_path('aiCore/codebase/uni');

        if (!FileFacade::exists($currentCodebasePath)) {
            $this->error("File currentCodebase.json not found at: {$currentCodebasePath}");
            return 1;
        }

        $filesList = json_decode(FileFacade::get($currentCodebasePath), true);

        if (!is_array($filesList)) {
            $this->error("Invalid JSON format in currentCodebase.json");
            return 1;
        }

        // Define the prefixes and their corresponding output files
        $sections = [
            'app' => 'app.json',
            'config' => 'config.json',
            'docs' => 'docs.json',
            'resources' => 'resources.json',
            'routes' => 'routes.json',
            'ai' => 'ai.json',
            'tests' => 'tests.json',
        ];

        // Очистка файлов sections перед циклом записи
        foreach ($sections as $outputFile) {
            $outputPath = "{$targetDir}/{$outputFile}";
            if (FileFacade::exists($outputPath)) {
                FileFacade::delete($outputPath);
            }
        }

        // Process each section
        foreach ($sections as $prefix => $outputFile) {
            $sectionData = $this->organizeFilesByPrefix($filesList, $prefix);
            $result = [
                $prefix => $sectionData
            ];

            $outputPath = "{$targetDir}/{$outputFile}";

            // If file exists, read its content and merge
            if (FileFacade::exists($outputPath)) {
                $existingContent = json_decode(FileFacade::get($outputPath), true);
                if (is_array($existingContent) && isset($existingContent[$prefix])) {
                    // Preserve existing structure but add new files
                    $result = $this->mergeStructures($existingContent, $result);
                }
            }

            // Save the result
            FileFacade::put(
                $outputPath,
                json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );

            $this->info("Updated {$outputFile}");
        }

        // Добавляем вызов постобработки после создания файлов
        $this->postProcessFiles();

        $this->info("Codebase structure files have been updated and post-processed successfully.");
        return 0;
    }

    /**
     * Organize files by their prefix into a structured array
     *
     * @param array $filesList
     * @param string $prefix
     * @return array
     */
    private function organizeFilesByPrefix(array $filesList, string $prefix)
    {
        $prefixFiles = array_filter($filesList, function ($file) use ($prefix) {
            return strpos($file, $prefix . '/') === 0 || strpos($file, $prefix . '\\') === 0;
        });

        $structure = [];

        foreach ($prefixFiles as $file) {
            // Remove the prefix part
            $relativePath = preg_replace('/^' . preg_quote($prefix, '/') . '[\/\\\\]/', '', $file);

            // Split the path into components
            $components = preg_split('/[\/\\\\]/', $relativePath);

            // Build the nested structure
            $this->addToStructure($structure, $components);
        }

        return $structure;
    }

    /**
     * Recursively build the nested structure from path components
     *
     * @param array &$structure Reference to the structure being built
     * @param array $components Path components
     */
    private function addToStructure(&$structure, array $components)
    {
        // If we're at the file level (last component)
        if (count($components) === 1) {
            $fileName = $components[0];

            // Check if this path already exists as a key in the structure
            if (isset($structure[$fileName]) && is_array($structure[$fileName])) {
                // This is already a directory, do nothing
                return;
            }

            // If the structure doesn't have "" key yet, create it
            if (!isset($structure[''])) {
                $structure[''] = [];
            }

            // Add the file to the "" array if not already present
            if (!in_array($fileName, $structure[''])) {
                $structure[''][] = $fileName;
            }
            return;
        }

        $currentDir = $components[0];
        array_shift($components);

        // If the current component is already in the structure as a direct file, remove it
        if (isset($structure['']) && in_array($currentDir, $structure[''])) {
            $structure[''] = array_diff($structure[''], [$currentDir]);
            if (empty($structure[''])) {
                unset($structure['']);
            }
        }

        // Create the nested structure if it doesn't exist
        if (!isset($structure[$currentDir])) {
            $structure[$currentDir] = [];
        } else if (!is_array($structure[$currentDir])) {
            // Convert from direct file to directory
            $structure[$currentDir] = [];
        }

        // Continue recursively
        $this->addToStructure($structure[$currentDir], $components);
    }

    /**
     * Merge two structures, preserving the existing one and adding new items
     *
     * @param array $existing
     * @param array $new
     * @return array
     */
    private function mergeStructures(array $existing, array $new)
    {
        $result = $existing;

        foreach ($new as $key => $value) {
            if (!isset($result[$key])) {
                // Key doesn't exist in the result, simply add it
                $result[$key] = $value;
            } else if (is_array($value) && is_array($result[$key])) {
                // Both are arrays, need to merge recursively
                if (array_keys($value) === range(0, count($value) - 1) &&
                    array_keys($result[$key]) === range(0, count($result[$key]) - 1)) {
                    // Both are indexed arrays, merge and remove duplicates
                    $result[$key] = array_values(array_unique(array_merge($result[$key], $value)));
                } else {
                    // Associative arrays, merge recursively
                    $result[$key] = $this->mergeStructures($result[$key], $value);
                }
            }
            // If the key exists but types are different, keep the existing value
        }

        return $result;
    }

    /**
     * Post-process generated JSON files with specific optimizations
     */
    private function postProcessFiles()
    {
        $targetDir = storage_path('aiCore/codebase/uni');
        $jsonFiles = FileFacade::files($targetDir);

        foreach ($jsonFiles as $file) {
            if ($file->getExtension() !== 'json') continue;

            $content = json_decode(FileFacade::get($file->getPathname()), true);

            // Новый порядок выполнения: 2, 4, 1, 2, 3, 5

            // 2. Оптимизация: Упрощение массивов с одним элементом
            if ($this->optimizeSingleItemObjectsEnabled) {
                $content = $this->optimizeSingleItemObjects($content);
            }

            // 4. Новая оптимизация: Объединение одиночных элементов в елементы с пустым ключом
            if ($this->mergeSingleItemsToEmptyKeyEnabled) {
                $content = $this->mergeSingleItemsToEmptyKey($content);
            }

            // 1. Оптимизация: Упрощение структур с пустым ключом
            if ($this->optimizeEmptyKeyStructureEnabled) {
                $content = $this->optimizeEmptyKeyStructure($content);
            }

            // 2. Оптимизация: Упрощение массивов с одним элементом
            if ($this->optimizeSingleItemObjectsEnabled) {
                $content = $this->optimizeSingleItemObjects($content);
            }

            // 3. Оптимизация: Объединение ключей в путь (одноуровневое)
            if ($this->convertNestedPathsEnabled) {
                $content = $this->optimizeKeyChainsToPath($content);
            }

            // 5. Новая оптимизация: Глубокое объединение ключей в путь
            if ($this->deepMergeKeyPathsEnabled) {
                $content = $this->deepMergeKeyPaths($content);
            }

            // Сохраняем оптимизированный файл
            FileFacade::put(
                $file->getPathname(),
                json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            );
        }
    }

    /**
     * Оптимизация 2: Упрощение массивов с одним элементом
     * Преобразует ["item"] в "item"
     *
     * @param mixed $data
     * @return mixed
     */
    private function optimizeSingleItemObjects($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        // Рекурсивно обрабатываем вложенные структуры
        $result = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $processed = $this->optimizeSingleItemObjects($value);

                // Проверяем, является ли массив списком с одним элементом
                if (ArrayHelper::isList($processed) && count($processed) === 1) {
                    $result[$key] = $processed[0];
                } else {
                    $result[$key] = $processed;
                }
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Оптимизация 4: Объединение одиночных элементов в элемент с пустым ключом с проверкой эффективности
     * Преобразует {"Admin": "OrderAdded.php", "": ["OrderAdded.php"]}
     * в {"": ["Admin/OrderAdded.php", "OrderAdded.php"]}, только если это уменьшает размер JSON
     *
     * @param mixed $data
     * @return mixed
     */
    private function mergeSingleItemsToEmptyKey($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        // Если это не ассоциативный массив, просто обрабатываем его элементы
        if (!ArrayHelper::isAssociative($data)) {
            return array_map([$this, 'mergeSingleItemsToEmptyKey'], $data);
        }

        // Рекурсивно обрабатываем все дочерние элементы
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->mergeSingleItemsToEmptyKey($value);
            }
        }

        // Проверяем, есть ли ключ "" в массиве
        if (!isset($data[''])) {
            return $data;
        }

        // Получаем массив с пустым ключом
        $emptyKeyArray = $data[''];
        if (!is_array($emptyKeyArray)) {
            $emptyKeyArray = [$emptyKeyArray];
        }

        // Сохраняем элементы для объединения и исходный размер JSON
        $itemsToMerge = [];
        $originalJsonLength = strlen(json_encode($data));

        // Проходим по всем другим ключам и собираем элементы для объединения
        $result = $data;
        foreach ($data as $key => $value) {
            if ($key === '') {
                continue; // Пропускаем пустой ключ, уже обработали
            }

            if (!is_array($value)) {
                // Если значение не массив, добавляем его в список на объединение
                $itemsToMerge[] = $key . '/' . $value;
                unset($result[$key]);
            } elseif (!isset($value[''])) {
                // Если в дочернем элементе нет пустого ключа, пропускаем его
                continue;
            } else {
                // Перебираем файлы в дочернем элементе и добавляем их в список на объединение
                $childEmptyKey = $value[''];
                if (!is_array($childEmptyKey)) {
                    $childEmptyKey = [$childEmptyKey];
                }

                foreach ($childEmptyKey as $file) {
                    $itemsToMerge[] = $key . '/' . $file;
                }

                // Удаляем дочерний пустой ключ
                unset($result[$key]['']);

                // Если дочерний элемент теперь пуст, удаляем его
                if (empty($result[$key])) {
                    unset($result[$key]);
                }
            }
        }

        // Объединяем элементы с пустым ключом
        $mergedEmptyKeyArray = array_merge($emptyKeyArray, $itemsToMerge);
        $result[''] = $mergedEmptyKeyArray;

        // Проверка эффективности: сравниваем длину JSON до и после оптимизации
        $optimizedJsonLength = strlen(json_encode($result));

        if ($optimizedJsonLength < $originalJsonLength) {
            return $result; // Применяем оптимизацию, если она уменьшает размер
        } else {
            return $data; // Отклоняем оптимизацию, если она увеличивает размер
        }
    }

    /**
     * Оптимизация 1: Упрощение структур с пустым ключом
     * Преобразует {"": [...]} в [...]
     *
     * @param mixed $data
     * @return mixed
     */
    private function optimizeEmptyKeyStructure($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        // Рекурсивно обрабатываем вложенные структуры
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->optimizeEmptyKeyStructure($value);
            }
        }

        // Если в массиве только один элемент с пустым ключом, возвращаем его значение
        if (count($data) === 1 && array_key_exists('', $data) && is_array($data[''])) {
            return $data[''];
        }

        return $data;
    }

    /**
     * Оптимизация 3: Объединение ключей в путь
     * Преобразует {"key1": {"key2": value}} в {"key1/key2": value}
     *
     * @param mixed $data
     * @return mixed
     */
    private function optimizeKeyChainsToPath($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        // Если это не ассоциативный массив, просто обрабатываем его элементы
        if (!ArrayHelper::isAssociative($data)) {
            return array_map([$this, 'optimizeKeyChainsToPath'], $data);
        }

        $result = [];
        foreach ($data as $key => $value) {
            if (is_array($value) && ArrayHelper::isAssociative($value) && count($value) === 1) {
                // Получаем единственный ключ и его значение
                $subKey = array_key_first($value);
                $subValue = $value[$subKey];

                // Формируем новый ключ в формате "key/subKey"
                $newKey = trim($key . '/' . $subKey, '/');

                // Рекурсивно обрабатываем значение
                $result[$newKey] = $this->optimizeKeyChainsToPath($subValue);
            } else {
                // Рекурсивно обрабатываем значение
                $result[$key] = is_array($value) ? $this->optimizeKeyChainsToPath($value) : $value;
            }
        }

        return $result;
    }

    /**
     * Оптимизация 5: Глубокое объединение ключей в путь
     * Преобразует {"code/app": {"AiRudeDepot/Modules": "LoginForm.php"}}
     * в {"code/app/AiRudeDepot/Modules": "LoginForm.php"}
     *
     * @param mixed $data
     * @return mixed
     */
    private function deepMergeKeyPaths($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        // Если это не ассоциативный массив, просто обрабатываем его элементы
        if (!ArrayHelper::isAssociative($data)) {
            return array_map([$this, 'deepMergeKeyPaths'], $data);
        }

        $result = [];

        foreach ($data as $key => $value) {
            // Если ключ уже содержит слеш и значение - ассоциативный массив,
            // то объединяем его со всеми подключами
            if (is_array($value) && ArrayHelper::isAssociative($value) && strpos($key, '/') !== false) {
                $processed = $this->deepMergeKeyPaths($value);

                foreach ($processed as $subKey => $subValue) {
                    $newKey = $key . ($subKey === '' ? '' : '/' . $subKey);
                    $result[$newKey] = $subValue;
                }
            } else if (is_array($value)) {
                $result[$key] = $this->deepMergeKeyPaths($value);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }
}
