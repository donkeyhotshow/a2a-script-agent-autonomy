<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Finder\Finder;
use Throwable;

class ComponentRuleLoader
{
    private string $logChannel;
    private array $rulePaths = []; // Paths/patterns to search for rule files
    private array $rulesCache = []; // In-memory cache for loaded rules
    private array $ruleFilePathCache = []; // Cache for the path of found rules
    private array $suggestionsCache = []; // Cache for type suggestions
    private string $validationBaseDir; // Base directory for resolving $ref paths

    public function __construct(string $logChannel = 'stack', ?array $rulePaths = null)
    {
        $this->logChannel = $logChannel;
        $this->validationBaseDir = base_path('install-modules/aiCore/validation/'); // Set base for $ref

        $this->rulePaths = $rulePaths ?? [
            base_path('install-modules/aiCore/validation/components'),
        ];

        $this->loadAllRules();
        $this->loadSuggestions();
    }

    /**
     * Loads all component rules from the specified directories.
     * (This is similar to the logic previously in ValidationConfigLoader trait)
     */
    public function loadAllRules(): void
    {
        $this->rulesCache = [];
        $this->ruleFilePathCache = [];
        $loadedPaths = [];

        Log::channel($this->logChannel)->info("[Rule Loader] About to iterate rulePaths. Count: " . count($this->rulePaths) . ". Paths: " . json_encode($this->rulePaths));

        foreach ($this->rulePaths as $path) {
            Log::channel($this->logChannel)->info("[Rule Loader] Iterating rulePaths. Current path: {$path}. Is directory? " . (File::isDirectory($path) ? 'Yes' : 'No'));
            if (!File::isDirectory($path)) {
                Log::channel($this->logChannel)->warning("[Rule Loader] Validation rule directory not found or not a directory: {$path}");
                continue;
            }

            $finder = new Finder();
            $finder->files()->in($path)->name('*.json');
            Log::channel($this->logChannel)->info("[Rule Loader] Finder configured for path: {$path}. Expected file count (approx): " . (iterator_count(Finder::create()->files()->in($path)->name('*.json')) ?? 'N/A'));

            Log::channel($this->logChannel)->info("[Rule Loader] About to iterate files found by Finder in path: {$path}.");
            $fileIterationCount = 0;
            foreach ($finder as $file) {
                $fileIterationCount++;
                Log::channel($this->logChannel)->info("[Rule Loader - Finder Loop Start] Iteration: {$fileIterationCount}, File: " . $file->getRealPath());
                // DEBUG: Log every file being considered as a rule by Finder
                Log::channel($this->logChannel)->info("[Rule Loader - Finder] Attempting to process rule file: " . $file->getRealPath());

                $componentName = $file->getBasename('.json');
                $filePath = $file->getRealPath();
                try {
                    $content = $file->getContents();
                    $ruleData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);

                    if ($componentName === 'Button') {
                        Log::channel($this->logChannel)->info("[Rule Loader] For Button.json, PRE-CALL to resolveAndMergeRefs. FilePath: {$filePath}");
                        Log::channel($this->logChannel)->info("[Rule Loader] For Button.json, after json_decode, type of \$ruleData: " . gettype($ruleData) . ". Is array? " . (is_array($ruleData) ? 'Yes' : 'No'));
                        if (is_array($ruleData)) {
                            Log::channel($this->logChannel)->info("[Rule Loader] Button.json \$ruleData keys: " . implode(', ', array_keys($ruleData)));
                        }
                    }

                    // Resolve $refs before caching
                    $processingStack = []; // Initialize for each top-level rule file
                    $resolvedRuleData = $this->resolveAndMergeRefs($ruleData, $filePath, $processingStack);

                    // NEW: Merge common HTML props into props.nestedValidation.structure via common-props-validation-config.json
                    if (isset($resolvedRuleData['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
                        try {
                            $commonPropsPath = base_path('install-modules/aiCore/validation/common-props-validation-config.json');
                            $commonPropsJson = File::get($commonPropsPath);
                            $commonProps = json_decode($commonPropsJson, true, 512, JSON_THROW_ON_ERROR);
                            $propsStruct =& $resolvedRuleData['nestedValidation']['structure']['props']['nestedValidation']['structure'];
                            $propsStruct = array_replace_recursive($propsStruct, $commonProps);
                            Log::channel($this->logChannel)->info("[Rule Loader] Merged common-props into {$componentName} props.");
                        } catch (Throwable $e) {
                            Log::channel($this->logChannel)->error("[Rule Loader] Failed to merge common-props for {$componentName}: " . $e->getMessage());
                        }
                    }

                    $cacheKey = strtolower($componentName);

                    // DEBUG: Output resolved data for Accordion to test $ref merge
                    if ($componentName === 'Accordion') {
                        Log::channel($this->logChannel)->info("[DEBUG \$refPath] Accordion resolvedRuleData (merged with common): " . json_encode($resolvedRuleData));
                        echo "--- DEBUG Accordion Merged Rule ---\n";
                        print_r($resolvedRuleData);
                        echo "\n----------------------------------\n";
                        // exit; // COMMENTED OUT TO ALLOW FULL RULE LOADING
                    }

                    // DEBUG LOG: Show which file is currently defining rules for a cacheKey
                    Log::channel($this->logChannel)->info("[Rule Loader] Processing to cache: cacheKey='{$cacheKey}', originalComponentName='{$componentName}', filePath='{$filePath}'");

                    if (isset($this->rulesCache[$cacheKey])) {
                        Log::channel($this->logChannel)->warning("[Rule Loader] Duplicate rule definition for component '{$componentName}' (key '{$cacheKey}'). Overwriting rule from '{$loadedPaths[$cacheKey]}' with rule from '{$filePath}'. Check validation level priorities.");
                    }
                    $this->rulesCache[$cacheKey] = $resolvedRuleData;
                    $this->ruleFilePathCache[$cacheKey] = $filePath;
                    $loadedPaths[$cacheKey] = $filePath;

                } catch (Throwable $e) {
                    Log::channel($this->logChannel)->error("[Rule Loader] EXCEPTION CAUGHT for rule file '{$filePath}' (Component: '{$componentName}'). Message: " . $e->getMessage() . " Trace: " . $e->getTraceAsString());
                }
            }
            Log::channel($this->logChannel)->info("[Rule Loader] Finished iterating files for path: {$path}. Total iterations: {$fileIterationCount}.");
        }
        Log::channel($this->logChannel)->info("[Rule Loader] Loaded " . count($this->rulesCache) . " component validation rules (ComponentRuleLoader). Keys: " . implode(', ', array_keys($this->rulesCache)));
    }

    /**
     * Recursively resolves $ref directives in the rule data.
     *
     * @param mixed $data The current piece of rule data (array or other types).
     * @param string $currentRuleFilePath Path of the file being processed (for context in errors).
     * @param array $processingStack Tracks files being processed to prevent circular refs.
     * @return mixed Processed data with $refs resolved and merged.
     */
    private function resolveAndMergeRefs($data, string $currentRuleFilePath, array &$processingStack)
    {
        if (!is_array($data)) {
            return $data;
        }

        $currentFileDir = dirname($currentRuleFilePath);

        // Handle JSON Schema 'allOf' by merging subschemas
        if (isset($data['allOf']) && is_array($data['allOf'])) {
            $finalMergedProperties = [];
            $parentLevelKeys = []; // Keys that were siblings to 'allOf'

            // Add debug for all allOf processing for Select.json
            if (strpos($currentRuleFilePath, 'Select.json') !== false) {
                Log::channel($this->logChannel)->debug("[RMR DEBUG Select.json AllOf Processing] Found allOf in " . basename($currentRuleFilePath) . " at path level " . count($processingStack) . ". Parent Keys: " . implode(', ', array_keys($data)));
            }

            // Store sibling keys
            foreach ($data as $key => $value) {
                if ($key !== 'allOf') {
                    $parentLevelKeys[$key] = $value;
                }
            }

            // Process each subschema in allOf
            foreach ($data['allOf'] as $subSchema) {
                if (isset($subSchema['$ref'])) {
                    $refPath = $subSchema['$ref'];
                    $resolvedPath = realpath($currentFileDir . DIRECTORY_SEPARATOR . $refPath);
                    
                    if (!$resolvedPath || !File::exists($resolvedPath)) {
                        Log::channel($this->logChannel)->warning("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Referenced file not found: '{$refPath}'");
                        continue;
                    }

                    if (in_array($resolvedPath, $processingStack)) {
                        Log::channel($this->logChannel)->warning("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Circular reference detected for '{$refPath}'");
                        continue;
                    }

                    $processingStack[] = $resolvedPath;
                    try {
                        $content = File::get($resolvedPath);
                        $includedData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                        $resolvedIncludedData = $this->resolveAndMergeRefs($includedData, $resolvedPath, $processingStack);
                        $finalMergedProperties = array_replace_recursive($finalMergedProperties, $resolvedIncludedData);
                    } catch (Throwable $e) {
                        Log::channel($this->logChannel)->error("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Failed to load/parse/resolve referenced file '{$resolvedPath}': " . $e->getMessage());
                    } finally {
                        array_pop($processingStack);
                    }
                } else {
                    $finalMergedProperties = array_replace_recursive($finalMergedProperties, $subSchema);
                }
            }

            // Merge with parent level keys
            return array_replace_recursive($finalMergedProperties, $parentLevelKeys);
        }

        // Handle direct $ref
        if (isset($data['$ref'])) {
            $refPath = $data['$ref'];
            $resolvedPath = realpath($currentFileDir . DIRECTORY_SEPARATOR . $refPath);
            
            if (!$resolvedPath || !File::exists($resolvedPath)) {
                Log::channel($this->logChannel)->warning("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Referenced file not found: '{$refPath}'");
                return $data;
            }

            if (in_array($resolvedPath, $processingStack)) {
                Log::channel($this->logChannel)->warning("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Circular reference detected for '{$refPath}'");
                return $data;
            }

            $processingStack[] = $resolvedPath;
            try {
                $content = File::get($resolvedPath);
                $includedData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                $resolvedIncludedData = $this->resolveAndMergeRefs($includedData, $resolvedPath, $processingStack);
                array_pop($processingStack);
                return $resolvedIncludedData;
            } catch (Throwable $e) {
                Log::channel($this->logChannel)->error("[Rule Loader RMR \$ref error in {$currentRuleFilePath}] Failed to load/parse/resolve referenced file '{$resolvedPath}': " . $e->getMessage());
                array_pop($processingStack);
                return $data;
            }
        }

        // Process nested arrays
        foreach ($data as $key => &$value) {
            if (is_array($value)) {
                $value = $this->resolveAndMergeRefs($value, $currentRuleFilePath, $processingStack);
            }
        }

        return $data;
    }

    /**
     * Loads type suggestions from the suggestions.json file.
     */
    public function loadSuggestions(string $path = 'install-modules/aiCore/validation/suggestions.json'): void
    {
        $this->suggestionsCache = [];
        $fullPath = base_path($path);

        if (!File::exists($fullPath)) {
            Log::channel($this->logChannel)->warning("[Rule Loader] Suggestions file not found at {$fullPath}");
            return;
        }

        try {
            $content = File::get($fullPath);
            $suggestionsData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);

            if (isset($suggestionsData['type_suggestions']) && is_array($suggestionsData['type_suggestions'])) {
                foreach ($suggestionsData['type_suggestions'] as $typeKey => $suggestionDetails) {
                    $this->suggestionsCache[strtolower($typeKey)] = $suggestionDetails;
                }
            }
            Log::channel($this->logChannel)->info("[Rule Loader] Loaded " . count($this->suggestionsCache) . " type suggestions. Keys: " . implode(', ', array_keys($this->suggestionsCache)));

        } catch (Throwable $e) {
            Log::channel($this->logChannel)->error("[Rule Loader] Failed to load/parse suggestions file '{$fullPath}': " . $e->getMessage());
        }
    }

    /**
     * Gets the suggestion data for a specific component type.
     *
     * @param string $typeKey The original type for which a suggestion is sought (e.g., 'action').
     * @return array|null The suggestion array (containing 'suggest', 'docs_url') or null if not found.
     */
    public function getSuggestion(string $typeKey): ?array
    {
        $cacheKey = strtolower($typeKey);
        Log::channel($this->logChannel)->info("[ComponentRuleLoader] Attempting to getSuggestion for type '{$typeKey}' (cacheKey '{$cacheKey}'). Found: " . (isset($this->suggestionsCache[$cacheKey]) ? 'Yes' : 'No'));
        return $this->suggestionsCache[$cacheKey] ?? null;
    }

    /**
     * Gets the validation rule content for a specific component type.
     *
     * @param string $componentType The name of the component (e.g., 'Button').
     * @return array|null The decoded JSON rule array or null if not found.
     */
    public function getRule(string $componentType): ?array
    {
        $cacheKey = strtolower($componentType);
        Log::channel($this->logChannel)->info("[ComponentRuleLoader] Attempting to getRule for type '{$componentType}' (cacheKey '{$cacheKey}'). Found: " . (isset($this->rulesCache[$cacheKey]) ? 'Yes' : 'No'));
        return $this->rulesCache[$cacheKey] ?? null;
    }

    /**
     * Gets the file path for a specific component's rule.
     *
     * @param string $componentType The name of the component.
     * @return string|null The absolute path to the rule file or null if not found.
     */
    public function getRulePath(string $componentType): ?string
    {
        $cacheKey = strtolower($componentType); // Ensure lowercase lookup for path cache
        return $this->ruleFilePathCache[$cacheKey] ?? null;
    }

    /**
     * Loads master keys from a specified JSON file.
     * (This might also belong here or in a separate config loader)
     */
    public function loadMasterKeys(string $path = 'install-modules/aiCore/validation/master-known-keys.json'): array
    {
        $fullPath = base_path($path);
        if (!File::exists($fullPath)) {
            Log::channel($this->logChannel)->error("[Rule Loader] Master known keys file not found at {$fullPath}");
            return [];
        }
        try {
            $content = File::get($fullPath);
            return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            Log::channel($this->logChannel)->error("[Rule Loader] Failed to load/parse master known keys file '{$fullPath}': " . $e->getMessage());
            return [];
        }
    }
}
