<?php

namespace App\Console\Commands\Listeners;

use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\ValidationCompletedEvent;
use Illuminate\Support\Facades\Log;

/**
 * Collects property errors during validation and outputs a summary at the end
 */
class PropertyErrorSummaryListener
{
    private static array $propErrors = [];
    private static array $missingRequiredProps = [];
    private static array $invalidPropTypes = [];
    private static array $propFormats = [];
    private static array $componentExamples = [];

    /**
     * Handle property-related error event
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        // Only process property-related errors
        $errorType = $event->errorSlug;
        $component = $event->componentType ?? 'unknown';
        
        if ($errorType === 'unknown_prop') {
            $propKey = $event->context['unknown_prop_key'] ?? $event->context['key'] ?? null;
            if ($propKey) {
                $errorKey = "$component.$propKey";
                self::$propErrors[$errorKey] = [
                    'component' => $component,
                    'prop' => $propKey,
                    'available_props' => $event->context['available_props'] ?? [],
                    'suggested_props' => $event->context['suggested_props'] ?? []
                ];
            }
        } 
        elseif ($errorType === 'missing_required_prop') {
            $propKey = $event->context['missing_prop_name'] ?? $event->context['key'] ?? null;
            if ($propKey) {
                $errorKey = "$component.$propKey";
                self::$missingRequiredProps[$errorKey] = [
                    'component' => $component,
                    'prop' => $propKey
                ];
            }
        }
        elseif ($errorType === 'invalid_prop_type') {
            $propKey = $event->context['key'] ?? null;
            if ($propKey) {
                $errorKey = "$component.$propKey";
                self::$invalidPropTypes[$errorKey] = [
                    'component' => $component,
                    'prop' => $propKey,
                    'expected_type' => $event->context['expected_type'] ?? 'unknown',
                    'actual_type' => $event->context['actual_type'] ?? 'unknown'
                ];
            }
        }
        
        // Store component rule path for later usage in examples
        if (isset($event->context['component_rules_path']) && !isset(self::$propFormats[$component])) {
            self::$propFormats[$component] = [
                'rule_path' => $event->context['component_rules_path'],
                'component' => $component
            ];
        }
    }
    
    /**
     * Generate example templates from component rule structures
     */
    private function generateComponentExamples(): array
    {
        $examples = [];
        foreach (self::$propFormats as $component => $data) {
            $rulePath = $data['rule_path'] ?? null;
            if ($rulePath && file_exists($rulePath)) {
                try {
                    $ruleContent = json_decode(file_get_contents($rulePath), true);
                    $structure = $ruleContent['nestedValidation']['structure'] ?? [];
                    
                    if (isset($structure['props']['nestedValidation']['structure'])) {
                        $propsStructure = $structure['props']['nestedValidation']['structure'];
                        
                        // Create example template with proper structure and placeholders
                        $exampleProps = [];
                        foreach ($propsStructure as $propName => $propRule) {
                            $type = $propRule['type'] ?? 'any';
                            $required = $propRule['required'] ?? false;
                            
                            // Create appropriate placeholder based on type
                            $placeholder = match($type) {
                                'string' => '"value"',
                                'number' => '42',
                                'boolean' => 'true',
                                'array' => '[]',
                                'object' => '{}',
                                default => 'value'
                            };
                            
                            $exampleProps[$propName] = [
                                'placeholder' => $placeholder,
                                'required' => $required,
                                'type' => $type
                            ];
                        }
                        
                        $examples[$component] = [
                            'props' => $exampleProps,
                            'structure' => $structure
                        ];
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to generate example for $component: " . $e->getMessage());
                }
            }
        }
        return $examples;
    }

    /**
     * Handle validation completed event to output summary
     */
    public function handleValidationCompleted(ValidationCompletedEvent $event): void
    {
        if (empty(self::$propErrors) && empty(self::$missingRequiredProps) && empty(self::$invalidPropTypes)) {
            return;
        }
        
        $output = "\n\n=========== PROPERTY ERRORS SUMMARY ===========\n\n";
        
        // Generate component examples
        $examples = $this->generateComponentExamples();
        
        // Group errors by component for better readability
        $componentErrors = [];
        
        // Process unknown props
        foreach (self::$propErrors as $errorKey => $error) {
            $component = $error['component'];
            if (!isset($componentErrors[$component])) {
                $componentErrors[$component] = [
                    'unknown_props' => [],
                    'missing_props' => [],
                    'invalid_types' => []
                ];
            }
            $componentErrors[$component]['unknown_props'][] = $error;
        }
        
        // Process missing required props
        foreach (self::$missingRequiredProps as $errorKey => $error) {
            $component = $error['component'];
            if (!isset($componentErrors[$component])) {
                $componentErrors[$component] = [
                    'unknown_props' => [],
                    'missing_props' => [],
                    'invalid_types' => []
                ];
            }
            $componentErrors[$component]['missing_props'][] = $error;
        }
        
        // Process invalid type props
        foreach (self::$invalidPropTypes as $errorKey => $error) {
            $component = $error['component'];
            if (!isset($componentErrors[$component])) {
                $componentErrors[$component] = [
                    'unknown_props' => [],
                    'missing_props' => [],
                    'invalid_types' => []
                ];
            }
            $componentErrors[$component]['invalid_types'][] = $error;
        }
        
        // Create output for each component
        foreach ($componentErrors as $component => $errors) {
            $output .= "\nComponent: \033[1m{$component}\033[0m\n";
            $output .= "------------------------\n";
            
            // Show unknown props
            if (!empty($errors['unknown_props'])) {
                $output .= "Unknown props:\n";
                foreach ($errors['unknown_props'] as $error) {
                    $suggestions = !empty($error['suggested_props']) 
                        ? " (Did you mean: " . implode(', ', $error['suggested_props']) . "?)"
                        : "";
                    $output .= "  - {$error['prop']}{$suggestions}\n";
                }
            }
            
            // Show missing required props
            if (!empty($errors['missing_props'])) {
                $output .= "Missing required props:\n";
                foreach ($errors['missing_props'] as $error) {
                    $output .= "  - {$error['prop']}\n";
                }
            }
            
            // Show type errors
            if (!empty($errors['invalid_types'])) {
                $output .= "Invalid prop types:\n";
                foreach ($errors['invalid_types'] as $error) {
                    $output .= "  - {$error['prop']}: expected {$error['expected_type']}, got {$error['actual_type']}\n";
                }
            }
            
            // Show example for this component if available
            if (isset($examples[$component])) {
                $output .= "\nCorrect usage example:\n";
                $output .= $this->formatComponentExample($component, $examples[$component]);
            }
            
            $output .= "\n";
        }
        
        $output .= "=================================================\n";
        
        // Output to console
        echo $output;
    }
    
    /**
     * Format component example as JSON with proper structure
     */
    private function formatComponentExample(string $component, array $example): string
    {
        $structure = $example['structure'] ?? [];
        $propsData = $example['props'] ?? [];
        
        $exampleArray = [
            'type' => $component
        ];
        
        // Add required top-level elements
        foreach ($structure as $key => $rule) {
            if ($key === 'props') {
                if (!empty($propsData)) {
                    $formattedProps = [];
                    foreach ($propsData as $propName => $propInfo) {
                        if ($propInfo['required']) {
                            $formattedProps[$propName] = $propInfo['placeholder'];
                        }
                    }
                    
                    if (!empty($formattedProps)) {
                        $exampleArray['props'] = $formattedProps;
                    }
                }
            } 
            else if (($rule['required'] ?? false) === true && $key !== 'type') {
                $exampleType = $rule['type'] ?? 'any';
                
                // Create placeholder based on type
                $placeholder = match($exampleType) {
                    'string' => '"REQUIRED"',
                    'array' => '[]',
                    'object' => '{}',
                    default => 'REQUIRED'
                };
                
                $exampleArray[$key] = $placeholder;
            }
        }
        
        // Format as pretty JSON
        $jsonExample = json_encode($exampleArray, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        
        // Add comments for optional props
        $optionalProps = [];
        foreach ($propsData as $propName => $propInfo) {
            if (!($propInfo['required'])) {
                $optionalProps[] = "  // Optional: \"$propName\": {$propInfo['placeholder']} ({$propInfo['type']})";
            }
        }
        
        if (!empty($optionalProps)) {
            $jsonLines = explode("\n", $jsonExample);
            
            // Find position to insert optional props
            $propsPosition = -1;
            foreach ($jsonLines as $i => $line) {
                if (strpos($line, '"props"') !== false) {
                    $propsPosition = $i;
                    break;
                }
            }
            
            if ($propsPosition >= 0) {
                // Add comments after the props object closing brace
                $closePosition = $propsPosition + 1;
                while ($closePosition < count($jsonLines) && strpos($jsonLines[$closePosition], '}') === false) {
                    $closePosition++;
                }
                
                array_splice($jsonLines, $closePosition + 1, 0, $optionalProps);
            } else {
                // Add at the end before closing brace
                array_splice($jsonLines, count($jsonLines) - 1, 0, $optionalProps);
            }
            
            $jsonExample = implode("\n", $jsonLines);
        }
        
        return $jsonExample;
    }
    
    /**
     * Reset collected errors (for testing or between validation runs)
     */
    public static function reset(): void
    {
        self::$propErrors = [];
        self::$missingRequiredProps = [];
        self::$invalidPropTypes = [];
        self::$propFormats = [];
        self::$componentExamples = [];
    }
} 