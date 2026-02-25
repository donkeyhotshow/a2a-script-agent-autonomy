<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as File;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

trait ComponentValidation
{
    /**
     * Cache for component validation rules, populated by the main command.
     * @var array
     */
    protected array $componentValidationRulesCache = [];

    /**
     * Cache for component model requirements, populated by the main command.
     * @var array<string, bool>
     */
    protected array $componentModelRequirementCache = [];

    /**
     * Base path where component source files (.vue) are expected.
     * @var string
     */
    protected string $componentSourceBasePath;

    /**
     * Base path for the 'cleaning' directory, where components might temporarily reside.
     * @var string
     */
    protected string $componentCleaningBasePath;

    /**
     * Array to track which component files have already been checked to avoid redundant checks.
     * @var array<string, bool>
     */
    protected array $checkedComponentFiles = [];

    /**
     * Check if the required 'model' key exists based on component rules or legacy check.
     *
     * @param string $moduleName Name of the module being validated.
     * @param array $componentData The component's data array.
     * @param string $componentName Name of the component.
     * @param string $fileRelativePath Relative path of the JSON file.
     * @param string $jsonPath JSON path to the component.
     * @return void
     */
    protected function validateModelKeyPresence(string $moduleName, array $componentData, string $componentName, string $fileRelativePath, string $jsonPath): void
    {
        // This method now acts primarily as a fallback if new validation rules aren't defined.
        // The primary check is done within traverseAndValidate using $validationRules['requiresModel']
        // OR by the validateModelRequirement method if called.
        if ($this->isComponentModelRequired($componentName)) { // isComponentModelRequired uses legacy logic
            if (!isset($componentData['model'])) {
                // Dispatch an event instead of populating an array
                $this->dispatchEvent(new ErrorDetectedEvent(
                    $moduleName, // Use the passed moduleName
                    $fileRelativePath,
                    $jsonPath,
                    'legacy_missing_model_key', // Specific slug for legacy check
                    "Component '{$componentName}' requires a 'model' key (legacy check).",
                    ['component_name' => $componentName],
                    $componentName
                ));
            }
        }
    }

    /**
     * Checks if a component requires the top-level 'model' key based on its validation file (LEGACY CHECK).
     * Results are cached.
     * NOTE: This relies on the old level/dependency check. The new preferred way is the 'requiresModel'
     * key within the component's 'validation' rules.
     *
     * @param string $componentName
     * @return bool True if the model key is required, false otherwise.
     */
    protected function isComponentModelRequired(string $componentName): bool
    {
        // Use the dedicated log channel defined in the command class
        $logChannel = $this->logChannelName ?? 'stack'; // Fallback to stack if not defined

        if (isset($this->componentModelRequirementCache[$componentName])) {
            return $this->componentModelRequirementCache[$componentName];
        }

        $validationFilePath = $this->findComponentValidationFile($componentName);

        if (!$validationFilePath) {
            $this->componentModelRequirementCache[$componentName] = false;
            return false;
        }

        try {
            $content = File::get($validationFilePath);
            $validationData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($validationData)) {
                throw new Exception("Validation data is not an array.");
            }

            // Check criteria: Level >= 1 OR 'VModel.vue' in dependencies
            $level = $validationData['level'] ?? 0;
            $dependencies = $validationData['dependencies'] ?? [];
            $requiresModel = false;

            // DEBUG: Log the level being checked for the component
            // $this->info(sprintf("      [DEBUG] Checking model requirement for '%s': Found level '%s' in rules.", $componentName, $level));

            if (is_numeric($level) && $level >= 1) {
                $requiresModel = true;
            } elseif (is_array($dependencies)) {
                foreach ($dependencies as $dep) {
                    if (is_string($dep) && str_contains($dep, 'VModel.vue')) {
                        $requiresModel = true;
                        break;
                    }
                }
            }

            $this->componentModelRequirementCache[$componentName] = $requiresModel;
            return $requiresModel;

        } catch (Throwable $e) {
            // Log error using the dedicated channel
            Log::channel($logChannel)->error("Failed to read or parse validation file for '{$componentName}' ({$validationFilePath}): " . $e->getMessage());

            // Also output to console for immediate feedback during command run
            if (method_exists($this, 'error')) {
                $this->error("Failed to read or parse validation file for '{$componentName}' ({$validationFilePath}): " . $e->getMessage());
            }

            $this->componentModelRequirementCache[$componentName] = false;
            return false;
        }
    }

    /**
     * Validate component file existence, skipping known HTML/custom types.
     *
     * @param string $moduleName Name of the module being validated.
     * @param string $componentName
     * @param string $fileRelativePath
     * @param string $jsonPath
     * @return void
     */
    protected function validateComponentFile(string $moduleName, string $componentName, string $fileRelativePath, string $jsonPath): void
    {
        // Use the dedicated log channel defined in the command class
        $logChannel = $this->logChannelName ?? 'stack'; // Fallback to stack if not defined

        Log::channel($logChannel)->debug("[Component Check] Validating component: {$componentName}");

        if (isset($this->checkedComponentFiles[$componentName])) {
            Log::channel($logChannel)->debug("[Component Check] Skipping '{$componentName}' (already checked)");
            return; // Skip if already checked
        }

        // Define operational/layout types that don't correspond to .vue files
        $operationalOrLayoutTypes = [
            /* 'OPERATION', */
            'PAGE', 'GRID', 'PROGRAM', 'SECTION', 'PATHBREADCRUMB',
            'TABS', 'YES_NO', 'CHECKBOX_LIST',
            // Add any other custom non-component types here, ensure UPPERCASE
            'GUEST', 'QUEST', 'ADMIN', 'EXTERNAL', 'HEADING' // Existing custom types
        ];

        // Define generic HTML tags often rendered without specific components (e.g., by @Tag.vue)
        // Ensure UPPERCASE. Exclude tags that have dedicated PrimeVue components (Button, InputText etc.)
        $genericHtmlTags = [
            // 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            // 'P', 'SPAN', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'MAIN',
            // 'A', // Anchor tags are usually basic
            // 'UL', 'OL', 'LI',
            // 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD',
            // 'IMG', 'VIDEO', 'AUDIO',
            // Basic formatting tags
            // 'STRONG', 'EM', 'B', 'I', 'U', 'S', 'CODE', 'PRE', 'BLOCKQUOTE',
            // 'BR', 'HR'
            // 'BUTTON', 'FORM', 'LABEL', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION' are EXCLUDED as they usually have components
        ];

        // Check if the componentName is one of the types to skip (case-insensitive)
        $upperComponentName = strtoupper($componentName);
        if (in_array($upperComponentName, $operationalOrLayoutTypes) || in_array($upperComponentName, $genericHtmlTags)) {
            Log::channel($logChannel)->debug("[Component Check] Skipping '{$componentName}' (operational or generic HTML tag)");
            $this->checkedComponentFiles[$componentName] = true; // Mark as checked and skipped
            return;
        }

        // --- Recursive Search Logic ---
        $found = false;
        $searchBasePath = base_path($this->componentSourceBasePath);
        $componentFileName = $componentName . '.vue';
        $checkedSearchPath = Str::replaceFirst(base_path() . DIRECTORY_SEPARATOR, '', $searchBasePath);

        Log::channel($logChannel)->debug("[Component Check] Recursively searching for '{$componentFileName}' within: {$checkedSearchPath}");

        try {
            if (File::isDirectory($searchBasePath)) {
                $allFiles = File::allFiles($searchBasePath);
                foreach ($allFiles as $fileInfo) {
                    // Check if the file name matches the component name
                    if ($fileInfo->getFilename() === $componentFileName) {
                        $foundPath = $fileInfo->getPathname();
                        Log::channel($logChannel)->debug("[Component Check] Found '{$componentName}' at: {$foundPath}");
                        $found = true;
                        break; // Stop searching once found
                    }
                }
            } else {
                Log::channel($logChannel)->warning("[Component Check] Configured componentSourceBasePath is not a directory: {$searchBasePath}");
            }
        } catch (Exception $e) {
            Log::channel($logChannel)->error("[Component Check] Error searching directory '{$searchBasePath}': " . $e->getMessage());
            // Optionally add an error to $componentFileErrors here?
        }
        // --- End Recursive Search Logic ---

        if (!$found) {
            // Log that the component was not found after recursive search
            Log::channel($logChannel)->warning("[Component Check] Component '{$componentName}' not found after recursive search in '{$checkedSearchPath}'");

            // Check in the cleaning directory first
            $cleanedPath = base_path($this->componentCleaningBasePath . '/' . $componentName . '.vue');
            if (File::exists($cleanedPath)) {
                // Dispatch event for cleaned component file
                $this->dispatchEvent(new ErrorDetectedEvent(
                    $moduleName,
                    $fileRelativePath,
                    $jsonPath,
                    'component_file_cleaned',
                    "Component '{$componentName}' found in cleaning directory, not in source.",
                    [
                        'component_name' => $componentName,
                        'found_path' => Str::replaceFirst(base_path() . DIRECTORY_SEPARATOR, '', $cleanedPath)
                    ],
                    $componentName
                ));
                $this->checkedComponentFiles[$componentName] = false; // Mark as checked (but failed this specific check)
            } else {
                // Check for custom suggestion *before* generating generic missing file error
                $suggestions = [];
                if(method_exists($this->ruleLoader, 'findSimilarComponentNames')) {
                     $suggestions = $this->ruleLoader->findSimilarComponentNames($componentName);
                }

                // Dispatch event for missing component file
                $this->dispatchEvent(new ErrorDetectedEvent(
                    $moduleName,
                    $fileRelativePath,
                    $jsonPath,
                    'component_file_missing',
                    "Component file '{$componentName}.vue' not found in source or cleaning directory.",
                    [
                        'component_name' => $componentName,
                        'searched_path' => $checkedSearchPath,
                        'suggested_names' => $suggestions
                    ],
                    $componentName
                ));
                $this->checkedComponentFiles[$componentName] = false; // Mark as checked (but failed)
            }
        } else {
            $this->checkedComponentFiles[$componentName] = true; // Mark as checked and found
        }
    }

    /**
     * Validate component properties based on component-specific rules.
     *
     * @param array $propsData The actual props object from the JSON being validated.
     * @param array $propRules The validation rules for props from the component's definition.
     * @param array &$errors Array to populate with validation errors.
     * @param string $componentName Name of the component.
     * @param string $fileRelativePath Relative path of the JSON file.
     * @param string $jsonPath JSON path to the component itself (not the props object).
     * @return void
     */
    protected function validateComponentProps(array $propsData, array $propRules, array &$errors, string $componentName, string $fileRelativePath, string $jsonPath): void
    {
        $definedProps = array_keys($propRules);
        $usedProps = array_keys($propsData);

        // Check for unknown props
        $unknownProps = array_diff($usedProps, $definedProps);
        foreach ($unknownProps as $propName) {
            $errors[] = [
                'type' => 'component_prop_unknown',
                'component' => $componentName,
                'prop' => $propName,
                'file' => $fileRelativePath,
                'path' => $jsonPath . '.props.' . $propName // Point to the specific unknown prop
            ];
        }

        // Check defined props for type and other constraints
        foreach ($propRules as $propName => $rule) {
            $propPath = $jsonPath . '.props.' . $propName;

            // Check if required prop is missing
            if (isset($rule['required']) && $rule['required'] === true && !array_key_exists($propName, $propsData)) {
                $errors[] = [
                    'type' => 'component_prop_required',
                    'component' => $componentName,
                    'prop' => $propName,
                    'file' => $fileRelativePath,
                    'path' => $jsonPath . '.props' // Path to the props object, as the key is missing
                ];
                continue; // Skip other checks for this missing required prop
            }

            // If prop exists, check its type, pattern, allowed values
            if (array_key_exists($propName, $propsData)) {
                $propValue = $propsData[$propName];
                $expectedType = $rule['type'] ?? 'any';
                $actualType = gettype($propValue);

                // Type Check
                if ($expectedType !== 'any') {
                    $isValidType = false;
                    $expectedTypes = array_map('trim', explode('|', $expectedType));

                    foreach ($expectedTypes as $eType) {
                        switch (strtolower($eType)) {
                            case 'string':
                                $isValidType = is_string($propValue);
                                break;
                            case 'number':
                                $isValidType = is_int($propValue) || is_float($propValue);
                                break;
                            case 'integer':
                                $isValidType = is_int($propValue);
                                break;
                            case 'boolean':
                                $isValidType = is_bool($propValue);
                                break;
                            case 'array':
                                $isValidType = is_array($propValue) && (empty($propValue) || array_keys($propValue) === range(0, count($propValue) - 1));
                                break; // Check for sequential array
                            case 'object':
                                $isValidType = is_array($propValue) && (!empty($propValue) && array_keys($propValue) !== range(0, count($propValue) - 1));
                                break; // Associative array
                            case 'null':
                                $isValidType = is_null($propValue);
                                break;
                            default:
                                $isValidType = false;
                                break;
                        }
                        if ($isValidType) break;
                    }

                    if (!$isValidType) {
                        $errors[] = [
                            'type' => 'component_prop_type_mismatch',
                            'component' => $componentName,
                            'prop' => $propName,
                            'expected_type' => $expectedType,
                            'actual_value' => $propValue,
                            'file' => $fileRelativePath,
                            'path' => $propPath
                        ];
                        continue; // Skip pattern/value checks if type is wrong
                    }
                }

                // Check allowedValues
                if (isset($rule['allowedValues']) && is_array($rule['allowedValues'])) {
                    if (!in_array($propValue, $rule['allowedValues'], true)) {
                        $errors[] = [
                            'type' => 'component_prop_value_disallowed',
                            'component' => $componentName,
                            'prop' => $propName,
                            'allowed_values' => $rule['allowedValues'],
                            'actual_value' => $propValue,
                            'file' => $fileRelativePath,
                            'path' => $propPath
                        ];
                    }
                }

// Check pattern for string types
if (isset($rule['pattern']) && is_string($rule['pattern']) && is_string($propValue)) {
    $pattern = trim($rule['pattern']);
    $isInvalidPattern = false;
    if ($pattern !== '' && !preg_match('/^[*+?{|]/', $pattern)) {
        $fullPattern = '/^' . $pattern . '$/';
        set_error_handler(function($errno, $errstr) use (&$isInvalidPattern) {
            $isInvalidPattern = true;
        });
        @preg_match($fullPattern, '');
        restore_error_handler();
        if (!$isInvalidPattern) {
            if (preg_match($fullPattern, $propValue) !== 1) {
                $errors[] = [
                    'type' => 'component_prop_pattern_mismatch',
                    'component' => $componentName,
                    'prop' => $propName,
                    'pattern' => $rule['pattern'],
                    'actual_value' => $propValue,
                    'file' => $fileRelativePath,
                    'path' => $propPath
                ];
            }
        } else {
            $errors[] = [
                'type' => 'invalid_pattern_rule',
                'component' => $componentName,
                'prop' => $propName,
                'pattern' => $rule['pattern'],
                'file' => $fileRelativePath,
                'path' => $propPath,
                'message' => 'Invalid regex pattern for validation rule'
            ];
        }
    } else {
        $errors[] = [
            'type' => 'invalid_pattern_rule',
            'component' => $componentName,
            'prop' => $propName,
            'pattern' => $rule['pattern'],
            'file' => $fileRelativePath,
            'path' => $propPath,
            'message' => 'Empty or unsafe pattern for validation rule'
        ];
    }
}
            }
        }
    }

    /**
     * Validate component children types based on component-specific rules.
     *
     * @param array $childrenData The actual children array from the JSON being validated.
     * @param array $allowedTypes The array of allowed child type strings from the rules.
     * @param array &$errors Array to populate with validation errors.
     * @param string $componentName Name of the parent component.
     * @param string $fileRelativePath Relative path of the JSON file.
     * @param string $jsonPath JSON path to the parent component.
     * @return void
     */
    protected function validateComponentChildren(array $childrenData, array $allowedTypes, array &$errors, string $componentName, string $fileRelativePath, string $jsonPath): void
    {
        if (empty($allowedTypes)) {
            return; // No restrictions defined
        }

        foreach ($childrenData as $index => $child) {
            $childPath = $jsonPath . '.children[' . $index . ']';

            if (is_array($child) && isset($child['type'])) {
                $childType = $child['type'];
                if (!in_array($childType, $allowedTypes)) {
                    $errors[] = [
                        'type' => 'component_child_type_disallowed',
                        'component' => $componentName,
                        'child_type' => $childType,
                        'allowed_types' => $allowedTypes,
                        'file' => $fileRelativePath,
                        'path' => $childPath
                    ];
                }
            } elseif (is_string($child)) {
                // Check if plain strings are allowed as children
                if (!in_array('string', $allowedTypes)) {
                    $errors[] = [
                        'type' => 'component_child_type_disallowed',
                        'component' => $componentName,
                        'child_type' => 'string', // Represent plain string child
                        'allowed_types' => $allowedTypes,
                        'file' => $fileRelativePath,
                        'path' => $childPath
                    ];
                }
            } else {
                // Handle other child types (numbers, nulls?) if necessary, or report as error?
            }
        }
    }

    // Method removed due to collision with ValidationConfigLoader::findComponentValidationFile
    /*
    protected function findComponentValidationFile(string $componentName): ?string
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $baseConfigPath = base_path($this->configBasePath . '/validation/levels');
        Log::channel($logChannel)->debug("[Validation File Search] Searching for validation rules for component '{$componentName}' starting from: {$baseConfigPath}");
        try {
            if (!File::isDirectory($baseConfigPath)) {
                Log::channel($logChannel)->warning("[Validation File Search] Validation levels directory not found: {$baseConfigPath}");
                return null;
            }
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($baseConfigPath, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $item) {
                if ($item->isFile() && $item->getFilename() === $componentName . '.json') {
                    $foundPath = $item->getPathname();
                    Log::channel($logChannel)->debug("[Validation File Search] Found validation file for '{$componentName}' at: {$foundPath}");
                    return $foundPath;
                }
            }
        } catch (\Exception $e) {
             Log::channel($logChannel)->error("[Validation File Search] Error searching for validation file for '{$componentName}' in '{$baseConfigPath}': " . $e->getMessage());
        }
        Log::channel($logChannel)->debug("[Validation File Search] No validation file found for '{$componentName}' in '{$baseConfigPath}' or subdirectories.");
        return null;
    }
    */

    /**
     * Validates if a component requires a top-level 'model' key based on its rules.
     *
     * @param string $componentType The name of the component.
     * @param array $data The data node of the component being validated.
     * @param string $moduleName The name of the module.
     * @param string $filePath The path to the JSON file.
     * @param string $jsonPath The JSON path to the component node.
     * @return void
     */
    protected function validateModelRequirement(
        string $componentType,
        array  $data,
        string $moduleName,
        string $filePath,
        string $jsonPath
    ): void
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $requiresModel = $this->componentModelRequirementCache[$componentType] ?? false;
        $componentLevel = $this->componentValidationRulesCache[$componentType]['level'] ?? 0;

        // Only enforce model requirement for level >= 1
        if ($componentLevel >= 1 && $requiresModel && !isset($data['model'])) {
            Log::channel($logChannel)->warning("[Model Check] Component '{$componentType}' (Level >= 1) requires a 'model' key, but it's missing.", [
                'module' => $moduleName,
                'file' => $filePath,
                'path' => $jsonPath
            ]);
            $this->logError(
                $moduleName,
                $filePath,
                'component_requires_model',
                "Component '{$componentType}' (Level >= 1) requires a top-level 'model' key.",
                $jsonPath,
                ['component' => $componentType]
            );
        }
    }

    // Helper method to resolve module name - to be added if not existing in the command that uses this trait
    // For now, assuming it exists or will be implemented in the command class.
    // private function resolveModuleNameFromFilePath(string $filePath): string 
    // {
    //     // Basic implementation: find 'install-modules/aiInstaller/' and take the next segment
    //     $parts = explode('/', str_replace('\\', '/', $filePath));
    //     $installerDirKey = array_search('aiInstaller', $parts);
    //     if ($installerDirKey !== false && isset($parts[$installerDirKey + 1])) {
    //         return $parts[$installerDirKey + 1];
    //     }
    //     return 'unknown_module'; 
    // }

}
