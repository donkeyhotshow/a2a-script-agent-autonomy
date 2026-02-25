<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as CustomFile;
use App\Hooks\FileFacade as File;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use JsonException;
use Symfony\Component\Finder\Finder;
use Throwable;
use App\Console\Commands\Helpers\ModuleValidate\ModuleValidationLogHelper;

/**
 * @property array $componentValidationRulesCache Cache for component validation rules, keyed by component name.
 * @property string $logChannelName The log channel name.
 * @property array $validationSuggestions Holds the loaded validation suggestions.
 */
trait ModuleJsonProcessor
{

    private $standardHtmlAttributes = [
        'id',
    ];

    /**
     * Recursively find all JSON files in a directory and validate their nodes.
     *
     * @param string $modulePath Absolute path to the module directory.
     * @param ModuleValidationLogHelper $logHelper The logger instance.
     * @return void False on critical failure preventing further processing for this module.
     */
    protected function validateModuleNodesAndGetKeys(string $modulePath, ModuleValidationLogHelper $logHelper): void
    {
        $logHelper->logDebug('[ModuleJsonProcessor][validateModuleNodesAndGetKeys] Start.');
        $finder = new Finder();

        $finder->in($modulePath)
            ->files()
            ->name('*.json')
            ->notPath('*/actions/*')
            ->ignoreDotFiles(true)
            ->ignoreVCS(true)
            ->exclude('data')
            ->exclude('programs')
            ->exclude('docs');
        $_iPath = $modulePath . DIRECTORY_SEPARATOR . '_i';
        if (is_dir($_iPath)) {
            $finder->notPath('_i/common.json');
            $finder->notPath('_i/links.json');
            $finder->exclude('_i');
        }

        $hasFiles = false;

        foreach ($finder as $file) {
            $hasFiles = true;
            $filePath = $file->getRealPath();
            $fileRelativePath = Str::replaceFirst(base_path() . DIRECTORY_SEPARATOR, '', $filePath);

            $pathSegments = explode(DIRECTORY_SEPARATOR, $fileRelativePath);
            $skipFile = false;
            foreach ($pathSegments as $segment) {
                if (strtolower($segment) === 'data' || strtolower($segment) === 'programs') {
                    $skipFile = true;
                    break;
                }
            }

            if ($skipFile) {
                $logHelper->logInfo("[Validator] Skipping data/programs file: {$fileRelativePath}");
                continue;
            }
            $logHelper->logInfo("[Validator] Processing file: {$fileRelativePath}");

            $content = null; // Initialize content
            try {
                // Use FileFacade to get content. Assumes FileFacade handles comment filtering for JSONs.
                $content = CustomFile::get($filePath);

                if (trim($content) === '') {
                    $logHelper->logDebug("[Processor] Skipping empty file: {$fileRelativePath}");
                    continue;
                }

                // Manual comment stripping (preg_replace lines) removed.

                $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                // Redundant check for $data === null && json_last_error() removed due to JSON_THROW_ON_ERROR.

                if (!is_array($data) && !is_object($data)) {
                    $logHelper->logWarning("[Processor] Content of {$fileRelativePath} is not a JSON object or array. Skipping.");
                    $this->dispatchValidationEvent(
                        [
                            'module' => basename(dirname($modulePath)),
                            'file' => $fileRelativePath,
                            'error_type' => 'invalid_json_root_type',
                            'path' => 'file_root',
                            'actual_type' => gettype($data)
                        ]
                    );
                    continue;
                }
            } catch (JsonException $e) { // Catch errors specifically from json_decode
                $this->dispatchValidationEvent(
                    [
                        'module' => basename(dirname($modulePath)),
                        'file' => $fileRelativePath,
                        'error_type' => 'syntax_error', // Keeping original error type for JSON parsing issues
                        'path' => 'file_root',
                        'raw_content_snippet' => $content !== null ? Str::limit($content, 200) : 'Content could not be read or was empty.',
                        'component' => 'file',
                        'message' => $e->getMessage()
                    ]
                );
                $logHelper->logError("[Processor] Syntax error in file {$fileRelativePath}: " . $e->getMessage());
                continue;
            } catch (Throwable $e) { // Catch errors from CustomFile::get() or other unexpected issues
                $this->dispatchValidationEvent(
                    [
                        'module' => basename(dirname($modulePath)),
                        'file' => $fileRelativePath,
                        'error_type' => 'file_read_error', // Specific error type for file reading failures
                        'path' => 'file_root',
                        'component' => 'file',
                        'message' => $e->getMessage()
                    ]
                );
                $logHelper->logError("[Processor] Error reading file {$fileRelativePath}: " . $e->getMessage());
                continue;
            }

            $moduleName = basename(dirname($modulePath));

            $this->traverseAndValidate($moduleName, $fileRelativePath, $data, 'root_node', [], $modulePath, $logHelper, 'root');
        }

        if (!$hasFiles) {
            if (method_exists($this, 'comment')) {
                $this->comment("No JSON files found in module path: {$modulePath}");
            }
            $logHelper->logInfo("[Processor] No JSON files found in module path: {$modulePath}");
        }
    }

    /**
     * Recursively traverses and validates a JSON node based on component rules.
     * This is the main validation entry point for each node encountered.
     *
     * @param string $moduleName Name of the module being validated.
     * @param string $filePath Relative path of the JSON file.
     * @param mixed $data Current data node being validated (usually an array).
     * @param string $expectedType If validating a child/slot, the expected type/component name.
     * @param array $parentRules Validation rules from the parent context (e.g., rules for children/slots).
     * @param string $moduleVersionRootPath Absolute path to module version root.
     * @param ModuleValidationLogHelper $logHelper The logger instance.
     * @param string $nodePath JSON path to the current node.
     */
    private function traverseAndValidate(
        string $moduleName,
        string $filePath,
        mixed  $data,
        string $expectedType,
        array  $parentRules,
        string $moduleVersionRootPath,
        ModuleValidationLogHelper $logHelper,
        string $nodePath = 'root'
    ): void
    {
        // Remove unnecessary logging channel setup - will be handled by listeners

        if (!is_array($data)) {
            return;
        }

        if ($nodePath === 'root' && Arr::isList($data)) {
            // Process array roots without excessive logging
            foreach ($data as $index => $item) {
                $elementPath = $nodePath . '[' . $index . ']';
                $this->traverseAndValidate($moduleName, $filePath, $item, 'root_node', [], $moduleVersionRootPath, $logHelper, $elementPath);
            }
            return;
        }

        // Support directive objects without 'type' using 'operation' key
        if (!isset($data['type']) && isset($data['operation']) && is_string($data['operation'])) {
            // Treat as operation component
            $data['type'] = 'operation';
            // Map 'operation' property to 'action' expected by the rule
            if (!isset($data['action'])) {
                $data['action'] = $data['operation'];
            }
            unset($data['operation']);
        }
        $componentType = $data['type'] ?? null;
        if (is_string($componentType)) {
            $componentType = strtolower($componentType);
        }

        if (!is_string($componentType) || empty($componentType)) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'missing_or_invalid_type',
                'path' => $nodePath,
                'component' => 'unknown',
                'key' => 'type'
            ]);
            foreach ($data as $key => $value) {
                $childPath = $nodePath . '.' . $key;
                if (is_array($value) || is_object($value)) {
                    $this->traverseAndValidate($moduleName, $filePath, $value, 'unknown', $parentRules, $moduleVersionRootPath, $logHelper, $childPath);
                }
            }
            return;
        }

        $componentRules = $this->getComponentRules($componentType, $logHelper);
        $componentRuleFilePath = $this->getComponentRulePath($componentType);

        if (!$componentRules) {
            // Remove excessive logging
            $this->handleUnknownComponentType($moduleName, $filePath, $componentType, $nodePath);
            return;
        }

        $componentRuleStructure = $componentRules['nestedValidation']['structure'] ?? [];

        // Remove debug logging for Button component

        if (empty($componentRuleStructure)) {
            // Skip validation without verbose logging
            return;
        }

        $allowedTopLevelKeys = array_keys($componentRuleStructure);
        $propsDefinition = $componentRuleStructure['props'] ?? null;
        $definedPropsStructure = $propsDefinition['nestedValidation']['structure'] ?? null;
        $definedPropKeys = $definedPropsStructure ? array_keys($definedPropsStructure) : [];
        foreach ($data as $key => $value) {
            $currentPath = $nodePath . '.' . $key;

            if ($key === 'type') {
                continue;
            }

            $isAllowedTopLevel = in_array($key, $allowedTopLevelKeys);
            $isSpecialPrefix = Str::startsWith($key, ['@', ':', 'v-', '#']);
            $isStandardAttribute = in_array(strtolower($key), $this->standardHtmlAttributes) || Str::startsWith(strtolower($key), 'data-') || Str::startsWith(strtolower($key), 'aria-');


            if ($isAllowedTopLevel) {
                if ($key === 'props') {
                    $propsRuleDefinition = $componentRuleStructure['props'] ?? null;
                    if (!is_array($value)) {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'invalid_props_type',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'props',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    } elseif (!$definedPropsStructure && $propsRuleDefinition && ($propsRuleDefinition['type'] ?? 'object') === 'object' && !empty($value)) {
                        $this->validatePropsObject($moduleName, $filePath, $value, $componentType, $definedPropsStructure ?: [], $moduleVersionRootPath, $currentPath, $propsRuleDefinition, $logHelper);
                    } else {
                        $this->validatePropsObject($moduleName, $filePath, $value, $componentType, $definedPropsStructure ?: [], $moduleVersionRootPath, $currentPath, $propsRuleDefinition, $logHelper);
                    }
                } elseif ($key === 'children') {
                    $childrenRule = $componentRuleStructure['children'] ?? null;
                    if ($childrenRule) {
                        $this->validateChildren($moduleName, $filePath, $value, $componentType, $childrenRule, $moduleVersionRootPath, $logHelper, $currentPath);
                    } else {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'children_definition_missing',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'children',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    }
                } elseif ($key === 'model') {
                    $modelRule = $componentRuleStructure['model'] ?? null;
                    if ($modelRule) {
                        // Remove debug logging
                        $this->runNestedValidation($value, $modelRule, $moduleName, $filePath, $componentType, $moduleVersionRootPath, $logHelper, $currentPath);
                    } else {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'model_definition_missing',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'model',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    }
                } elseif ($key === 'slots') {
                    $slotsRule = $componentRuleStructure['slots'] ?? null;
                    if ($slotsRule) {
                        // Remove debug logging
                        $this->validateSlots($moduleName, $filePath, $value, $componentType, $slotsRule, $moduleVersionRootPath, $logHelper, $currentPath);
                    } else {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'slots_definition_missing',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'slots',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    }
                } elseif ($key === 'instructions') {
                    // Treat nested 'instructions' arrays like 'children' for recursive validation
                    $instructionsRule = $componentRuleStructure['instructions'] ?? null;
                    if ($instructionsRule) {
                        // Remove debug logging
                        $this->validateChildren($moduleName, $filePath, $value, $componentType, $instructionsRule, $moduleVersionRootPath, $logHelper, $currentPath);
                    } else {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'instructions_definition_missing',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'instructions',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    }
                } else {
                    $genericRule = $componentRuleStructure[$key] ?? null;
                    if ($genericRule) {
                        $isValueComplexStructure = isset($genericRule['nestedValidation']['structure']) ||
                            (isset($genericRule['type']) && $genericRule['type'] === 'array' && isset($genericRule['nestedValidation']));

                        if ($isValueComplexStructure) {
                            // Remove debug logging
                            $this->runNestedValidation($value, $genericRule, $moduleName, $filePath, $componentType, $moduleVersionRootPath, $logHelper, $currentPath);
                        } else {
                            // Remove debug logging
                            $this->validateValue($moduleName, $filePath, $value, $genericRule, $componentType, $currentPath, $moduleVersionRootPath, $logHelper);
                        }
                    } else {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => 'generic_top_level_definition_missing',
                            'path' => $currentPath,
                            'component' => $componentType,
                            'key' => 'key',
                            'rule_path' => $this->getComponentRulePath($componentType)
                        ]);
                    }
                }
            } elseif (!$isSpecialPrefix && !$isStandardAttribute) {
                // Record error without verbose output and suggestion processing
                if ($definedPropsStructure && in_array($key, $definedPropKeys, true)) {
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'unknown_key_at_component_level',
                        'path' => $currentPath,
                        'component' => $componentType,
                        'key' => $key,
                        'rule_path' => $this->getComponentRulePath($componentType)
                    ]);
                } else {
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'unknown_key_at_component_level',
                        'path' => $currentPath,
                        'component' => $componentType,
                        'key' => $key,
                        'rule_path' => $this->getComponentRulePath($componentType)
                    ]);
                }
            }
        }

        if ($definedPropsStructure) {
            $presentKeys = array_keys($data);
            $propsObject = $data['props'] ?? [];
            if (is_array($propsObject)) {
                $presentKeys = array_unique(array_merge($presentKeys, array_keys($propsObject)));
            }

            foreach ($definedPropsStructure as $propKey => $propRule) {
                $isRequired = $propRule['required'] ?? false;
                if ($isRequired === true && !in_array($propKey, $presentKeys)) {
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'missing_required_prop',
                        'path' => $nodePath,
                        'component' => $componentType,
                        'key' => $propKey,
                        'missing_key' => $propKey,
                        'rule_path' => $this->getComponentRulePath($componentType)
                    ]);
                }
            }
        }

        foreach ($componentRuleStructure as $topKey => $topRule) {
            if (($topRule['required'] ?? false) === true && !isset($data[$topKey])) {
                $eventData = [
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'missing_required_key',
                    'path' => $nodePath,
                    'component' => $componentType,
                    'key' => $topKey,
                    'missing_key' => $topKey,
                    'rule_path' => $this->getComponentRulePath($componentType)
                ];
                
                // Temporary debug log using the passed $logHelper
                $logHelper->logDebug('[ModuleJsonProcessor] DISPATCHING ERROR: Missing required key for component: ' . $componentType . ' at path: ' . $nodePath . ' | Missing key: ' . $topKey, $eventData);
                
                $this->dispatchValidationEvent($eventData);
            }
        }
    }

    private function getComponentRules(string $componentType, ModuleValidationLogHelper $logHelper): ?array
    {
        $cacheKey = strtolower($componentType);

        if (method_exists($this, 'loaderGetComponentRules')) {
            $rules = $this->loaderGetComponentRules($componentType);
            if ($rules) {
                // Flatten all $ref and allOf in the rule definitions before use
                $rulePath = $this->getComponentRulePath($componentType) ?? '';
                $rules = $this->resolveRefsRecursive($rules, $rulePath);
                // Update cache with flattened rules
                $this->componentValidationRulesCache[$cacheKey] = $rules;
                $logHelper->logDebug(
                    '[ModuleJsonProcessor][getComponentRules] Flattened refs in rules for ' . $componentType . PHP_EOL .
                    '    (cacheKey ' . $cacheKey . ')'
                );
                return $rules;
            }
        } else {
            $logHelper->logWarning('[ModuleJsonProcessor][getComponentRules] loaderGetComponentRules method does not exist on $this.');
        }

        $logHelper->logDebug(
            '[ModuleJsonProcessor][getComponentRules] Rules NOT FOUND for ' . $componentType . PHP_EOL .
            '    (cacheKey ' . $cacheKey . ') by loaderGetComponentRules or method missing.' . PHP_EOL .
            '    Final check in local cache: ' . (isset($this->componentValidationRulesCache[$cacheKey]) ? 'Exists' : 'Does NOT Exist')
        );

        return $this->componentValidationRulesCache[$cacheKey] ?? null;
    }

    private function getComponentRulePath(string $componentType): ?string
    {
        if (empty($this->componentValidationRulesCache) && method_exists($this, 'loadAllComponentRules')) {
        }
        return $this->loaderGetComponentRulePath($componentType);
    }

    private function handleUnknownComponentType(string $moduleName, string $filePath, string $componentType, string $nodePath): void
    {
        $cachedRulePath = $this->loaderGetComponentRulePath($componentType);
        
        $errorContext = [
            'module' => $moduleName,
            'file' => $filePath,
            'error_type' => 'unknown_component_type',
            'path' => $nodePath,
            'component' => $componentType,
            'rule_path' => $cachedRulePath
        ];
        
        $this->dispatchValidationEvent($errorContext);
    }

    /**
     * Validates the structure and values within a 'props' object.
     */
    private function validatePropsObject(string $moduleName, string $filePath, array $propsData, string $componentType, array $propsStructure, string $moduleVersionRootPath, string $propsPath, ?array $propsRuleDefinition, ModuleValidationLogHelper $logHelper): void
    {
        $definedPropKeys = array_keys($propsStructure);

        // Special handling for Select component to check for properties that should be in model instead of props
        $isSelectComponent = strtolower($componentType) === 'select';
        $selectModelProps = ['options', 'optionLabel', 'optionValue']; // Properties that should be in model for Select

        foreach ($propsData as $propKey => $propValue) {
            $currentPropPath = $propsPath . '.' . $propKey;
            if (!in_array($propKey, $definedPropKeys)) {
                // Special handling for Select component - check if the property should be in model
                if ($isSelectComponent && in_array($propKey, $selectModelProps)) {
                    $modelPath = str_replace('.props', '.model', $propsPath);
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'prop_in_wrong_location',
                        'path' => $currentPropPath,
                        'component' => $componentType,
                        'key' => $propKey,
                        'correct_location' => 'model',
                        'model_path' => $modelPath
                    ]);
                    continue;
                }

                // Check if prop might belong in another location based on known patterns
                $potentialLocation = $this->detectPotentialPropLocation($propKey, $componentType);
                if ($potentialLocation) {
                    $suggestedPath = str_replace('.props', ".{$potentialLocation}", $propsPath);
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'prop_likely_misplaced',
                        'path' => $currentPropPath,
                        'component' => $componentType,
                        'key' => $propKey,
                        'potential_location' => $potentialLocation,
                        'suggested_path' => $suggestedPath
                    ]);
                    continue;
                }

                // Skip standard attributes and Vue directives
                if (
                    Str::startsWith($propKey, ['v-', '@', ':', '#']) ||
                    in_array(strtolower($propKey), $this->standardHtmlAttributes) ||
                    Str::startsWith(strtolower($propKey), 'data-') ||
                    Str::startsWith(strtolower($propKey), 'aria-')
                ) {
                    continue;
                }

                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'unknown_prop',
                    'path' => $currentPropPath,
                    'component' => $componentType,
                    'key' => $propKey,
                    'rule_path' => $this->getComponentRulePath($componentType),
                    'available_props' => $definedPropKeys,
                    'suggested_props' => $this->findSimilarProps($propKey, $definedPropKeys)
                ]);
            } else {
                $propRule = $propsStructure[$propKey];
                $this->runNestedValidation($propValue, $propRule, $moduleName, $filePath, $componentType, $moduleVersionRootPath, $logHelper, $currentPropPath);
            }
        }
    }

    /**
     * Attempts to find similar property names to suggest for typo correction
     * 
     * @param string $propKey The unknown property key
     * @param array $definedPropKeys List of valid property keys
     * @return array List of similar property keys that might be what the user intended
     */
    private function findSimilarProps(string $propKey, array $definedPropKeys): array
    {
        if (empty($definedPropKeys)) {
            return [];
        }
        
        $similarProps = [];
        $lowercaseKey = strtolower($propKey);
        
        // Check for simple case differences (e.g., 'optionlabel' vs 'optionLabel')
        foreach ($definedPropKeys as $definedKey) {
            if (strtolower($definedKey) === $lowercaseKey) {
                $similarProps[] = $definedKey;
            }
        }
        
        // If no exact case-insensitive match, look for similar keys
        if (empty($similarProps)) {
            foreach ($definedPropKeys as $definedKey) {
                // Simple similarity heuristic - Levenshtein distance less than 3
                if (levenshtein($lowercaseKey, strtolower($definedKey)) < 3) {
                    $similarProps[] = $definedKey;
                }
            }
        }
        
        return $similarProps;
    }

    /**
     * Attempts to detect if a property likely belongs in a different location
     * based on naming patterns and known component structures
     * 
     * @param string $propKey The property key to analyze
     * @param string $componentType The component type
     * @return string|null The potential correct location, or null if no match
     */
    private function detectPotentialPropLocation(string $propKey, string $componentType): ?string
    {
        // Common patterns that suggest properties belong in different sections
        $patterns = [
            'model' => [
                // Data-related properties likely belong in model
                'options', 'optionLabel', 'optionValue', 'items', 'dataKey', 'values',
                'source', 'data', 'records', 'dataset', 'collection', 'fields'
            ],
            'slots' => [
                // UI template-related properties likely belong in slots
                'template', 'itemTemplate', 'headerTemplate', 'footerTemplate', 'contentTemplate',
                'placeholder', 'icon', 'iconPosition', 'header', 'footer'
            ],
            'children' => [
                // Child elements or container items likely belong in children
                'content', 'elements', 'rows', 'columns', 'actions', 'items'
            ]
        ];
        
        // Check if property key matches any pattern
        foreach ($patterns as $location => $keywords) {
            foreach ($keywords as $keyword) {
                // Exact match or contains the keyword
                if ($propKey === $keyword || stripos($propKey, $keyword) !== false) {
                    return $location;
                }
            }
        }
        
        // Component-specific rules
        switch (strtolower($componentType)) {
            case 'datatable':
            case 'table':
                if (in_array($propKey, ['value', 'columns', 'rows', 'paginator'])) {
                    return 'model';
                }
                break;
            case 'select':
            case 'dropdown':
                if (in_array($propKey, ['options', 'optionLabel', 'optionValue'])) {
                    return 'model';
                }
                break;
        }
        
        return null;
    }

    /**
     * Central function to handle validation of a nested node (child or slot content).
     * Determines if the node is a primitive, a component, or needs recursive validation.
     */
    private function runNestedValidation(
        mixed  $nestedData,
        array  $nestedRules,
        string $moduleName,
        string $filePath,
        string $parentComponentType,
        string $moduleVersionRootPath,
        ModuleValidationLogHelper $logHelper,
        string $currentPath
    ): void
    {
        $allowAnyObject = $nestedRules['_allowAnyObject'] ?? false;
        $allowString = $nestedRules['_allowString'] ?? false;
        $allowNumber = $nestedRules['_allowNumber'] ?? false;
        $allowBoolean = $nestedRules['_allowBoolean'] ?? false;
        $allowNull = $nestedRules['_allowNull'] ?? false;
        $blockAll = $nestedRules['_blockAll'] ?? false;
        $allowedTypes = $nestedRules['allowedTypes'] ?? [];

        $actualType = gettype($nestedData);

        if ($blockAll) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'content_blocked',
                'path' => $currentPath,
                'component' => $parentComponentType,
                'key' => $currentPath
            ]);
            return;
        }

        if (is_array($nestedData) && !empty($nestedRules['type']) && $nestedRules['type'] === 'array' && isset($nestedRules['nestedValidation']['itemStructure'])) {
            $itemRule = $nestedRules['nestedValidation']['itemStructure'];
            foreach ($nestedData as $index => $item) {
                $itemPath = $currentPath . '[' . $index . ']';
                $this->runNestedValidation($item, $itemRule, $moduleName, $filePath, $parentComponentType, $moduleVersionRootPath, $logHelper, $itemPath);
            }
            return;
        }

        if (is_array($nestedData) && isset($nestedData['type'])) {
            $componentTypeFromData = $nestedData['type'];
            $componentTypeForCheck = strtolower($componentTypeFromData);

            $allowedTypesLower = array_map('strtolower', $allowedTypes);

            $isAllowed = empty($allowedTypes) || in_array($componentTypeForCheck, $allowedTypesLower);

            if (!$isAllowed && !$allowAnyObject) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'component_child_type_disallowed',
                    'path' => $currentPath,
                    'component' => $parentComponentType,
                    'key' => $currentPath,
                    'rule_path' => $this->getComponentRulePath($parentComponentType)
                ]);
            } else {
                $this->traverseAndValidate(
                    $moduleName,
                    $filePath,
                    $nestedData,
                    $componentTypeFromData,
                    [],
                    $moduleVersionRootPath,
                    $logHelper,
                    $currentPath
                );
            }
            return;
        }

        // FIRST_EDIT: If rule defines nestedValidation.structure, use that as the schema for this object
        $actualRuleStructure = null;
        if (isset($nestedRules['nestedValidation']['structure']) && is_array($nestedRules['nestedValidation']['structure'])) {
            $actualRuleStructure = $nestedRules['nestedValidation']['structure'];
        } else {
            // Fallback: allow nestedRules with single 'structure' key
            if (is_array($nestedRules) && isset($nestedRules['structure']) && count($nestedRules) === 1 && is_array($nestedRules['structure'])) {
                $actualRuleStructure = $nestedRules['structure'];
            }
            // SECOND_EDIT: treat nestedRules themselves as structure mapping if it's a map of rule definitions
            elseif (is_array($nestedRules) && !isset($nestedRules['type']) && !isset($nestedRules['nestedValidation']) && !isset($nestedRules['structure'])) {
                $firstVal = reset($nestedRules);
                if (is_array($firstVal) && (isset($firstVal['type']) || isset($firstVal['nestedValidation']))) {
                    $actualRuleStructure = $nestedRules;
                }
            }
        }

        if ($actualRuleStructure && is_array($nestedData) && !Arr::isList($nestedData)) {
            $allowedKeysInRule = array_keys($actualRuleStructure);

            foreach ($nestedData as $dataKey => $dataValue) {
                if (!in_array($dataKey, $allowedKeysInRule)) {
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'unknown_key_in_nested_object',
                        'path' => $currentPath . '.' . $dataKey,
                        'component' => $parentComponentType,
                        'key' => $dataKey,
                        'rule_path' => $this->getComponentRulePath($parentComponentType) // Pass rule path for context
                    ]);
                } else {
                    $this->runNestedValidation($dataValue, $actualRuleStructure[$dataKey], $moduleName, $filePath, $parentComponentType, $moduleVersionRootPath, $logHelper, $currentPath . '.' . $dataKey);
                }
            }

            foreach ($actualRuleStructure as $ruleKey => $ruleDefinition) {
                if (is_array($ruleDefinition) && ($ruleDefinition['required'] ?? false) === true && !array_key_exists($ruleKey, $nestedData)) {
                    $this->dispatchValidationEvent([
                        'module' => $moduleName,
                        'file' => $filePath,
                        'error_type' => 'missing_required_key_in_nested_object',
                        'path' => $currentPath,
                        'component' => $parentComponentType,
                        'key' => $ruleKey,
                        'rule_path' => $this->getComponentRulePath($parentComponentType) // Pass rule path for context
                    ]);
                }
            }
            return;
        }

        if (isset($nestedRules['type'])) {
            $this->validateValue($moduleName, $filePath, $nestedData, $nestedRules, $parentComponentType, $currentPath, $moduleVersionRootPath, $logHelper);
            return;
        }

        $isAllowedPrimitiveOrGeneric = false;
        if ($actualType === 'string' && $allowString) $isAllowedPrimitiveOrGeneric = true;
        elseif (($actualType === 'integer' || $actualType === 'double') && $allowNumber) $isAllowedPrimitiveOrGeneric = true;
        elseif ($actualType === 'boolean' && $allowBoolean) $isAllowedPrimitiveOrGeneric = true;
        elseif ($actualType === 'NULL' && $allowNull) $isAllowedPrimitiveOrGeneric = true;
        elseif (($actualType === 'array' || $actualType === 'object') && $allowAnyObject) $isAllowedPrimitiveOrGeneric = true;

        if (!$isAllowedPrimitiveOrGeneric) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'invalid_child_type',
                'path' => $currentPath,
                'component' => $parentComponentType,
                'key' => $currentPath,
                'actual_type' => $actualType,
                'allowed_types' => $allowedTypes
            ]);
        }
    }

    private function validateValue(string $moduleName, string $filePath, mixed $value, array $rule, string $componentType, string $valuePath, string $moduleVersionRootPath, ModuleValidationLogHelper $logHelper): void
    {
        $expectedTypeFromRule = $rule['type'] ?? 'any'; 
        $isStrictObject = ($rule['_strictObjectType'] ?? false) === true;

        // Reject empty strings and empty arrays as invalid values
        if (is_string($value) && $value === '') {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'empty_string_not_allowed',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType)
            ]);
            return;
        }
        
        if (is_array($value) && count($value) === 0) {
            // Allow empty arrays for 'any' type (e.g., 'value' fields)
            $ruleType = $rule['type'] ?? null;
            $isAnyType = is_string($ruleType)
                ? $ruleType === 'any'
                : (is_array($ruleType) && in_array('any', $ruleType, true));
            if (!$isAnyType) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'empty_array_not_allowed',
                    'path' => $valuePath,
                    'component' => $componentType,
                    'key' => $valuePath,
                    'rule_path' => $this->getComponentRulePath($componentType)
                ]);
                return;
            }
        }
         
        $expectedTypeStringForValidation = 'any';
        if (is_array($expectedTypeFromRule)) {
            $expectedTypeStringForValidation = implode('|', $expectedTypeFromRule);
        } elseif (is_string($expectedTypeFromRule)) {
            $expectedTypeStringForValidation = $expectedTypeFromRule;
        }

        if ($expectedTypeStringForValidation === 'any') {
             return; 
         }

        $isValid = $this->validateValueType($value, $expectedTypeStringForValidation, $isStrictObject);

         if (!$isValid) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'invalid_prop_type',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType),
                'expected_type' => $expectedTypeStringForValidation, // Use the processed string
                'actual_type' => gettype($value)
            ]);
            return;
        }

        // If the value is an array and it was a valid type, check for item validation rules
        $canBeArray = false;
        if (is_array($rule['type'])) { // Check original rule['type']
            $canBeArray = in_array('array', $rule['type']);
        } elseif (is_string($rule['type'])) { // Check original rule['type']
            $types = explode('|', $rule['type']);
            foreach ($types as $t) {
                if (trim($t) === 'array') {
                    $canBeArray = true;
                    break;
                }
            }
        }

        if (is_array($value) && $canBeArray && isset($rule['nestedValidation']['itemStructure'])) {
            // Enforce minimum items for arrays
            if (isset($rule['minItems']) && count($value) < $rule['minItems']) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'array_too_few_items',
                    'path' => $valuePath,
                    'component' => $componentType, 
                    'key' => $valuePath,
                    'rule_path' => $this->getComponentRulePath($componentType),
                    'minItems' => $rule['minItems'] ?? 0,
                    'actual_count' => count($value)
                ]);
                return;
            }
            
            $itemRule = $rule['nestedValidation']['itemStructure'];
            foreach ($value as $index => $item) {
                $itemPath = $valuePath . '[' . $index . ']';
                $this->runNestedValidation($item, $itemRule, $moduleName, $filePath, $componentType, $moduleVersionRootPath, $logHelper, $itemPath);
            }
            // After validating items, no further scalar checks (pattern, options, etc.) apply to the array itself.
            return; 
        }

        if (isset($rule['options']) && is_array($rule['options'])) {
            if (!in_array($value, $rule['options'], true)) { 
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'invalid_prop_option',
                    'path' => $valuePath,
                    'component' => $componentType, 
                    'key' => $valuePath,
                    'rule_path' => $this->getComponentRulePath($componentType),
                    'actual_value' => $value,
                    'options' => $rule['options'] ?? []
                ]);
                return;
            }
        }

        if (isset($rule['pattern']) && is_string($value)) {
            $pattern = $rule['pattern'];
            
            if (!preg_match('/^([\\/#~%]).*\\1[imsxeADSUXJu]*$/', $pattern)) {
                $pattern = '/' . str_replace('/', '\\\\/', $pattern) . '/';
            }
            
            if (!preg_match($pattern, $value)) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'invalid_prop_pattern',
                    'path' => $valuePath,
                    'component' => $componentType,
                    'key' => $valuePath,
                    'rule_path' => $this->getComponentRulePath($componentType),
                    'pattern' => $rule['pattern']
                ]);
                return;
            }
        }
        
        if (isset($rule['minLength']) && is_string($value) && mb_strlen($value) < $rule['minLength']) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'prop_too_short',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType),
                'min_length' => $rule['minLength'],
                'actual_length' => mb_strlen($value)
            ]);
            return;
        }
        
        if (isset($rule['maxLength']) && is_string($value) && mb_strlen($value) > $rule['maxLength']) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'prop_too_long',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType),
                'max_length' => $rule['maxLength'],
                'actual_length' => mb_strlen($value)
            ]);
            return;
        }
        
        if (isset($rule['min']) && is_numeric($value) && $value < $rule['min']) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'prop_too_small',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType),
                'min_value' => $rule['min'],
                'actual_value' => $value
            ]);
            return;
        }
        
        if (isset($rule['max']) && is_numeric($value) && $value > $rule['max']) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'prop_too_large',
                'path' => $valuePath,
                'component' => $componentType,
                'key' => $valuePath,
                'rule_path' => $this->getComponentRulePath($componentType),
                'max_value' => $rule['max'],
                'actual_value' => $value
            ]);
            return;
        }
    }

    protected function validateValueType(mixed $value, string $expectedTypeString, bool $isStrictObject = false): bool
    {
        $expectedTypes = explode('|', $expectedTypeString);

        $isArrayExpected = Str::endsWith($expectedTypeString, '[]');
        if ($isArrayExpected) {
            $baseType = Str::beforeLast($expectedTypeString, '[]');
            if (!is_array($value)) return false;

            foreach ($value as $item) {
                if (!$this->validateValueType($item, $baseType)) return false;
            }
            return true;
        }

        $actualType = gettype($value);

        foreach ($expectedTypes as $expectedType) {
            $expectedType = trim($expectedType);
            switch ($expectedType) {
                case 'string':
                    if ($actualType === 'string') return true;
                    break;
                case 'number':
                    if ($actualType === 'integer' || $actualType === 'double') return true;
                    break;
                case 'integer':
                    if ($actualType === 'integer') return true;
                    break;
                case 'boolean':
                    if ($actualType === 'boolean') return true;
                    break;
                case 'array':
                    if ($actualType === 'array') return true;
                    break;
                case 'object':
                    if ($isStrictObject) {
                        if ($actualType === 'object' || ($actualType === 'array' && !array_is_list($value))) {
                            return true;
                        }
                    } else {
                        if ($actualType === 'object' || $actualType === 'array') {
                            return true;
                        }
                    }
                    break;
                case 'null':
                    if ($actualType === 'NULL') return true;
                    break;
                case 'any':
                    return true;
                default:

                    break;
            }
        }
        return false;
    }

    /**
     * Validates children nodes based on the component's rules.
     */
    private function validateChildren(string $moduleName, string $filePath, mixed $childrenData, string $parentType, array $childrenRule, string $moduleVersionRootPath, ModuleValidationLogHelper $logHelper, string $childrenPath): void
    {
        $parentRuleFilePath = $this->getComponentRulePath($parentType);

        $expectedType = $childrenRule['type'] ?? 'any';
        $actualType = gettype($childrenData);

        if ($expectedType !== 'any' && $actualType !== $expectedType) {
            $allowString = $childrenRule['nestedValidation']['_allowString'] ?? false;
            if (!($expectedType === 'array' && $actualType === 'string' && $allowString)) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'invalid_children_type',
                    'path' => $childrenPath,
                    'component' => $parentType,
                    'key' => 'children',
                    'rule_path' => $parentRuleFilePath
                ]);
                return;
            }
        }

        if ($expectedType === 'array' && is_array($childrenData)) {
            // Use the defined itemStructure for nested validation of array elements
            $nestedValidationRules = $childrenRule['nestedValidation']['itemStructure'] ?? [];
            foreach ($childrenData as $index => $childNode) {
                $childPath = $childrenPath . '[' . $index . ']';

                // Support legacy {type: 'operation', action: ...} and new {operation: ...} formats
                if (is_array($childNode) && (
                        (isset($childNode['type']) && $childNode['type'] === 'operation' && isset($childNode['action'])) ||
                        isset($childNode['operation'])
                    )) {
                    // Determine action from either 'action' or 'operation' key
                    $action = isset($childNode['action']) ? $childNode['action'] : $childNode['operation'];
                    $sourcePathString = $childNode['source'] ?? null;

                    // Strip 'file!' prefix if present
                    if (is_string($sourcePathString) && Str::startsWith($sourcePathString, 'file!')) {
                        $sourcePathString = substr($sourcePathString, strlen('file!'));
                    }
                    // Normalize directory separators and ensure JSON extension
                    $aiInstallerPath = rtrim(base_path($this->mainConfig['aiInstallerPath'] ?? 'install-modules/aiInstaller'), '\\/');
                    $normalizedSource = str_replace('/', DIRECTORY_SEPARATOR, $sourcePathString);
                    $includeFilePath = null;

                    // Helper to ensure .json extension is correctly applied
                    $ensureJsonExtension = function (?string $path): ?string {
                        if ($path === null) {
                            return null;
                        }
                        if (strtolower(substr($path, -5)) !== '.json') {
                            return $path . '.json';
                        }
                        return $path;
                    };
                    
                    // First check if the source path is absolute
                    if ($sourcePathString !== null && (str_starts_with($normalizedSource, DIRECTORY_SEPARATOR) || preg_match('#^[a-zA-Z]:#', $normalizedSource))) {
                        $pathWithExtension = $ensureJsonExtension($normalizedSource);
                        $includeFilePath = $pathWithExtension && file_exists($pathWithExtension)
                            ? $pathWithExtension
                            : null;
                    }
                    // Or if it's a relative path within the module directory
                    else if ($sourcePathString !== null) {
                        // Try relative to the module directory
                        $pathWithExtension = $ensureJsonExtension($normalizedSource);
                        if ($pathWithExtension) {
                            $relativePath = rtrim($moduleVersionRootPath, '\\/') . DIRECTORY_SEPARATOR . $pathWithExtension;
                            $includeFilePath = file_exists($relativePath) ? $relativePath : null;
                        }

                        // Or try in the storage/actions directory (for action references)
                        if (!$includeFilePath && $pathWithExtension && str_contains($normalizedSource, 'actions' . DIRECTORY_SEPARATOR)) {
                            $actionPath = base_path('storage' . DIRECTORY_SEPARATOR . $pathWithExtension);
                            $includeFilePath = file_exists($actionPath) ? $actionPath : null;
                        }
                    }

                    $canonicalIncludeFilePath = $includeFilePath ? realpath($includeFilePath) : null;
                    $includeFileRelativePath = $canonicalIncludeFilePath ? Str::replaceFirst(base_path() . DIRECTORY_SEPARATOR, '', $canonicalIncludeFilePath) : null;
                    $existsFinal = $canonicalIncludeFilePath && File::exists($canonicalIncludeFilePath);

                    if (!$existsFinal) {
                        // Use $ensureJsonExtension for display in error message if $includeFileRelativePath is null
                        $displaySourcePath = $includeFileRelativePath ?: $ensureJsonExtension($sourcePathString);
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath,
                            'error_type' => $action . '_source_file_not_found',
                            'path' => $childrenPath . '[' . $index . ']', // More specific path
                            'component' => $parentType,
                            'key' => 'source_file_not_found', // More specific key
                            'source_file' => $displaySourcePath // Use display path
                        ]);
                        continue;
                    }

                    $fileContent = null; // Initialize fileContent
                    try {
                        $fileContent = CustomFile::get($canonicalIncludeFilePath);
                        // Assuming CustomFile::get() handles comment stripping for JSON files.
                        $fileData = json_decode($fileContent, true, 512, JSON_THROW_ON_ERROR);

                        $includedModuleRoot = $aiInstallerPath;
                        $relativePathFromInstaller = Str::replaceFirst($aiInstallerPath . DIRECTORY_SEPARATOR, '', $canonicalIncludeFilePath);
                        $pathParts = explode(DIRECTORY_SEPARATOR, $relativePathFromInstaller);
                        if (count($pathParts) > 1 && is_dir($aiInstallerPath . DIRECTORY_SEPARATOR . $pathParts[0])) {
                            $includedModuleRoot = $aiInstallerPath . DIRECTORY_SEPARATOR . $pathParts[0];
                        }

                        if ($action === 'include') {
                            if (!is_array($fileData) || Arr::isList($fileData) || !isset($fileData['type'])) {
                                $this->dispatchValidationEvent([
                                    'module' => $moduleName,
                                    'file' => $filePath,
                                    'error_type' => 'include_file_invalid_content',
                                    'path' => $childrenPath . '[' . $index . ']',
                                    'component' => $parentType,
                                    'key' => 'include_file_content',
                                    'source_file' => $includeFileRelativePath
                                ]);
                                continue;
                            }
                            $this->traverseAndValidate(
                                $moduleName,
                                $includeFileRelativePath, // Use the included file's path for its own validation context
                                $fileData,
                                'root_node', // Included content is treated as a new root
                                [],
                                $includedModuleRoot,
                                $logHelper,
                                $childrenPath . '[' . $index . ']' // Path within the parent structure
                            );
                        } elseif ($action === 'add') {
                            if (!is_array($fileData) || !Arr::isList($fileData)) {
                                $this->dispatchValidationEvent([
                                    'module' => $moduleName,
                                    'file' => $filePath,
                                    'error_type' => 'add_file_not_indexed_array',
                                    'path' => $childrenPath . '[' . $index . ']',
                                    'component' => $parentType,
                                    'key' => 'add_file_content',
                                    'source_file' => $includeFileRelativePath
                                ]);
                                continue;
                            }
                            foreach ($fileData as $itemIndex => $itemData) {
                                $itemPathForLog = $childrenPath . '[' . $index . '].source_content[' . $itemIndex . ']';
                                $this->runNestedValidation(
                                    $itemData, $nestedValidationRules, $moduleName,
                                    $includeFileRelativePath, // File being processed is the included one
                                    $parentType, $includedModuleRoot, $logHelper, $itemPathForLog
                                );
                            }
                        }
                    } catch (JsonException $e) {
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath, // Parent file, for context of where the include was specified
                            'error_type' => $action . '_json_decode_error',
                            'path' => $childrenPath . '[' . $index . ']', 
                            'component' => $parentType,
                            'key' => 'source_content_json_error',
                            'action' => $action,
                            'source_file' => $includeFileRelativePath,
                            'error_message' => $e->getMessage(),
                            'raw_content_snippet' => $fileContent !== null ? Str::limit($fileContent, 200) : 'Content could not be read or was empty.'
                        ]);
                    } catch (Throwable $e) { // Catches errors from CustomFile::get() or other non-JSON issues
                        $this->dispatchValidationEvent([
                            'module' => $moduleName,
                            'file' => $filePath, // Parent file
                            'error_type' => $action . '_file_read_error', 
                            'path' => $childrenPath . '[' . $index . ']', 
                            'component' => $parentType,
                            'key' => 'source_content_read_error',
                            'action' => $action,
                            'source_file' => $includeFileRelativePath,
                            'error_message' => $e->getMessage()
                        ]);
                    }
                } elseif (is_array($childNode)) {
                    $this->runNestedValidation(
                        $childNode,
                        $nestedValidationRules,
                        $moduleName,
                        $filePath,
                        $parentType,
                        $moduleVersionRootPath,
                        $logHelper,
                        $childrenPath
                    );
                }
            }
        } elseif (is_string($childrenData)) {
            $allowString = $childrenRule['nestedValidation']['_allowString'] ?? false;
            if (!$allowString) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'invalid_child_type',
                    'path' => $childrenPath,
                    'component' => $parentType,
                    'key' => 'children',
                    'actual_type' => 'string',
                    'allowed_types' => []
                ]);
            }
        }
    }

    /**
     * Validates slots based on the component's rules.
     */
    private function validateSlots(string $moduleName, string $filePath, mixed $slotsData, string $parentType, array $slotsRule, string $moduleVersionRootPath, ModuleValidationLogHelper $logHelper, string $slotsPath): void
    {
        $parentRuleFilePath = $this->getComponentRulePath($parentType);

        if (!is_array($slotsData)) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'invalid_slots_type',
                'path' => $slotsPath,
                'component' => $parentType,
                'key' => 'slots',
                'actual_type' => gettype($slotsData)
            ]);
            return;
        }

        $definedSlotsStructure = $slotsRule['nestedValidation']['structure'] ?? null;
        if (!$definedSlotsStructure) {
            $this->dispatchValidationEvent([
                'module' => $moduleName,
                'file' => $filePath,
                'error_type' => 'missing_slot_definition',
                'path' => $slotsPath,
                'component' => $parentType,
                'key' => 'slots',
                'rule_path' => $parentRuleFilePath
            ]);
            return;
        }
        $definedSlotNames = array_keys($definedSlotsStructure);

        foreach ($slotsData as $slotName => $slotContent) {
            $currentSlotPath = $slotsPath . '.' . $slotName;
            if (!in_array($slotName, $definedSlotNames)) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'unknown_slot_name',
                    'path' => $slotsPath,
                    'component' => $parentType,
                    'key' => $slotName,
                    'defined_slots' => $definedSlotNames
                ]);
                continue;
            }

            $slotValidationRules = $definedSlotsStructure[$slotName];
            $this->runNestedValidation(
                $slotContent,
                $slotValidationRules,
                $moduleName,
                $filePath,
                $parentType,
                $moduleVersionRootPath,
                $logHelper,
                $currentSlotPath
            );
        }

        foreach ($definedSlotsStructure as $slotName => $slotRule) {
            if (($slotRule['required'] ?? false) === true && !isset($slotsData[$slotName])) {
                $this->dispatchValidationEvent([
                    'module' => $moduleName,
                    'file' => $filePath,
                    'error_type' => 'missing_required_slot',
                    'path' => $slotsPath,
                    'component' => $parentType,
                    'key' => $slotName,
                    'rule_path' => $parentRuleFilePath
                ]);
            }
        }
    }

    /**
     * Generates a list of valid component types based on loaded rules and configuration.
     *
     * @param array $configKnownTypes Associative array containing 'operationalOrLayout' list from config.
     * @return array An array of unique, lowercased valid component type names.
     */
    protected function getValidComponentTypes(array $configKnownTypes, ModuleValidationLogHelper $logHelper): array
    {
        $validTypes = [];

        if (property_exists($this, 'componentValidationRulesCache') && is_array($this->componentValidationRulesCache)) {
            $ruleKeysLower = array_map('strtolower', array_keys($this->componentValidationRulesCache));
            $validTypes = array_merge($validTypes, $ruleKeysLower);
        } else {
            $logHelper->logWarning("[Processor][TypeGen] componentValidationRulesCache not found or not an array.");
        }

        $operationalOrLayoutTypes = $configKnownTypes['operationalOrLayout'] ?? [];
        if (!empty($operationalOrLayoutTypes)) {
            $validTypes = array_merge($validTypes, array_map('strtolower', $operationalOrLayoutTypes));
        }

        $validTypesUniqueLower = array_unique(array_map('strtolower', $validTypes));
        $logHelper->logDebug("[Processor] Generated Valid Component Types List (Total Unique): " . count($validTypesUniqueLower));
        return $validTypesUniqueLower;
    }

    private function dispatchValidationEvent(array $eventData): void
    {
        $commandInstance = $this; // 'this' is the command instance that uses the trait

        // Extract details from $eventData to construct the appropriate event
        $moduleName = $eventData['module'] ?? 'unknown_module';
        $filePath = $eventData['file'] ?? 'unknown_file';
        $jsonPath = $eventData['path'] ?? 'unknown_path';
        $errorSlug = $eventData['error_type'] ?? 'generic_error';
        $message = $eventData['message'] ?? ''; // Ensure message exists
        $componentType = $eventData['component'] ?? null;

        // Create a clean context array without the main fields to avoid duplication
        $context = array_diff_key($eventData, array_flip(['module', 'file', 'path', 'error_type', 'message', 'component']));

        // Debug output
        file_put_contents('c:/apps/admin-app/validator-debug.log', 
            "\nComponent type: " . gettype($componentType) . 
            "\nValue: " . (is_array($componentType) ? json_encode($componentType) : (string)$componentType) . 
            "\nContext: " . json_encode($context) . 
            "\nEventData: " . json_encode($eventData) . "\n", 
            FILE_APPEND);

        // Force componentType to be string or null
        if (!is_string($componentType) && !is_null($componentType)) {
            file_put_contents('c:/apps/admin-app/validator-debug.log', 
                "Converting componentType to null because it is: " . gettype($componentType) . "\n", 
                FILE_APPEND);
            $componentType = null;
        }

        // Ensure context is an array
        if (!is_array($context)) {
            $context = [];
        }

        // TODO: Differentiate SystemErrorDetectedEvent vs ErrorDetectedEvent if needed
        // For now, all are treated as ErrorDetectedEvent
        
        try {
            // Instantiate ErrorDetectedEvent: command holds moduleName property, so pass filePath as second param
            $eventToDispatch = new \App\Console\Commands\ErrorDetectedEvent(
                $commandInstance,
                $filePath,
                $jsonPath,
                $errorSlug,
                $message,
                $context,
                $componentType
            );

            $commandInstance->dispatchEvent($eventToDispatch);
        } catch (\Throwable $e) {
            file_put_contents('c:/apps/admin-app/validator-debug.log', 
                "Error creating ErrorDetectedEvent: " . $e->getMessage() . "\n" .
                "Stack trace: " . $e->getTraceAsString() . "\n", 
                FILE_APPEND);
            // Fallback - don't try to dispatch the event
        }
    }
}
