<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use Illuminate\Support\Str;

/**
 * Validator for data integrity and consistency across related fields
 */
class DataIntegrityValidationListener
{
    /**
     * Known field relationships that should be consistent
     * 
     * @var array
     */
    protected $fieldRelationships = [
        // If component has X, it should also have Y
        'paired_fields' => [
            'datatable' => [
                ['field' => 'props.pagination', 'paired_with' => 'props.rows', 'message' => "Datatable with pagination should have 'rows' prop defined"],
                ['field' => 'props.sortable', 'paired_with' => 'props.defaultSortField', 'message' => "Sortable datatable should have 'defaultSortField' prop defined"]
            ],
            'form' => [
                ['field' => 'props.submitUrl', 'paired_with' => 'props.method', 'message' => "Form with submitUrl should have 'method' prop defined"]
            ],
            'chart' => [
                ['field' => 'props.type', 'paired_with' => 'props.data', 'message' => "Chart component must have both 'type' and 'data' props defined"]
            ]
        ],
        
        // Fields that are mutually exclusive
        'exclusive_fields' => [
            'button' => [
                ['fields' => ['props.href', 'props.onClick'], 'message' => "Button should have either 'href' or 'onClick', not both"]
            ],
            'image' => [
                ['fields' => ['props.src', 'props.base64'], 'message' => "Image should have either 'src' or 'base64', not both"]
            ]
        ],
        
        // Fields that depend on specific values in other fields
        'conditional_requirements' => [
            'select' => [
                [
                    'if_field' => 'props.multiple', 
                    'has_value' => true, 
                    'then_require' => 'model.value', 
                    'as_type' => 'array',
                    'message' => "Multiple select should have model.value as array"
                ]
            ],
            'chart' => [
                [
                    'if_field' => 'props.type', 
                    'has_value' => 'pie', 
                    'then_require' => 'props.labels', 
                    'message' => "Pie chart requires 'labels' prop"
                ],
                [
                    'if_field' => 'props.type', 
                    'has_value' => 'line', 
                    'then_require' => 'props.xAxis', 
                    'message' => "Line chart requires 'xAxis' prop"
                ]
            ]
        ]
    ];
    
    /**
     * Handle a node encountered event to validate data integrity
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    public function handle(NodeEncounteredEvent $event): void
    {
        // Skip if no component data or type
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? null;
        
        if (!$componentType) {
            return;
        }
        
        $this->validatePairedFields($event);
        $this->validateExclusiveFields($event);
        $this->validateConditionalRequirements($event);
        $this->validateComponentSpecificIntegrity($event);
    }
    
    /**
     * Validate paired fields that should exist together
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validatePairedFields(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = strtolower($nodeData['type'] ?? '');
        
        if (!isset($this->fieldRelationships['paired_fields'][$componentType])) {
            return;
        }
        
        $pairRules = $this->fieldRelationships['paired_fields'][$componentType];
        
        foreach ($pairRules as $rule) {
            $field = $rule['field'];
            $pairedWith = $rule['paired_with'];
            $message = $rule['message'];
            
            // Check if the first field exists
            $hasField = $this->getNestedValue($nodeData, $field) !== null;
            
            if ($hasField) {
                // The field exists, now check if its pair exists
                $hasPairedField = $this->getNestedValue($nodeData, $pairedWith) !== null;
                
                if (!$hasPairedField) {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.' . str_replace('props.', '', $field),
                        'missing_paired_field',
                        $componentType,
                        [
                            'field' => $field,
                            'paired_with' => $pairedWith,
                            'message' => $message
                        ]
                    );
                }
            }
        }
    }
    
    /**
     * Validate fields that should be mutually exclusive
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateExclusiveFields(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = strtolower($nodeData['type'] ?? '');
        
        if (!isset($this->fieldRelationships['exclusive_fields'][$componentType])) {
            return;
        }
        
        $exclusiveRules = $this->fieldRelationships['exclusive_fields'][$componentType];
        
        foreach ($exclusiveRules as $rule) {
            $fields = $rule['fields'];
            $message = $rule['message'];
            $existingFields = [];
            
            // Check which fields exist
            foreach ($fields as $field) {
                if ($this->getNestedValue($nodeData, $field) !== null) {
                    $existingFields[] = $field;
                }
            }
            
            // If more than one exists, they violate mutual exclusivity
            if (count($existingFields) > 1) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath,
                    'mutually_exclusive_fields_conflict',
                    $componentType,
                    [
                        'fields' => $existingFields,
                        'message' => $message
                    ]
                );
            }
        }
    }
    
    /**
     * Validate conditional field requirements
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateConditionalRequirements(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = strtolower($nodeData['type'] ?? '');
        
        if (!isset($this->fieldRelationships['conditional_requirements'][$componentType])) {
            return;
        }
        
        $conditionalRules = $this->fieldRelationships['conditional_requirements'][$componentType];
        
        foreach ($conditionalRules as $rule) {
            $ifField = $rule['if_field'];
            $hasValue = $rule['has_value'];
            $thenRequire = $rule['then_require'];
            $asType = $rule['as_type'] ?? null;
            $message = $rule['message'];
            
            // Get the actual value of the if_field
            $actualValue = $this->getNestedValue($nodeData, $ifField);
            
            // If the field has the specified value
            if ($actualValue === $hasValue) {
                $requiredValue = $this->getNestedValue($nodeData, $thenRequire);
                
                // Check if the required field exists
                if ($requiredValue === null) {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.' . str_replace('props.', '', $ifField),
                        'missing_conditional_field',
                        $componentType,
                        [
                            'if_field' => $ifField,
                            'if_value' => $hasValue,
                            'required_field' => $thenRequire,
                            'message' => $message
                        ]
                    );
                }
                // If a specific type is required, validate that too
                elseif ($asType !== null) {
                    $isCorrectType = false;
                    
                    switch ($asType) {
                        case 'array':
                            $isCorrectType = is_array($requiredValue);
                            break;
                        case 'string':
                            $isCorrectType = is_string($requiredValue);
                            break;
                        case 'number':
                            $isCorrectType = is_numeric($requiredValue);
                            break;
                        case 'boolean':
                            $isCorrectType = is_bool($requiredValue);
                            break;
                    }
                    
                    if (!$isCorrectType) {
                        $this->dispatchError(
                            $event->moduleName,
                            $event->filePath,
                            $event->jsonPath . '.' . str_replace('props.', '', $thenRequire),
                            'conditional_field_wrong_type',
                            $componentType,
                            [
                                'if_field' => $ifField,
                                'if_value' => $hasValue,
                                'required_field' => $thenRequire,
                                'expected_type' => $asType,
                                'actual_type' => gettype($requiredValue),
                                'message' => $message
                            ]
                        );
                    }
                }
            }
        }
    }
    
    /**
     * Validate component-specific data integrity rules
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateComponentSpecificIntegrity(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = strtolower($nodeData['type'] ?? '');
        
        // Component-specific validation logic
        switch ($componentType) {
            case 'datatable':
                $this->validateDatatableIntegrity($event);
                break;
                
            case 'chart':
                $this->validateChartIntegrity($event);
                break;
                
            case 'form':
                $this->validateFormIntegrity($event);
                break;
        }
    }
    
    /**
     * Validate datatable component data integrity
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateDatatableIntegrity(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $props = $nodeData['props'] ?? [];
        
        // Check that columns have consistent properties
        if (isset($props['columns']) && is_array($props['columns'])) {
            $columns = $props['columns'];
            $columnFields = [];
            
            foreach ($columns as $index => $column) {
                if (!is_array($column)) {
                    continue;
                }
                
                // Check for duplicate field names
                $field = $column['field'] ?? null;
                if ($field) {
                    if (in_array($field, $columnFields)) {
                        $this->dispatchError(
                            $event->moduleName,
                            $event->filePath,
                            $event->jsonPath . '.props.columns[' . $index . '].field',
                            'duplicate_column_field',
                            'datatable',
                            [
                                'field' => $field,
                                'message' => "Duplicate column field '{$field}'"
                            ]
                        );
                    }
                    $columnFields[] = $field;
                } else {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.props.columns[' . $index . ']',
                        'missing_column_field',
                        'datatable',
                        [
                            'message' => "Column is missing required 'field' property"
                        ]
                    );
                }
                
                // Check that sortable columns have a field
                if (isset($column['sortable']) && $column['sortable'] === true && empty($field)) {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.props.columns[' . $index . ']',
                        'sortable_column_missing_field',
                        'datatable',
                        [
                            'message' => "Sortable column must have a 'field' property"
                        ]
                    );
                }
            }
            
            // Check if defaultSortField exists in columns
            $defaultSortField = $props['defaultSortField'] ?? null;
            if ($defaultSortField && !in_array($defaultSortField, $columnFields)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.props.defaultSortField',
                    'invalid_default_sort_field',
                    'datatable',
                    [
                        'default_sort_field' => $defaultSortField,
                        'available_fields' => $columnFields,
                        'message' => "Default sort field '{$defaultSortField}' is not present in column definitions"
                    ]
                );
            }
        }
    }
    
    /**
     * Validate chart component data integrity
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateChartIntegrity(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $props = $nodeData['props'] ?? [];
        
        // Check chart type vs data structure
        $chartType = $props['type'] ?? null;
        $chartData = $props['data'] ?? null;
        
        if (!$chartType || !$chartData) {
            return;
        }
        
        // Type-specific data validation
        switch (strtolower($chartType)) {
            case 'pie':
            case 'doughnut':
                // Pie/doughnut charts require data as array and matching labels
                if (is_array($chartData) && !empty($chartData)) {
                    $labels = $props['labels'] ?? null;
                    
                    if (is_array($labels) && count($labels) !== count($chartData)) {
                        $this->dispatchError(
                            $event->moduleName,
                            $event->filePath,
                            $event->jsonPath . '.props.labels',
                            'mismatched_chart_labels',
                            'chart',
                            [
                                'data_count' => count($chartData),
                                'labels_count' => count($labels),
                                'message' => "Chart has {$chartData} data points but {$labels} labels"
                            ]
                        );
                    }
                }
                break;
                
            case 'bar':
            case 'line':
                // Bar/line charts require xAxis for horizontal axis labels
                if (!isset($props['xAxis']) || !is_array($props['xAxis'])) {
                    $this->dispatchError(
                        $event->moduleName,
                        $event->filePath,
                        $event->jsonPath . '.props',
                        'missing_chart_axis',
                        'chart',
                        [
                            'message' => "Bar/line charts require 'xAxis' property as array"
                        ]
                    );
                }
                break;
        }
    }
    
    /**
     * Validate form component data integrity
     * 
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    protected function validateFormIntegrity(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $props = $nodeData['props'] ?? [];
        $children = $nodeData['children'] ?? [];
        
        // Check form methods 
        $method = $props['method'] ?? null;
        $submitUrl = $props['submitUrl'] ?? null;
        
        if ($submitUrl && $method) {
            $validMethods = ['get', 'post', 'put', 'patch', 'delete'];
            if (!in_array(strtolower($method), $validMethods)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.props.method',
                    'invalid_form_method',
                    'form',
                    [
                        'method' => $method,
                        'valid_methods' => $validMethods,
                        'message' => "Form method '{$method}' is not valid"
                    ]
                );
            }
        }
        
        // Check for duplicate field names in form children
        if (is_array($children)) {
            $fieldNames = [];
            $this->collectFormFieldNames($children, $fieldNames);
            
            $duplicates = array_filter(array_count_values($fieldNames), function($count) {
                return $count > 1;
            });
            
            foreach ($duplicates as $fieldName => $count) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath . '.children',
                    'duplicate_form_field_names',
                    'form',
                    [
                        'field_name' => $fieldName,
                        'occurrences' => $count,
                        'message' => "Duplicate form field name '{$fieldName}' found {$count} times"
                    ]
                );
            }
        }
    }
    
    /**
     * Recursively collect form field names from children
     * 
     * @param array $children Form children
     * @param array &$fieldNames Collected field names
     * @return void
     */
    protected function collectFormFieldNames(array $children, array &$fieldNames): void
    {
        foreach ($children as $child) {
            if (!is_array($child)) {
                continue;
            }
            
            // Check if this is a form field with a name
            if (isset($child['model']['name'])) {
                $fieldNames[] = $child['model']['name'];
            }
            
            // Recursively check children
            if (isset($child['children']) && is_array($child['children'])) {
                $this->collectFormFieldNames($child['children'], $fieldNames);
            }
        }
    }
    
    /**
     * Get a nested value from an array using dot notation
     * 
     * @param array $array The array to get the value from
     * @param string $key The key to get using dot notation
     * @return mixed|null The value or null if not found
     */
    protected function getNestedValue(array $array, string $key)
    {
        $keys = explode('.', $key);
        $value = $array;
        
        foreach ($keys as $nestedKey) {
            if (!isset($value[$nestedKey])) {
                return null;
            }
            $value = $value[$nestedKey];
        }
        
        return $value;
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
            '',  // Empty message, will be generated by ErrorMessageGeneratorListener
            $context,
            $componentType
        );
        
        // Log the error for debugging
        $logChannel = Config::get('logging.default');
        Log::channel($logChannel)->debug(
            "[DataIntegrityValidator] Dispatching error: {$errorType} in {$filePath} at {$jsonPath}"
        );
        
        // Dispatch the event through the command's event dispatcher
        if (function_exists('event')) {
            event($event);
        }
    }
} 