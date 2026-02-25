<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use Illuminate\Support\Str;

/**
 * Validator for component structure elements like model, children, slots, etc.
 */
class ComponentStructureValidator
{
    /**
     * Handle a node encountered event to validate component structure
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
        
        $componentRules = $event->componentRules;
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? 'unknown';
        $moduleName = $event->moduleName;
        $filePath = $event->filePath;
        $jsonPath = $event->jsonPath;
        
        // Get structure definition from rules
        $componentStructure = $this->getComponentStructureFromRules($componentRules);
        if (empty($componentStructure)) {
            return;
        }
        
        $allowedTopLevelKeys = array_keys($componentStructure);
        
        // 1. Check for unknown top-level keys
        foreach ($nodeData as $key => $value) {
            if ($key === 'type' || $this->isVueDirectiveOrStandardAttribute($key)) {
                continue;
            }
            
            if (!in_array($key, $allowedTopLevelKeys)) {
                $this->dispatchUnknownKeyError(
                    $moduleName,
                    $filePath,
                    $jsonPath . '.' . $key,
                    $componentType,
                    $key,
                    $allowedTopLevelKeys
                );
            }
        }
        
        // 2. Check for missing required top-level keys
        foreach ($componentStructure as $key => $rule) {
            if (($rule['required'] ?? false) && !array_key_exists($key, $nodeData)) {
                $this->dispatchMissingRequiredKeyError(
                    $moduleName,
                    $filePath,
                    $jsonPath,
                    $componentType,
                    $key
                );
            }
        }
        
        // 3. Validate specific structural elements
        $this->validateModelElement($event, $componentStructure);
        $this->validateChildrenElement($event, $componentStructure);
        $this->validateSlotsElement($event, $componentStructure);
    }
    
    /**
     * Validate the model element of a component
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @param array $componentStructure Component structure rules
     * @return void
     */
    protected function validateModelElement(NodeEncounteredEvent $event, array $componentStructure): void
    {
        if (!isset($componentStructure['model']) || !isset($event->nodeData['model'])) {
            return;
        }
        
        $modelRule = $componentStructure['model'];
        $modelData = $event->nodeData['model'];
        $componentType = $event->nodeData['type'] ?? 'unknown';
        $modelPath = $event->jsonPath . '.model';
        
        // Validate model structure
        if (!is_array($modelData)) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $modelPath,
                'invalid_model_type',
                $componentType,
                [
                    'expected_type' => 'object',
                    'actual_type' => gettype($modelData)
                ]
            );
            return;
        }
        
        $modelStructure = $modelRule['nestedValidation']['structure'] ?? null;
        if (!$modelStructure) {
            return;
        }
        
        $definedModelKeys = array_keys($modelStructure);
        
        // Check for unknown keys in model
        foreach ($modelData as $key => $value) {
            if (!in_array($key, $definedModelKeys)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $modelPath . '.' . $key,
                    'unknown_key_in_model',
                    $componentType,
                    [
                        'key' => $key,
                        'allowed_keys' => $definedModelKeys
                    ]
                );
            }
        }
        
        // Check for missing required keys in model
        foreach ($modelStructure as $key => $rule) {
            if (($rule['required'] ?? false) && !array_key_exists($key, $modelData)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $modelPath,
                    'missing_required_key_in_model',
                    $componentType,
                    [
                        'key' => $key
                    ]
                );
            }
        }
    }
    
    /**
     * Validate the children element of a component
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @param array $componentStructure Component structure rules
     * @return void
     */
    protected function validateChildrenElement(NodeEncounteredEvent $event, array $componentStructure): void
    {
        if (!isset($componentStructure['children']) || !isset($event->nodeData['children'])) {
            return;
        }
        
        $childrenRule = $componentStructure['children'];
        $childrenData = $event->nodeData['children'];
        $componentType = $event->nodeData['type'] ?? 'unknown';
        $childrenPath = $event->jsonPath . '.children';
        
        // Validate children type (should be array)
        $expectedType = $childrenRule['type'] ?? 'array';
        if ($expectedType === 'array' && !is_array($childrenData)) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $childrenPath,
                'invalid_children_type',
                $componentType,
                [
                    'expected_type' => 'array',
                    'actual_type' => gettype($childrenData)
                ]
            );
            return;
        }
        
        // Skip further validation if not array
        if (!is_array($childrenData)) {
            return;
        }
        
        // Validate children against allowed types if defined
        $allowedTypes = $childrenRule['nestedValidation']['allowedTypes'] ?? [];
        $allowAnyObject = $childrenRule['nestedValidation']['_allowAnyObject'] ?? false;
        
        if (!empty($allowedTypes) && !$allowAnyObject) {
            foreach ($childrenData as $index => $childNode) {
                if (is_array($childNode) && isset($childNode['type'])) {
                    $childType = strtolower($childNode['type']);
                    $isAllowed = in_array($childType, array_map('strtolower', $allowedTypes));
                    
                    if (!$isAllowed) {
                        $this->dispatchError(
                            $event->moduleName,
                            $event->filePath,
                            $childrenPath . '[' . $index . ']',
                            'component_child_type_disallowed',
                            $componentType,
                            [
                                'child_type' => $childNode['type'],
                                'allowed_types' => $allowedTypes
                            ]
                        );
                    }
                }
            }
        }
    }
    
    /**
     * Validate the slots element of a component
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @param array $componentStructure Component structure rules
     * @return void
     */
    protected function validateSlotsElement(NodeEncounteredEvent $event, array $componentStructure): void
    {
        if (!isset($componentStructure['slots']) || !isset($event->nodeData['slots'])) {
            return;
        }
        
        $slotsRule = $componentStructure['slots'];
        $slotsData = $event->nodeData['slots'];
        $componentType = $event->nodeData['type'] ?? 'unknown';
        $slotsPath = $event->jsonPath . '.slots';
        
        // Validate slots type (should be object)
        if (!is_array($slotsData) || array_is_list($slotsData)) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $slotsPath,
                'invalid_slots_type',
                $componentType,
                [
                    'expected_type' => 'object',
                    'actual_type' => is_array($slotsData) ? 'array' : gettype($slotsData)
                ]
            );
            return;
        }
        
        $slotsStructure = $slotsRule['nestedValidation']['structure'] ?? null;
        if (!$slotsStructure) {
            $this->dispatchError(
                $event->moduleName,
                $event->filePath,
                $slotsPath,
                'missing_slot_definition',
                $componentType,
                []
            );
            return;
        }
        
        $definedSlotNames = array_keys($slotsStructure);
        
        // Check for unknown slot names
        foreach ($slotsData as $slotName => $slotContent) {
            if (!in_array($slotName, $definedSlotNames)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $slotsPath . '.' . $slotName,
                    'unknown_slot_name',
                    $componentType,
                    [
                        'slot_name' => $slotName,
                        'defined_slots' => $definedSlotNames
                    ]
                );
            }
        }
        
        // Check for missing required slots
        foreach ($slotsStructure as $slotName => $slotRule) {
            if (($slotRule['required'] ?? false) && !array_key_exists($slotName, $slotsData)) {
                $this->dispatchError(
                    $event->moduleName,
                    $event->filePath,
                    $slotsPath,
                    'missing_required_slot',
                    $componentType,
                    [
                        'slot_name' => $slotName
                    ]
                );
            }
        }
    }
    
    /**
     * Check if a key is a Vue directive or standard HTML attribute
     *
     * @param string $key The key to check
     * @return bool
     */
    protected function isVueDirectiveOrStandardAttribute(string $key): bool
    {
        $standardHtmlAttributes = ['id', 'class', 'style'];
        
        return (
            Str::startsWith($key, ['v-', '@', ':', '#']) ||
            in_array(strtolower($key), $standardHtmlAttributes) ||
            Str::startsWith(strtolower($key), 'data-') ||
            Str::startsWith(strtolower($key), 'aria-')
        );
    }
    
    /**
     * Extract component structure from rules
     *
     * @param array $componentRules Component rules
     * @return array Component structure
     */
    protected function getComponentStructureFromRules(array $componentRules): array
    {
        if (isset($componentRules['nestedValidation']['structure'])) {
            return $componentRules['nestedValidation']['structure'];
        }
        
        return [];
    }
    
    /**
     * Dispatch an unknown key error
     *
     * @param string $moduleName Module name
     * @param string $filePath File path
     * @param string $jsonPath JSON path
     * @param string $componentType Component type
     * @param string $key Key name
     * @param array $allowedKeys Allowed keys
     * @return void
     */
    protected function dispatchUnknownKeyError(string $moduleName, string $filePath, string $jsonPath, string $componentType, string $key, array $allowedKeys): void
    {
        $this->dispatchError(
            $moduleName,
            $filePath,
            $jsonPath,
            'unknown_key_at_component_level',
            $componentType,
            [
                'key' => $key,
                'allowed_keys' => $allowedKeys
            ]
        );
    }
    
    /**
     * Dispatch a missing required key error
     *
     * @param string $moduleName Module name
     * @param string $filePath File path
     * @param string $jsonPath JSON path
     * @param string $componentType Component type
     * @param string $key Key name
     * @return void
     */
    protected function dispatchMissingRequiredKeyError(string $moduleName, string $filePath, string $jsonPath, string $componentType, string $key): void
    {
        $this->dispatchError(
            $moduleName,
            $filePath,
            $jsonPath,
            'missing_required_key',
            $componentType,
            [
                'key' => $key
            ]
        );
    }
    
    /**
     * Dispatch a generic error
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
        $errorEvent = new ErrorDetectedEvent(
            $moduleName,
            $filePath,
            $jsonPath,
            $errorType,
            '', // Empty message - will be generated by ErrorMessageGeneratorListener
            $context,
            $componentType
        );
        
        \Illuminate\Support\Facades\Event::dispatch($errorEvent);
    }
} 