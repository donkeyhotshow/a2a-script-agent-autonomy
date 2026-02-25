<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use App\Console\Commands\NodeEncounteredEvent;
use App\Console\Commands\ValidateModuleJsonCommand;
use App\Console\Commands\Helpers\ModuleValidate\ComponentRuleLoader;

/**
 * Specialized listener for property validation
 */
class PropertyValidationListener
{
    protected ComponentRuleLoader $ruleLoader;
    protected string $logChannel;

    public function __construct(ComponentRuleLoader $ruleLoader, string $logChannel = 'stack')
    {
        $this->ruleLoader = $ruleLoader;
        $this->logChannel = $logChannel;
    }

    /**
     * Handle a node encountered event to validate properties
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    public function handle(NodeEncounteredEvent $event): void
    {
        Log::channel($this->logChannel)->debug('[PropertyValidationListener] Handling NodeEncounteredEvent for file: ' . $event->filePath . ' at path: ' . $event->jsonPath); // DEBUG LOG

        $command = $event->getCommand(); // Get command instance from the event

        // Only process nodes that have props and component rules
        if (!isset($event->nodeData['props']) || !is_array($event->nodeData['props']) || empty($event->componentRules)) {
            return;
        }
        
        $componentRules = $event->componentRules;
        $nodeData = $event->nodeData;
        $propsData = $nodeData['props'];
        $componentType = $nodeData['type'] ?? 'unknown';
        $moduleName = $event->moduleName;
        $filePath = $event->filePath;
        $jsonPath = $event->jsonPath;
        $propsPath = $jsonPath . '.props';
        
        // Get props structure from rules
        $propsStructure = $this->getPropsStructureFromRules($componentRules);
        if (empty($propsStructure)) {
            // No props structure defined in rules, skip validation
            return;
        }
        
        $definedPropKeys = array_keys($propsStructure);
        
        // Special handling for Select component
        $isSelectComponent = strtolower($componentType) === 'select';
        $selectModelProps = ['options', 'optionLabel', 'optionValue']; // Properties that should be in model for Select
        
        // Validate each property in the props object
        foreach ($propsData as $propKey => $propValue) {
            $currentPropPath = $propsPath . '.' . $propKey;
            
            // Skip Vue directives and standard HTML attributes
            if ($this->isVueDirectiveOrStandardAttribute($propKey)) {
                continue;
            }
            
            // Check if prop is defined in rules
            if (!in_array($propKey, $definedPropKeys)) {
                // Special handling for Select component model props
                if ($isSelectComponent && in_array($propKey, $selectModelProps)) {
                    $this->dispatchPropInWrongLocationError(
                        $command,
                        $moduleName,
                        $filePath,
                        $currentPropPath,
                        $componentType,
                        $propKey,
                        'model',
                        str_replace('.props', '.model', $propsPath)
                    );
                    continue;
                }
                
                // Check if prop might belong in another location
                $potentialLocation = $this->detectPotentialPropLocation($propKey, $componentType);
                if ($potentialLocation) {
                    $this->dispatchPropLikelyMisplacedError(
                        $command,
                        $moduleName,
                        $filePath,
                        $currentPropPath,
                        $componentType,
                        $propKey,
                        $potentialLocation,
                        str_replace('.props', ".{$potentialLocation}", $propsPath)
                    );
                    continue;
                }
                
                // Unknown prop
                $this->dispatchUnknownPropError(
                    $command,
                    $moduleName,
                    $filePath,
                    $currentPropPath,
                    $componentType,
                    $propKey,
                    $definedPropKeys
                );
            } else {
                // Prop is defined, validate its type and value
                $propRule = $propsStructure[$propKey];
                $this->validatePropValue($command, $moduleName, $filePath, $currentPropPath, $componentType, $propKey, $propValue, $propRule);
            }
        }
        
        // Check for missing required props
        foreach ($propsStructure as $propKey => $propRule) {
            $isRequired = $propRule['required'] ?? false;
            if ($isRequired && !array_key_exists($propKey, $propsData)) {
                $this->dispatchMissingRequiredPropError(
                    $moduleName,
                    $filePath,
                    $propsPath,
                    $componentType,
                    $propKey
                );
            }
        }
    }
    
    /**
     * Validate a property value against its rule
     *
     * @param \App\Console\Commands\ValidateModuleJsonCommand $command Command instance
     * @param string $moduleName Module name
     * @param string $filePath File path
     * @param string $propPath Property path
     * @param string $componentType Component type
     * @param string $propKey Property key
     * @param mixed $propValue Property value
     * @param array $propRule Property rule
     * @return void
     */
    protected function validatePropValue(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, $propValue, array $propRule): void
    {
        $expectedType = $propRule['type'] ?? 'any';
        
        // Validate empty strings and empty arrays
        if (is_string($propValue) && $propValue === '') {
            $this->dispatchEmptyStringError($moduleName, $filePath, $propPath, $componentType, $propKey);
            return;
        }
        
        if (is_array($propValue) && count($propValue) === 0) {
            // Allow empty arrays for 'any' type (e.g., 'value' fields)
            $isAnyType = is_string($expectedType)
                ? $expectedType === 'any'
                : (is_array($expectedType) && in_array('any', $expectedType, true));
                
            if (!$isAnyType) {
                $this->dispatchEmptyArrayError($moduleName, $filePath, $propPath, $componentType, $propKey);
                return;
            }
        }
        
        // Skip type validation for 'any' type
        if ($expectedType === 'any') {
            return;
        }
        
        // Validate type
        $isValid = $this->validateValueType($propValue, $expectedType);
        if (!$isValid) {
            $this->dispatchInvalidPropTypeError(
                $moduleName,
                $filePath,
                $propPath,
                $componentType,
                $propKey,
                $expectedType,
                gettype($propValue)
            );
            return;
        }
        
        // Validate array items if necessary
        if (is_array($propValue) && isset($propRule['nestedValidation']['itemStructure'])) {
            // Check minimum items
            if (isset($propRule['minItems']) && count($propValue) < $propRule['minItems']) {
                $this->dispatchArrayTooFewItemsError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propRule['minItems'],
                    count($propValue)
                );
            }
            
            // Validate each item in the array
            $itemRule = $propRule['nestedValidation']['itemStructure'];
            foreach ($propValue as $index => $item) {
                $itemPath = $propPath . '[' . $index . ']';
                // Recursively validate nested items (not implemented here)
            }
            return;
        }
        
        // Validate against enumeration options
        if (isset($propRule['options']) && is_array($propRule['options'])) {
            if (!in_array($propValue, $propRule['options'], true)) {
                $this->dispatchInvalidPropOptionError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propValue,
                    $propRule['options']
                );
            }
        }
        
        // Validate string against pattern
        if (isset($propRule['pattern']) && is_string($propValue)) {
            $pattern = $propRule['pattern'];
            
            if (!preg_match('/^([\\/#~%]).*\\1[imsxeADSUXJu]*$/', $pattern)) {
                $pattern = '/' . str_replace('/', '\\\\/', $pattern) . '/';
            }
            
            if (!preg_match($pattern, $propValue)) {
                $this->dispatchInvalidPropPatternError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $pattern
                );
            }
        }
        
        // Validate string length
        if (is_string($propValue)) {
            if (isset($propRule['minLength']) && mb_strlen($propValue) < $propRule['minLength']) {
                $this->dispatchPropTooShortError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propRule['minLength'],
                    mb_strlen($propValue)
                );
            }
            
            if (isset($propRule['maxLength']) && mb_strlen($propValue) > $propRule['maxLength']) {
                $this->dispatchPropTooLongError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propRule['maxLength'],
                    mb_strlen($propValue)
                );
            }
        }
        
        // Validate number range
        if (is_numeric($propValue)) {
            if (isset($propRule['min']) && $propValue < $propRule['min']) {
                $this->dispatchPropTooSmallError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propRule['min'],
                    $propValue
                );
            }
            
            if (isset($propRule['max']) && $propValue > $propRule['max']) {
                $this->dispatchPropTooLargeError(
                    $moduleName,
                    $filePath,
                    $propPath,
                    $componentType,
                    $propKey,
                    $propRule['max'],
                    $propValue
                );
            }
        }
    }
    
    /**
     * Check if a property key is a Vue directive or standard HTML attribute
     *
     * @param string $propKey Property key
     * @return bool
     */
    protected function isVueDirectiveOrStandardAttribute(string $propKey): bool
    {
        $standardHtmlAttributes = ['id', 'class', 'style'];
        
        return (
            \Illuminate\Support\Str::startsWith($propKey, ['v-', '@', ':', '#']) ||
            in_array(strtolower($propKey), $standardHtmlAttributes) ||
            \Illuminate\Support\Str::startsWith(strtolower($propKey), 'data-') ||
            \Illuminate\Support\Str::startsWith(strtolower($propKey), 'aria-')
        );
    }
    
    /**
     * Detect potential location for misplaced properties
     *
     * @param string $propKey Property key
     * @param string $componentType Component type
     * @return string|null Potential location or null
     */
    protected function detectPotentialPropLocation(string $propKey, string $componentType): ?string
    {
        // Common patterns that suggest properties belong in different sections
        $patterns = [
            'model' => [
                'options', 'optionLabel', 'optionValue', 'items', 'dataKey', 'values',
                'source', 'data', 'records', 'dataset', 'collection', 'fields'
            ],
            'slots' => [
                'template', 'itemTemplate', 'headerTemplate', 'footerTemplate', 'contentTemplate',
                'placeholder', 'icon', 'iconPosition', 'header', 'footer'
            ],
            'children' => [
                'content', 'elements', 'rows', 'columns', 'actions', 'items'
            ]
        ];
        
        // Check if property key matches any pattern
        foreach ($patterns as $location => $keywords) {
            foreach ($keywords as $keyword) {
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
     * Validate a value against an expected type
     *
     * @param mixed $value The value to validate
     * @param string|array $expectedType The expected type(s)
     * @param bool $isStrictObject Whether to use strict object validation
     * @return bool Whether the value matches the expected type
     */
    protected function validateValueType($value, $expectedType, bool $isStrictObject = false): bool
    {
        if (is_array($expectedType)) {
            foreach ($expectedType as $type) {
                if ($this->validateValueType($value, $type, $isStrictObject)) {
                    return true;
                }
            }
            return false;
        }
        
        // Handle pipe-delimited types
        if (is_string($expectedType) && strpos($expectedType, '|') !== false) {
            $types = explode('|', $expectedType);
            foreach ($types as $type) {
                if ($this->validateValueType($value, trim($type), $isStrictObject)) {
                    return true;
                }
            }
            return false;
        }
        
        // Handle array of specific type (e.g., string[])
        if (is_string($expectedType) && substr($expectedType, -2) === '[]') {
            if (!is_array($value)) {
                return false;
            }
            
            $itemType = substr($expectedType, 0, -2);
            foreach ($value as $item) {
                if (!$this->validateValueType($item, $itemType, $isStrictObject)) {
                    return false;
                }
            }
            return true;
        }
        
        $actualType = gettype($value);
        
        switch ($expectedType) {
            case 'string':
                return $actualType === 'string';
            case 'number':
                return $actualType === 'integer' || $actualType === 'double';
            case 'integer':
                return $actualType === 'integer';
            case 'boolean':
                return $actualType === 'boolean';
            case 'array':
                return $actualType === 'array';
            case 'object':
                if ($isStrictObject) {
                    return $actualType === 'object' || ($actualType === 'array' && !array_is_list($value));
                } else {
                    return $actualType === 'object' || $actualType === 'array';
                }
            case 'null':
                return $actualType === 'NULL';
            case 'any':
                return true;
            default:
                return false;
        }
    }
    
    /**
     * Extract props structure from component rules
     *
     * @param array $componentRules Component rules
     * @return array Props structure
     */
    protected function getPropsStructureFromRules(array $componentRules): array
    {
        if (isset($componentRules['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
            return $componentRules['nestedValidation']['structure']['props']['nestedValidation']['structure'];
        }
        
        if (isset($componentRules['props']['nestedValidation']['structure'])) {
            return $componentRules['props']['nestedValidation']['structure'];
        }
        
        return [];
    }
    
    // Error dispatch methods - these create and dispatch error events
    
    protected function dispatchUnknownPropError(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, array $availableProps): void
    {
        $similarProps = $this->findSimilarProps($propKey, $availableProps);
        $message = "Unknown property '{$propKey}' for component type '{$componentType}'.";
        if (!empty($similarProps)) {
            $message .= " Did you mean: " . implode(', ', $similarProps) . "?";
        }

        $context = [
            'component_type' => $componentType,
            'property_name' => $propKey,
            'available_props' => $availableProps,
            'similar_props' => $similarProps
        ];

        $command->dispatchEvent(new ErrorDetectedEvent(
            $command,
            $moduleName,
            $filePath,
            $propPath,
            'unknown_prop',
            $message,
            $context,
            $componentType
        ));
    }
    
    protected function dispatchPropInWrongLocationError(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, string $correctLocation, string $modelPath): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $command,
            $moduleName,
            $propPath,
            'prop_in_wrong_location',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'correct_location' => $correctLocation,
                'model_path' => $modelPath
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchPropLikelyMisplacedError(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, string $potentialLocation, string $suggestedPath): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $command,
            $moduleName,
            $propPath,
            'prop_likely_misplaced',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'potential_location' => $potentialLocation,
                'suggested_path' => $suggestedPath
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchMissingRequiredPropError(string $moduleName, string $filePath, string $propsPath, string $componentType, string $propKey): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propsPath,
            'missing_required_prop',
            '',
            [
                'key' => $propKey,
                'component' => $componentType
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchEmptyStringError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'empty_string_not_allowed',
            '',
            [
                'key' => $propKey,
                'component' => $componentType
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchEmptyArrayError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'empty_array_not_allowed',
            '',
            [
                'key' => $propKey,
                'component' => $componentType
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchInvalidPropTypeError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, $expectedType, string $actualType): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'invalid_prop_type',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'expected_type' => $expectedType,
                'actual_type' => $actualType
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchArrayTooFewItemsError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, int $minItems, int $actualCount): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'array_too_few_items',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'minItems' => $minItems,
                'actual_count' => $actualCount
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchInvalidPropOptionError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, $actualValue, array $options): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'invalid_prop_option',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'actual_value' => $actualValue,
                'options' => $options
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchInvalidPropPatternError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, string $pattern): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'invalid_prop_pattern',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'pattern' => $pattern
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchPropTooShortError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, int $minLength, int $actualLength): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'prop_too_short',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'min_length' => $minLength,
                'actual_length' => $actualLength
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchPropTooLongError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, int $maxLength, int $actualLength): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'prop_too_long',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'max_length' => $maxLength,
                'actual_length' => $actualLength
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchPropTooSmallError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, $minValue, $actualValue): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'prop_too_small',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'min_value' => $minValue,
                'actual_value' => $actualValue
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    protected function dispatchPropTooLargeError(string $moduleName, string $filePath, string $propPath, string $componentType, string $propKey, $maxValue, $actualValue): void
    {
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $propPath,
            'prop_too_large',
            '',
            [
                'key' => $propKey,
                'component' => $componentType,
                'max_value' => $maxValue,
                'actual_value' => $actualValue
            ],
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
    
    /**
     * Find similar property names for typo suggestions
     * 
     * @param string $propKey The unknown property key
     * @param array $definedPropKeys List of valid property keys
     * @return array List of similar property keys
     */
    protected function findSimilarProps(string $propKey, array $definedPropKeys): array
    {
        if (empty($definedPropKeys)) {
            return [];
        }
        
        $similarProps = [];
        $lowercaseKey = strtolower($propKey);
        
        // Check for case differences
        foreach ($definedPropKeys as $definedKey) {
            if (strtolower($definedKey) === $lowercaseKey) {
                $similarProps[] = $definedKey;
            }
        }
        
        // If no exact match, find similar keys
        if (empty($similarProps)) {
            foreach ($definedPropKeys as $definedKey) {
                // Simple similarity check - Levenshtein distance < 3
                if (levenshtein($lowercaseKey, strtolower($definedKey)) < 3) {
                    $similarProps[] = $definedKey;
                }
            }
        }
        
        return $similarProps;
    }
} 