<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Hooks\FileFacade as FacadesFile;
use App\Hooks\FileFacade;
use Illuminate\Support\Str;

/**
 * Listener for generating actionable suggestions based on validation errors
 */
class SuggestionGeneratorListener
{
    protected array $suggestionCache = [];
    protected ?string $baseDir = null;
    
    public function __construct()
    {
        $this->baseDir = base_path();
        $this->loadSuggestions();
    }
    
    protected function loadSuggestions(): void
    {
        $suggestionsPath = $this->baseDir . '/install-modules/aiCore/validation/suggestions.json';
        if (!FileFacade::exists($suggestionsPath)) {
            return;
        }
        
        try {
            $suggestionsData = json_decode(FileFacade::get($suggestionsPath), true);
            $this->suggestionCache = is_array($suggestionsData) ? $suggestionsData : [];
        } catch (\Exception $e) {
            // Failed to load suggestions, continue with empty cache
        }
    }

    /**
     * Handle the error detected event.
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        if (empty($this->suggestionCache)) {
            return;
        }
        
        $errorType = $event->errorSlug;
        $jsonPath = $event->jsonPath;
        $componentType = $event->componentType;
        
        // Find matching suggestion for this error
        $matchingSuggestion = null;
        
        foreach ($this->suggestionCache as $suggestion) {
            if (!isset($suggestion['match']) || !is_array($suggestion['match'])) {
                continue;
            }
            
            $matchCriteria = $suggestion['match'];
            $matches = true;
            
            // Match error_type (required)
            if (isset($matchCriteria['error_type']) && $matchCriteria['error_type'] !== $errorType) {
                $matches = false;
                continue;
            }
            
            // Match component if specified
            if (isset($matchCriteria['component']) && 
                $matchCriteria['component'] !== $componentType &&
                strtolower($matchCriteria['component']) !== strtolower($componentType)) {
                $matches = false;
                continue;
            }
            
            // Match path contains if specified
            if (isset($matchCriteria['path_contains']) && 
                !Str::contains($jsonPath, $matchCriteria['path_contains'])) {
                $matches = false;
                continue;
            }
            
            // Match key if specified in context
            if (isset($matchCriteria['key']) && 
                (!isset($event->context['key']) || $event->context['key'] !== $matchCriteria['key']) && 
                (!isset($event->context['missing_key']) || $event->context['missing_key'] !== $matchCriteria['key'])) {
                $matches = false;
                continue;
            }
            
            if ($matches) {
                $matchingSuggestion = $suggestion;
                break;
            }
        }
        
        if ($matchingSuggestion) {
            // Add suggestion to the event context
            $event->context['suggestion'] = $matchingSuggestion['suggestion'] ?? null;
            $event->context['suggestion_example'] = $matchingSuggestion['example'] ?? null;
            $event->context['docs'] = $matchingSuggestion['docs'] ?? null;
            
            // Create a combined suggestion message that includes the example
            $combinedSuggestion = $matchingSuggestion['suggestion'] ?? '';
            if (!empty($matchingSuggestion['example'])) {
                $combinedSuggestion .= "\nExample: " . $matchingSuggestion['example'];
            }
            
            $event->context['suggestion_combined'] = $combinedSuggestion;
        }
    }

    /**
     * Add suggestions for unknown component types
     */
    private function addUnknownComponentTypeSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $componentType = $event->componentType;
        $similarTypes = $event->context['suggested_types'] ?? [];

        if (!empty($similarTypes)) {
            // Suggestion to use the first (most likely) alternative
            $suggestions[] = [
                'type' => 'replace',
                'message' => "Replace '{$componentType}' with '{$similarTypes[0]}'",
                'severity' => 'action',
                'actionable' => true,
                'from' => "\"type\": \"{$componentType}\"",
                'to' => "\"type\": \"{$similarTypes[0]}\""
            ];

            // Link to component documentation if available
            $docPaths = $this->findComponentDocumentation($similarTypes[0]);
            if (!empty($docPaths)) {
                $suggestions[] = [
                    'type' => 'documentation',
                    'message' => "View documentation for '{$similarTypes[0]}'",
                    'severity' => 'info',
                    'actionable' => true,
                    'docs' => $docPaths
                ];
            }
        }

        // General suggestion for component registration
        $suggestions[] = [
            'type' => 'general',
            'message' => "Components must be registered in the application. Check component-map.json or verify the component name is correct.",
            'severity' => 'info'
        ];
    }

    /**
     * Add suggestions for unknown properties
     */
    private function addUnknownPropSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $propKey = $event->context['key'] ?? null;
        $componentType = $event->componentType;
        $suggestedProps = $event->context['suggested_props'] ?? [];
        $availableProps = $event->context['available_props'] ?? [];

        if (!empty($suggestedProps)) {
            // Suggest using one of the similar properties
            $suggestions[] = [
                'type' => 'replace',
                'message' => "Replace '{$propKey}' with '{$suggestedProps[0]}'",
                'severity' => 'action',
                'actionable' => true,
                'from' => "\"{$propKey}\"",
                'to' => "\"{$suggestedProps[0]}\""
            ];
        } elseif (!empty($availableProps)) {
            // Show available properties
            $limit = min(count($availableProps), 5);
            $examples = array_slice($availableProps, 0, $limit);
            
            $suggestions[] = [
                'type' => 'info',
                'message' => "Use one of the available props for {$componentType}: " . implode(', ', $examples) . (count($availableProps) > $limit ? '...' : ''),
                'severity' => 'info',
                'available_props' => $availableProps
            ];
        }

        // Check if property might belong elsewhere
        $potentialLocations = ['model', 'slots', 'children'];
        foreach ($potentialLocations as $location) {
            $suggestions[] = [
                'type' => 'move',
                'message' => "Check if '{$propKey}' should be in '{$location}' instead of 'props'",
                'severity' => 'suggestion'
            ];
        }
    }

    /**
     * Add suggestions for properties in the wrong location
     */
    private function addPropInWrongLocationSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $propKey = $event->context['key'] ?? null;
        $correctLocation = $event->context['correct_location'] ?? null;
        $modelPath = $event->context['model_path'] ?? null;

        if ($propKey && $correctLocation) {
            $suggestions[] = [
                'type' => 'move',
                'message' => "Move '{$propKey}' from 'props' to '{$correctLocation}'",
                'severity' => 'action',
                'actionable' => true,
                'source_location' => 'props',
                'target_location' => $correctLocation
            ];
            
            // Show an example structure
            $suggestions[] = [
                'type' => 'example',
                'message' => "Correct structure example:",
                'severity' => 'info',
                'example' => "{\n  \"type\": \"{$event->componentType}\",\n  \"{$correctLocation}\": {\n    \"{$propKey}\": ...\n  }\n}"
            ];
        }
    }

    /**
     * Add suggestions for missing required properties
     */
    private function addMissingRequiredPropSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $propKey = $event->context['key'] ?? null;
        $componentType = $event->componentType;
        $rulePath = $event->context['rule_path'] ?? null;

        if ($propKey) {
            // Get default value for the property if available
            $defaultValue = $this->getDefaultValueForProp($componentType, $propKey, $rulePath);
            
            $suggestions[] = [
                'type' => 'add',
                'message' => "Add required property '{$propKey}' to '{$componentType}'",
                'severity' => 'action',
                'actionable' => true,
                'prop_name' => $propKey,
                'default_value' => $defaultValue ?: '""' // Empty string default
            ];
            
            // Show an example
            $valueExample = $defaultValue ?: ($this->getPropTypeExample($componentType, $propKey, $rulePath) ?: '""');
            $suggestions[] = [
                'type' => 'example',
                'message' => "Add to 'props' object:",
                'severity' => 'info',
                'example' => "\"props\": {\n  \"{$propKey}\": {$valueExample},\n  ... existing props ...\n}"
            ];
        }
    }

    /**
     * Add suggestions for invalid property types
     */
    private function addInvalidPropTypeSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $propKey = $event->context['key'] ?? null;
        $expectedType = $event->context['expected_type'] ?? null;
        $actualType = $event->context['actual_type'] ?? null;

        if ($propKey && $expectedType) {
            $suggestions[] = [
                'type' => 'fix',
                'message' => "Ensure '{$propKey}' is of type '{$expectedType}'",
                'severity' => 'action',
                'prop_name' => $propKey,
                'expected_type' => $expectedType,
                'actual_type' => $actualType
            ];
            
            // Show examples for different types
            $examples = $this->getTypeExamples($expectedType);
            if (!empty($examples)) {
                $suggestions[] = [
                    'type' => 'example',
                    'message' => "Examples for {$expectedType} type:",
                    'severity' => 'info',
                    'examples' => $examples
                ];
            }
        }
    }

    /**
     * Add suggestions for JSON syntax errors
     */
    private function addJsonSyntaxErrorSuggestions(ErrorDetectedEvent $event, array &$suggestions): void
    {
        $errorMessage = $event->message ?? '';
        
        $suggestions[] = [
            'type' => 'general', 
            'message' => "Check for common JSON syntax errors:",
            'severity' => 'info'
        ];
        
        $commonErrors = [
            "Missing or extra commas between properties",
            "Missing quotes around property names",
            "Missing closing brackets (}, ])",
            "Using single quotes instead of double quotes",
            "Trailing commas at the end of lists or objects"
        ];
        
        foreach ($commonErrors as $error) {
            $suggestions[] = [
                'type' => 'check',
                'message' => $error,
                'severity' => 'suggestion'
            ];
        }
        
        $suggestions[] = [
            'type' => 'tool',
            'message' => "Use a JSON validator tool to check your file",
            'severity' => 'action',
            'link' => "https://jsonlint.com/"
        ];
    }

    /**
     * Find documentation for a component
     *
     * @param string $componentType
     * @return array Documentation paths
     */
    private function findComponentDocumentation(string $componentType): array
    {
        $docPaths = [];
        
        // Check for documentation in standard locations
        $potentialPaths = [
            // Component rule file itself
            base_path("install-modules/aiCore/validation/components/{$componentType}.json"),
            // Documentation directory
            base_path("install-modules/aiCore/docs/components/{$componentType}.md"),
            // Vue component source
            base_path("resources/common/js/Elements/Primevue/{$componentType}.vue"),
        ];
        
        foreach ($potentialPaths as $path) {
            if (FacadesFile::exists($path)) {
                $docPaths[] = $path;
            }
        }
        
        return $docPaths;
    }

    /**
     * Get default value for a property based on component rules
     *
     * @param string $componentType
     * @param string $propName
     * @param string|null $rulePath
     * @return string|null
     */
    private function getDefaultValueForProp(string $componentType, string $propName, ?string $rulePath): ?string
    {
        // Try to load the rule file
        if ($rulePath && FacadesFile::exists($rulePath)) {
            try {
                $content = FacadesFile::get($rulePath);
                $ruleData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                
                // Look for default in the rule structure
                $default = $this->findPropDefaultInRule($ruleData, $propName);
                if ($default !== null) {
                    return is_string($default) ? "\"{$default}\"" : json_encode($default);
                }
            } catch (\Throwable $e) {
                // Log error but continue
                Log::channel(Config::get('logging.default'))->warning(
                    "[SuggestionGeneratorListener] Error loading rule file for default value: " . $e->getMessage()
                );
            }
        }
        
        // Hardcoded defaults for common properties
        $commonDefaults = [
            'disabled' => 'false',
            'required' => 'false',
            'visible' => 'true',
            'readonly' => 'false',
            'showClear' => 'false',
            'filter' => 'false',
            'placeholder' => '"Enter value"',
            'label' => '"Label"',
            'value' => '""',
            'options' => '[]',
            'style' => '{}',
            'class' => '""'
        ];
        
        return $commonDefaults[$propName] ?? null;
    }

    /**
     * Find property default in a rule structure
     *
     * @param array $ruleData
     * @param string $propName
     * @return mixed
     */
    private function findPropDefaultInRule(array $ruleData, string $propName)
    {
        // Check if there's a nested validation structure (common pattern)
        if (isset($ruleData['nestedValidation']['structure']['props']['nestedValidation']['structure'][$propName]['default'])) {
            return $ruleData['nestedValidation']['structure']['props']['nestedValidation']['structure'][$propName]['default'];
        }
        
        // Also check direct props structure
        if (isset($ruleData['props']['nestedValidation']['structure'][$propName]['default'])) {
            return $ruleData['props']['nestedValidation']['structure'][$propName]['default'];
        }
        
        return null;
    }

    /**
     * Get examples for different value types
     *
     * @param string|array $expectedType
     * @return array
     */
    private function getTypeExamples($expectedType): array
    {
        $examples = [];
        $types = is_array($expectedType) ? $expectedType : [$expectedType];
        
        foreach ($types as $type) {
            switch ($type) {
                case 'string':
                    $examples[] = '"Example text"';
                    break;
                case 'number':
                    $examples[] = '42';
                    $examples[] = '3.14';
                    break;
                case 'boolean':
                    $examples[] = 'true';
                    $examples[] = 'false';
                    break;
                case 'array':
                    $examples[] = '[1, 2, 3]';
                    $examples[] = '["a", "b", "c"]';
                    break;
                case 'object':
                    $examples[] = '{ "key": "value" }';
                    break;
            }
        }
        
        return $examples;
    }

    /**
     * Get example value based on property type
     *
     * @param string $componentType
     * @param string $propName
     * @param string|null $rulePath
     * @return string|null
     */
    private function getPropTypeExample(string $componentType, string $propName, ?string $rulePath): ?string
    {
        // Try to load the rule file
        if ($rulePath && FacadesFile::exists($rulePath)) {
            try {
                $content = FacadesFile::get($rulePath);
                $ruleData = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                
                // Find property type in rule structure
                $type = $this->findPropTypeInRule($ruleData, $propName);
                if ($type !== null) {
                    return $this->getSimpleExampleForType($type);
                }
            } catch (\Throwable $e) {
                // Log but continue
                Log::channel(Config::get('logging.default'))->warning(
                    "[SuggestionGeneratorListener] Error loading rule file for type example: " . $e->getMessage()
                );
            }
        }
        
        return null;
    }

    /**
     * Find property type in a rule structure
     *
     * @param array $ruleData
     * @param string $propName
     * @return string|array|null
     */
    private function findPropTypeInRule(array $ruleData, string $propName)
    {
        // Check if there's a nested validation structure (common pattern)
        if (isset($ruleData['nestedValidation']['structure']['props']['nestedValidation']['structure'][$propName]['type'])) {
            return $ruleData['nestedValidation']['structure']['props']['nestedValidation']['structure'][$propName]['type'];
        }
        
        // Also check direct props structure
        if (isset($ruleData['props']['nestedValidation']['structure'][$propName]['type'])) {
            return $ruleData['props']['nestedValidation']['structure'][$propName]['type'];
        }
        
        return null;
    }

    /**
     * Get simple example value for a type
     *
     * @param string|array $type
     * @return string
     */
    private function getSimpleExampleForType($type): string
    {
        if (is_array($type)) {
            // Use the first type for the example
            return $this->getSimpleExampleForType($type[0]);
        }
        
        switch ($type) {
            case 'string':
                return '"Example"';
            case 'number':
                return '42';
            case 'boolean':
                return 'true';
            case 'array':
                return '[]';
            case 'object':
                return '{}';
            default:
                return '""';
        }
    }
} 