<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use Illuminate\Support\Str;

/**
 * Specialized listener for validating model structure, relationships, and value references
 */
class ModelValidationListener
{
    /**
     * Handle a node encountered event to validate model structure
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    public function handle(NodeEncounteredEvent $event): void
    {
        // Skip if no component rules available
        if (empty($event->componentRules)) {
            return;
        }
        
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? 'unknown';
        
        // If no model property, nothing to validate
        if (!isset($nodeData['model'])) {
            return;
        }

        $this->validateModelStructure($event);
        $this->validateModelValueReferences($event);
        $this->validateFormFieldAssociations($event);
    }

    /**
     * Validate the model structure against component rules
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateModelStructure(NodeEncounteredEvent $event): void
    {
        $componentRules = $event->componentRules;
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? 'unknown';
        $modelData = $nodeData['model'] ?? null;
        
        if (!is_array($modelData)) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $event->jsonPath . '.model',
                'invalid_model_type',
                $componentType,
                [
                    'expected_type' => 'object',
                    'actual_type' => gettype($modelData)
                ]
            );
            return;
        }
        
        // Check if the component defines model structure validation
        $modelValidation = $componentRules['nestedValidation']['structure']['model'] ?? null;
        
        if (!$modelValidation || !isset($modelValidation['nestedValidation']['structure'])) {
            return;
        }
        
        $modelStructure = $modelValidation['nestedValidation']['structure'];
        $definedModelKeys = array_keys($modelStructure);
        
        // Check for unknown keys in the model
        foreach ($modelData as $key => $value) {
            if (!in_array($key, $definedModelKeys)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model.' . $key,
                    'unknown_key_in_model',
                    $componentType,
                    [
                        'key' => $key,
                        'allowed_keys' => $definedModelKeys
                    ]
                );
            }
        }
        
        // Check for missing required keys in the model
        foreach ($modelStructure as $key => $rule) {
            if (($rule['required'] ?? false) && !array_key_exists($key, $modelData)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model',
                    'missing_required_key_in_model',
                    $componentType,
                    [
                        'key' => $key
                    ]
                );
            }
        }
        
        // Check value types in the model
        foreach ($modelData as $key => $value) {
            if (in_array($key, $definedModelKeys) && isset($modelStructure[$key]['type'])) {
                $expectedType = $modelStructure[$key]['type'];
                $actualType = gettype($value);
                
                $isTypeMatch = $this->checkTypeMatch($value, $expectedType);
                
                if (!$isTypeMatch) {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.model.' . $key,
                        'invalid_model_value_type',
                        $componentType,
                        [
                            'key' => $key,
                            'expected_type' => $expectedType,
                            'actual_type' => $actualType,
                            'value' => is_scalar($value) ? $value : json_encode($value)
                        ]
                    );
                }
            }
        }
    }
    
    /**
     * Validate model value references in data-driven components
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateModelValueReferences(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? 'unknown';
        $modelData = $nodeData['model'] ?? null;
        
        // Only for certain component types that reference data
        $dataComponents = ['datatable', 'dropdown', 'select', 'autocomplete', 'chart'];
        
        if (!in_array(strtolower($componentType), $dataComponents) || !is_array($modelData)) {
            return;
        }
        
        // For data components, check value/key/display references
        if (isset($modelData['value']) && is_string($modelData['value'])) {
            $valueRef = $modelData['value'];
            
            // Check for common reference mistakes
            if (empty(trim($valueRef))) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model.value',
                    'empty_model_value_reference',
                    $componentType,
                    [
                        'component_type' => $componentType,
                        'message' => "Empty model value reference in {$componentType} component"
                    ]
                );
            } elseif (str_contains($valueRef, '{{') && str_contains($valueRef, '}}')) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model.value',
                    'template_syntax_in_model_value',
                    $componentType,
                    [
                        'value_ref' => $valueRef,
                        'message' => "Template syntax ({{ }}) should not be used in model.value, use direct variable names"
                    ]
                );
            }
        }
        
        // For data-bound components with options, validate key/display fields
        if (isset($modelData['options']) && in_array(strtolower($componentType), ['select', 'dropdown', 'autocomplete'])) {
            if (!isset($modelData['key']) || empty($modelData['key'])) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model',
                    'missing_key_field_for_options',
                    $componentType,
                    [
                        'message' => "Component with options must specify a model.key field to identify option values"
                    ]
                );
            }
            
            if (!isset($modelData['display']) || empty($modelData['display'])) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model',
                    'missing_display_field_for_options',
                    $componentType,
                    [
                        'message' => "Component with options should specify a model.display field for user-friendly labels"
                    ]
                );
            }
        }
    }
    
    /**
     * Validate form field associations and dependencies
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateFormFieldAssociations(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? 'unknown';
        $modelData = $nodeData['model'] ?? null;
        
        // Only for form input components
        $formInputs = ['textfield', 'textarea', 'checkbox', 'radio', 'select', 'password', 'datepicker', 'file'];
        
        if (!in_array(strtolower($componentType), $formInputs) || !is_array($modelData)) {
            return;
        }
        
        // Check for name property in model for form fields
        if (!isset($modelData['name']) || empty($modelData['name'])) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $event->jsonPath . '.model',
                'missing_form_field_name',
                $componentType,
                [
                    'message' => "Form field components must have a model.name property for form submission"
                ]
            );
        }
        
        // Validate conditional visibility logic
        if (isset($modelData['visible']) && is_array($modelData['visible'])) {
            $visibleCondition = $modelData['visible'];
            
            // Check for common conditional logic problems
            if (isset($visibleCondition['when']) && empty($visibleCondition['when'])) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model.visible.when',
                    'empty_conditional_field_reference',
                    $componentType,
                    [
                        'message' => "Conditional visibility 'when' field cannot be empty"
                    ]
                );
            }
            
            if (!isset($visibleCondition['is']) && !isset($visibleCondition['isNot']) && 
                !isset($visibleCondition['contains']) && !isset($visibleCondition['notContains'])) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.model.visible',
                    'missing_conditional_operator',
                    $componentType,
                    [
                        'message' => "Conditional visibility requires an operator (is, isNot, contains, notContains)",
                        'example' => json_encode([
                            'visible' => [
                                'when' => 'otherField',
                                'is' => 'someValue'
                            ]
                        ], JSON_PRETTY_PRINT)
                    ]
                );
            }
        }
    }
    
    /**
     * Check if a value matches the expected type
     *
     * @param mixed $value The value to check
     * @param string $expectedType The expected type
     * @return bool Whether the value matches the expected type
     */
    protected function checkTypeMatch($value, string $expectedType): bool
    {
        switch ($expectedType) {
            case 'string':
                return is_string($value);
            case 'number':
                return is_numeric($value);
            case 'integer':
                return is_int($value) || (is_string($value) && ctype_digit($value));
            case 'boolean':
                return is_bool($value) || $value === 'true' || $value === 'false' || $value === 1 || $value === 0;
            case 'array':
                return is_array($value) && array_is_list($value);
            case 'object':
                return is_array($value) && !array_is_list($value);
            case 'null':
                return is_null($value);
            default:
                return true; // Unknown type, assume valid
        }
    }
    
    /**
     * Dispatch an error event
     *
     * @param string $moduleName Module name
     * @param string $filePath File path
     * @param string $jsonPath JSON path
     * @param string $errorType Error type
     * @param string $componentType Component type
     * @param array $context Error context
     * @return void
     */
    protected function dispatchError(string $moduleName, string $filePath, string $jsonPath, string $errorType, string $componentType, array $context): void
    {
        $event = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $jsonPath,
            $errorType,
            '', // Empty message, will be generated by ErrorMessageGeneratorListener
            $context,
            $componentType
        );
        
        // Log the error for debugging
        $logChannel = Config::get('logging.default');
        Log::channel($logChannel)->debug(
            "[ModelValidationListener] Dispatching error: {$errorType} in {$filePath} at {$jsonPath}"
        );
        
        // Dispatch the event through the command's event dispatcher
        if (function_exists('event')) {
            event($event);
        }
    }
} 