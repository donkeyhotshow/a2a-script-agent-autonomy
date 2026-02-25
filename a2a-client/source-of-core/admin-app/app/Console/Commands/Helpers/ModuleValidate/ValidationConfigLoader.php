<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as File;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Finder\Finder;
use Throwable;

trait ValidationConfigLoader
{
    protected array $componentRuleSourcePaths = [];
    protected array $componentRulePathCache = [];

    public function loaderGetComponentRules(string $componentType): ?array
    {
        $cacheKey = strtolower($componentType);
        $logChannel = $this->logChannelName ?? 'stack';
        $isFoundInCache = isset($this->componentValidationRulesCache[$cacheKey]);

        // Log::debug(
        //     '[ValidationConfigLoader][loaderGetComponentRules] Start. Object hash: ' . spl_object_hash($this) . PHP_EOL .
        //     '    Requested componentType: ' . $componentType . ', Target CacheKey: ' . $cacheKey . PHP_EOL .
        //     '    Current componentValidationRulesCache keys: ' . implode(', ', array_keys($this->componentValidationRulesCache ?? [])) . PHP_EOL .
        //     '    Isset in componentValidationRulesCache[' . $cacheKey . ']? ' . ($isFoundInCache ? 'Yes' : 'No')
        // );

        return $this->componentValidationRulesCache[$cacheKey] ?? null;
    }

    public function loaderGetComponentRulePath(string $componentType): ?string
    {
        $cacheKey = strtolower($componentType);
        $logChannel = $this->logChannelName ?? 'stack';
        $isFoundInCache = isset($this->componentRulePathCache[$cacheKey]);

        // Log::debug(
        //     '[ValidationConfigLoader][loaderGetComponentRulePath] Start. Object hash: ' . spl_object_hash($this) . PHP_EOL .
        //     '    Requested componentType: ' . $componentType . ', Target CacheKey: ' . $cacheKey . PHP_EOL .
        //     '    Current componentRulePathCache keys: ' . implode(', ', array_keys($this->componentRulePathCache ?? [])) . PHP_EOL .
        //     '    Isset in componentRulePathCache[' . $cacheKey . ']? ' . ($isFoundInCache ? 'Yes' : 'No')
        // );

        return $this->componentRulePathCache[$cacheKey] ?? null;
    }

    /**
     * Load and validate the master keys configuration file.
     *
     * @return bool True on success, false on failure.
     */
    protected function loadValidationConfig(): bool
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $configDir = base_path($this->configBasePath);
        $keysConfigPath = $configDir . "/master-known-keys.json";
        $success = true;

        // if (!File::exists($keysConfigPath)) {
        //     $errorMessage = "Required master keys config file not found: {$keysConfigPath}";
        //     Log::channel($logChannel)->error($errorMessage);
        //     $this->error($errorMessage);
        //     return false;
        // }
        // try {
        //     $keysConfigContent = File::get($keysConfigPath);
        //     $this->masterKnownKeys = json_decode($keysConfigContent, true, 512, JSON_THROW_ON_ERROR);
        //     if (!is_array($this->masterKnownKeys)) {
        //         $errorMessage = "Failed to decode master JSON keys config or it's not an array: {$keysConfigPath}";
        //         Log::channel($logChannel)->error($errorMessage);
        //         $this->error($errorMessage);
        //         $success = false;
        //     }
        // } catch (Throwable $e) {
        //     $errorMessage = "Failed to load or parse master keys config file {$keysConfigPath}: " . $e->getMessage();
        //     Log::channel($logChannel)->error($errorMessage);
        //     $this->error($errorMessage);
        //     $success = false;
        // }

        // return $success;
        return true;
    }

    /**
     * Load the validation suggestions configuration file.
     *
     * @return void
     */
    protected function loadValidationSuggestions(): void
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $suggestionsPath = base_path('install-modules/aiCore/validation/suggestions.json');
        if (!File::exists($suggestionsPath)) {
            $message = "Validation suggestions file not found (optional): {$suggestionsPath}";
            Log::channel($logChannel)->info($message);
            $this->comment($message);
            $this->validationSuggestions = [];
            return;
        }

        try {
            $suggestionsContent = File::get($suggestionsPath);
            $data = json_decode($suggestionsContent, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($data)) {
                $warningMessage = "Invalid format in validation suggestions file: {$suggestionsPath}. Expected a JSON object.";
                Log::channel($logChannel)->warning($warningMessage);
                $this->warn($warningMessage);
                $this->validationSuggestions = [];
                return;
            }

            // Store type suggestions in the original property for backwards compatibility
            $this->validationSuggestions = $data['type_suggestions'] ?? [];

            // Log the categories of suggestions found
            $categoriesFound = array_keys($data);
            Log::channel($logChannel)->info("Successfully loaded validation suggestions from: {$suggestionsPath}. Categories: " . implode(', ', $categoriesFound));

            // Count suggestions by category
            $typeSuggestionsCount = isset($data['type_suggestions']) ? count($data['type_suggestions']) : 0;
            $operationSuggestionsCount = isset($data['operation_suggestions']) ? count($data['operation_suggestions']) : 0;
            $schemaSuggestionsCount = isset($data['schema_suggestions']) ? count($data['schema_suggestions']) : 0;
            $propertySuggestionsCount = isset($data['property_suggestions']) ? count($data['property_suggestions']) : 0;

            Log::channel($logChannel)->info("Suggestion counts - Types: {$typeSuggestionsCount}, Operations: {$operationSuggestionsCount}, Schema: {$schemaSuggestionsCount}, Properties: {$propertySuggestionsCount}");

            // Log some of the key suggestions for debugging
            if ($typeSuggestionsCount > 0) {
                $typeKeys = array_keys($data['type_suggestions']);
                Log::channel($logChannel)->debug("Type suggestion examples: " . implode(', ', array_slice($typeKeys, 0, 5)) . (count($typeKeys) > 5 ? '...' : ''));
            }

            if ($propertySuggestionsCount > 0) {
                $propKeys = array_keys($data['property_suggestions']);
                Log::channel($logChannel)->debug("Property suggestion examples: " . implode(', ', $propKeys));
            }
        } catch (Throwable $e) {
            $errorMessage = "Failed to load or parse validation suggestions file {$suggestionsPath}: " . $e->getMessage();
            Log::channel($logChannel)->error($errorMessage);
            $this->error($errorMessage);
            $this->validationSuggestions = [];
        }
    }

    /**
     * Load all component validation rules from all levels into the cache.
     */
    protected function loadAllComponentRules(): void
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $this->componentValidationRulesCache = [];
        $this->componentRulePathCache = [];
        $loadedPaths = [];
        $logChannel = $this->logChannelName ?? 'stack'; // Ensure log channel is available

        $componentRulesDir = $this->configBasePath . DIRECTORY_SEPARATOR . 'components'; // Corrected path

        Log::channel($logChannel)->debug("[ValidationConfigLoader] Starting to load component rules. Base components directory: {$componentRulesDir}");

        $searchPaths = [
            $componentRulesDir,
        ];

        $finder = new Finder();
        $finder->name('*.json')->files()->ignoreDotFiles(true)->ignoreVCS(true);

        foreach ($searchPaths as $path) {
            if (is_dir($path)) {
                Log::channel($logChannel)->debug("[ValidationConfigLoader] Searching for rules in path: {$path}");
                $currentFinder = clone $finder;
                $currentFinder->in($path);

                try {
                    foreach ($currentFinder as $file) {
                        $filePath = $file->getRealPath();
                        $relativePath = Str::replaceFirst(base_path() . DIRECTORY_SEPARATOR, '', $filePath);
                        Log::channel($logChannel)->debug("[ValidationConfigLoader] Processing potential rule file: {$filePath} (Relative: {$relativePath})");

                        $content = file_get_contents($filePath);
                        if ($content === false) {
                            Log::channel($logChannel)->warning("[ValidationConfigLoader] Failed to read file content: {$filePath}");
                            continue;
                        }

                        $ruleContent = json_decode($content, true);

                        if (json_last_error() !== JSON_ERROR_NONE) {
                            Log::channel($logChannel)->warning("[ValidationConfigLoader] JSON decode error for file {$filePath}: " . json_last_error_msg());
                            continue;
                        }

                        if (!is_array($ruleContent)) {
                            Log::channel($logChannel)->warning("[ValidationConfigLoader] Decoded JSON is not an array for file: {$filePath}");
                            continue;
                        }

                        // FIRST_EDIT: Immediately resolve all $ref entries to flatten the schema and unify format
                        $ruleContent = $this->resolveRefsRecursive($ruleContent, $filePath);
                        // SECOND_EDIT: Ensure nested props 'allOf' are also flattened for explicit definitions
                        if (isset($ruleContent['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
                            $ruleContent['nestedValidation']['structure']['props']['nestedValidation']['structure'] =
                                $this->resolveRefsRecursive(
                                    $ruleContent['nestedValidation']['structure']['props']['nestedValidation']['structure'],
                                    $filePath
                                );
                        }

                        // FIRST_EDIT: Standardize componentName for any legacy type definitions
                        if (isset($ruleContent['type']) && is_string($ruleContent['type']) && empty($ruleContent['componentName'])) {
                            $ruleContent['componentName'] = $ruleContent['type'];
                            unset($ruleContent['type']);
                        }

                        $componentNameFromFile = $ruleContent['componentName'] ?? null;
                        $componentTypeFromFile = null;

                        if (!$componentNameFromFile && isset($ruleContent['type']) && is_string($ruleContent['type'])) {
                            if (!isset($ruleContent['required']) && !isset($ruleContent['nestedValidation']) && !isset($ruleContent['allowedValues'])) {
                                $componentTypeFromFile = $ruleContent['type'];
                                Log::channel($logChannel)->debug("[ValidationConfigLoader] Found component name in legacy 'type' field: {$componentTypeFromFile} in {$filePath}");
                            }
                        }

                        $nameToUse = $componentNameFromFile ?: $componentTypeFromFile;

                        if ($nameToUse) {
                            $cacheKey = strtolower($nameToUse);
                            Log::channel($logChannel)->debug("[ValidationConfigLoader] Extracted component name '{$nameToUse}', generated cacheKey '{$cacheKey}' for file {$filePath}");

                            if (isset($this->componentValidationRulesCache[$cacheKey])) {
                                Log::channel($logChannel)->warning("[ValidationConfigLoader] Duplicate component rule for type '{$cacheKey}'. Original: {$this->componentRulePathCache[$cacheKey]}, New: {$relativePath}. New rule will overwrite original.");
                            }
                            $this->componentValidationRulesCache[$cacheKey] = $ruleContent;
                            $this->componentRulePathCache[$cacheKey] = $filePath;
                            $loadedPaths[$cacheKey] = $filePath;
                            Log::channel($logChannel)->info("[ValidationConfigLoader] Successfully loaded and cached rule for '{$cacheKey}' from {$filePath}");
                        } else {
                            Log::channel($logChannel)->debug("[ValidationConfigLoader] No 'componentName' or suitable 'type' found in file: {$filePath}. Skipping.");
                        }
                    }
                } catch (Exception $e) {
                    Log::channel($logChannel)->error("[ValidationConfigLoader] Exception during file iteration in path {$path}: " . $e->getMessage());
                }
            } else {
                Log::channel($logChannel)->warning("[ValidationConfigLoader] Component rules directory not found: {$path}");
            }
        }

        Log::channel($logChannel)->debug("[ValidationConfigLoader] All loaded rule cache keys: " . implode(', ', array_keys($this->componentValidationRulesCache)));
        Log::channel($logChannel)->debug("[ValidationConfigLoader] Finished loading component rules. Total rules loaded: " . count($this->componentValidationRulesCache));
    }

    /**
     * Рекурсивно разворачивает все $ref в структуре (array/object).
     * @param array $structure - исходная структура
     * @param string $currentFilePath - путь к текущему файлу (для относительных $ref)
     * @param array $refStack - стек уже обработанных файлов для защиты от циклов
     * @return array - структура с развёрнутыми $ref
     */
    protected function resolveRefsRecursive(array $structure, string $currentFilePath, array $refStack = []): array
    {
        // Handle JSON Schema 'allOf' by merging subschemas
        if (isset($structure['allOf']) && is_array($structure['allOf'])) {
            $merged = [];
            foreach ($structure['allOf'] as $subSchema) {
                // Resolve $ref in subschema if present
                if (isset($subSchema['$ref']) && is_string($subSchema['$ref'])) {
                    $subSchema = $this->resolveRefsRecursive(['$ref' => $subSchema['$ref']], $currentFilePath, $refStack);
                }
                // If subschema defines 'properties', merge those, otherwise merge entire subschema
                if (isset($subSchema['properties']) && is_array($subSchema['properties'])) {
                    $merged = array_merge($merged, $subSchema['properties']);
                } else {
                    $merged = array_merge($merged, $subSchema);
                }
            }
            // Recursively resolve merged result and return
            return $this->resolveRefsRecursive($merged, $currentFilePath, $refStack);
        }
        foreach ($structure as $key => $value) {
            // Если встретили $ref на этом уровне
            if ($key === '$ref' && is_string($value)) {
                $refPath = $value;
                $baseDir = dirname($currentFilePath);
                $fullRefPath = realpath($baseDir . DIRECTORY_SEPARATOR . $refPath);
                if (!$fullRefPath || !file_exists($fullRefPath)) {
                    Log::warning('[resolveRefsRecursive] \$ref not found: ' . $refPath . ' (resolved as ' . $fullRefPath . ') from ' . $currentFilePath);
                    continue;
                }
                if (in_array($fullRefPath, $refStack)) {
                    Log::warning("[resolveRefsRecursive] Cyclic \$ref detected: {$fullRefPath}");
                    continue;
                }
                $refContent = json_decode(file_get_contents($fullRefPath), true);
                if (!is_array($refContent)) {
                    Log::warning('[resolveRefsRecursive] \$ref file is not valid JSON object: ' . $fullRefPath);
                    continue;
                }
                // Рекурсивно разворачиваем $ref внутри подключаемого файла
                $refContent = $this->resolveRefsRecursive($refContent, $fullRefPath, array_merge($refStack, [$fullRefPath]));
                // Объединяем: всё, что было в текущем объекте (кроме $ref), перекрывает $ref
                $merged = array_merge($refContent, array_diff_key($structure, ['$ref' => 1]));
                return $this->resolveRefsRecursive($merged, $currentFilePath, $refStack);
            }
            // Если вложенный массив/объект — рекурсивно обходим
            if (is_array($value)) {
                $structure[$key] = $this->resolveRefsRecursive($value, $currentFilePath, $refStack);
            }
        }
        return $structure;
    }

    /**
     * Finds the path to a component's validation JSON file across all levels.
     * NOTE: This method is primarily used by the legacy model check
     * (isComponentModelRequired) and might be deprecated if rules are fully adopted.
     * It doesn't need extensive logging itself, the caller logs search results.
     *
     * @param string $componentName
     * @return string|null The full path to the validation file, or null if not found.
     */
    protected function findComponentValidationFile(string $componentName): ?string
    {
        $validationBaseDir = base_path('install-modules/aiCore/validation/levels');
        for ($i = 0; $i <= 9; $i++) {
            $levelDir = sprintf('%02d', $i);
            $filePath = $validationBaseDir . DIRECTORY_SEPARATOR . $levelDir . DIRECTORY_SEPARATOR . 'components' . DIRECTORY_SEPARATOR . $componentName . '.json';
            if (File::exists($filePath)) {
                return $filePath;
            }
        }
        return null;
    }
}
