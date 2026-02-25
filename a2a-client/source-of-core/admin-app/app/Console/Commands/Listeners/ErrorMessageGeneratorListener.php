<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use Illuminate\Support\Str;

/**
 * Listens for validation error events and generates human-readable messages
 */
class ErrorMessageGeneratorListener
{
    /**
     * Handle the error detected event.
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        $errorSlug = $event->errorSlug;
        $jsonPath = $event->jsonPath;
        $componentType = $event->componentType;
        
        // Parse the path to get the context (last segment, parent path)
        $segments = $jsonPath ? explode('.', $jsonPath) : [];
        $lastSegment = $segments ? array_pop($segments) : '';
        $parentPath = $segments ? implode('.', $segments) : '';
        
        // Format the component type for display
        $compStr = $componentType ? "'{$componentType}'" : 'component';
        
        // Generate appropriate message based on error type
        $message = $this->generateMessageForErrorType(
            $errorSlug, 
            $compStr, 
            $jsonPath, 
            $lastSegment, 
            $parentPath, 
            $event
        );
        
        // Store the message in the event context for later use
        if (!is_array($event->context)) {
            $event->context = [];
        }
        
        $event->context['message'] = $message;
        $event->message = $message; // Also set on the event directly for backward compatibility
        
        // Generate any suggestions if applicable
        $this->addSuggestionsToContext($event);
        
        Log::channel(Config::get('logging.default'))->debug(
            "[ErrorMessageGeneratorListener] Generated message for {$errorSlug} at {$jsonPath}: {$message}"
        );
    }
    
    /**
     * Generate a specific message for the given error type
     */
    private function generateMessageForErrorType(
        string $errorType, 
        string $compStr, 
        ?string $jsonPath, 
        string $lastSegment, 
        string $parentPath, 
        ErrorDetectedEvent $event
    ): string {
        switch ($errorType) {
            case 'unknown_key_at_component_level':
                return "Unknown key '{$lastSegment}' at {$compStr} level in " . ($parentPath ?: 'root node');
                
            case 'unknown_prop':
                $availableProps = isset($event->context['available_props']) ? array_values($event->context['available_props']) : [];
                $suggestedProps = isset($event->context['suggested_props']) ? array_values($event->context['suggested_props']) : [];
                
                $message = "Unknown property '{$event->context['key']}' in {$compStr}";
                
                if (!empty($suggestedProps)) {
                    $message .= ". Did you mean: " . implode(', ', $suggestedProps) . "?";
                }
                
                if (!empty($availableProps)) {
                    $propCount = count($availableProps);
                    if ($propCount <= 10) {
                        $message .= ". Allowed props: " . implode(', ', $availableProps);
                    } else {
                        $firstFew = array_slice($availableProps, 0, 5);
                        $message .= ". Allowed props include: " . implode(', ', $firstFew) . " and {$propCount} more...";
                    }
                }
                return $message;
                
            case 'prop_in_wrong_location':
                $correctLocation = $event->context['correct_location'] ?? 'another location';
                $modelPath = $event->context['model_path'] ?? null;
                $propKey = $event->context['key'] ?? $lastSegment;
                
                $message = "Property '{$propKey}' should be defined in the '{$correctLocation}' object, not in props";
                if ($modelPath) {
                    $message .= ". Move to: {$modelPath}.{$propKey}";
                }
                return $message;
                
            case 'prop_likely_misplaced':
                $location = $event->context['potential_location'] ?? 'another location';
                $suggestedPath = $event->context['suggested_path'] ?? null;
                $propKey = $event->context['key'] ?? $lastSegment;
                
                $message = "Property '{$propKey}' may belong in '{$location}' not 'props' for {$compStr}";
                if ($suggestedPath) {
                    $message .= ". Consider: {$suggestedPath}.{$propKey}";
                }
                return $message;
                
            case 'missing_required_prop':
                $propKey = $event->context['key'] ?? $lastSegment;
                return "Missing required property '{$propKey}' in {$compStr}";
                
            case 'unknown_component_type':
                $suggestions = isset($event->context['suggested_types']) ? array_values($event->context['suggested_types']) : [];
                $message = "Unknown component type {$compStr}";
                if (!empty($suggestions)) {
                    $message .= ". Did you mean: " . implode(', ', $suggestions) . "?";
                }
                return $message;
                
            case 'invalid_prop_type':
                $expectedType = $event->context['expected_type'] ?? 'proper type';
                $actualType = $event->context['actual_type'] ?? 'invalid type';
                $propKey = $event->context['key'] ?? $lastSegment;
                
                if (is_array($expectedType)) {
                    $expectedType = implode('|', $expectedType);
                }
                
                return "Invalid type for '{$propKey}' in {$compStr}: expected {$expectedType}, got {$actualType}";
                
            case 'empty_string_not_allowed':
                $propKey = $event->context['key'] ?? $lastSegment;
                return "Empty string not allowed for '{$propKey}' in {$compStr}";
                
            case 'empty_array_not_allowed':
                $propKey = $event->context['key'] ?? $lastSegment;
                return "Empty array not allowed for '{$propKey}' in {$compStr}";
                
            case 'invalid_props_type':
                return "Invalid 'props' type in {$compStr} - must be an object";
                
            case 'json_syntax_error':
                $file = basename($event->filePath ?? 'unknown');
                $syntaxMessage = $event->message ?: 'Syntax error';
                return "JSON syntax error in file {$file}: {$syntaxMessage}";
                
            case 'array_too_few_items':
                $propKey = $event->context['key'] ?? $lastSegment;
                $minItems = $event->context['minItems'] ?? 0;
                $actualCount = $event->context['actual_count'] ?? 0;
                return "Array '{$propKey}' in {$compStr} has too few items: {$actualCount}, minimum required: {$minItems}";
                
            case 'invalid_prop_option':
                $propKey = $event->context['key'] ?? $lastSegment;
                $actualValue = $event->context['actual_value'] ?? '';
                $options = $event->context['options'] ?? [];
                
                $message = "Invalid value '{$actualValue}' for '{$propKey}' in {$compStr}";
                if (!empty($options) && count($options) <= 8) {
                    $message .= ". Allowed values: " . implode(', ', $options);
                }
                return $message;
                
            case 'invalid_prop_pattern':
                $propKey = $event->context['key'] ?? $lastSegment;
                $pattern = $event->context['pattern'] ?? '';
                return "Value of '{$propKey}' in {$compStr} does not match required pattern: {$pattern}";
                
            case 'prop_too_short':
                $propKey = $event->context['key'] ?? $lastSegment;
                $minLength = $event->context['min_length'] ?? 0;
                $actualLength = $event->context['actual_length'] ?? 0;
                return "Property '{$propKey}' in {$compStr} is too short: length {$actualLength}, minimum required: {$minLength}";
                
            case 'prop_too_long':
                $propKey = $event->context['key'] ?? $lastSegment;
                $maxLength = $event->context['max_length'] ?? 0;
                $actualLength = $event->context['actual_length'] ?? 0;
                return "Property '{$propKey}' in {$compStr} is too long: length {$actualLength}, maximum allowed: {$maxLength}";
                
            case 'prop_too_small':
                $propKey = $event->context['key'] ?? $lastSegment;
                $minValue = $event->context['min_value'] ?? 0;
                $actualValue = $event->context['actual_value'] ?? 0;
                return "Property '{$propKey}' in {$compStr} is too small: {$actualValue}, minimum required: {$minValue}";
                
            case 'prop_too_large':
                $propKey = $event->context['key'] ?? $lastSegment;
                $maxValue = $event->context['max_value'] ?? 0;
                $actualValue = $event->context['actual_value'] ?? 0;
                return "Property '{$propKey}' in {$compStr} is too large: {$actualValue}, maximum allowed: {$maxValue}";
                
            case 'missing_required_key':
                $missingKey = $event->context['missing_key'] ?? $event->context['key'] ?? 'unknown key';
                return "Component '{$compStr}' is missing required key: '{$missingKey}'";
                
            case 'unknown_prop':
                $propKey = $event->context['unknown_prop_key'] ?? $event->context['key'] ?? 'unknown';
                return "Unknown property '{$propKey}' for component '{$compStr}'";
                
            case 'missing_required_prop':
                $propName = $event->context['missing_prop_name'] ?? $event->context['key'] ?? 'unknown';
                return "Component '{$compStr}' is missing required property: '{$propName}'";
                
            case 'invalid_prop_type':
                $propName = $event->context['key'] ?? 'unknown';
                $expectedType = $event->context['expected_type'] ?? 'unknown';
                $actualType = $event->context['actual_type'] ?? 'unknown';
                return "Property '{$propName}' for component '{$compStr}' should be of type '{$expectedType}' but got '{$actualType}'";
                
            case 'component_file_missing':
                $componentName = $event->context['component_name'] ?? $compStr;
                return "Component file '{$componentName}.vue' not found in source directories";
                
            case 'unknown_component_type':
                return "Unknown component type: '{$compStr}'";
                
            case 'instructions_definition_missing':
                return "Component '{$compStr}' has 'instructions' but no definition for it in component rules";
                
            case 'children_definition_missing':
                return "Component '{$compStr}' has 'children' but no definition for it in component rules";
                
            case 'model_definition_missing':
                return "Component '{$compStr}' has 'model' but no definition for it in component rules";
                
            case 'slots_definition_missing':
                return "Component '{$compStr}' has 'slots' but no definition for it in component rules";
                
            case 'invalid_props_type':
                return "Component '{$compStr}' has 'props' with invalid type (expected object)";
                
            case 'unknown_key_at_component_level':
                $key = $event->context['key'] ?? 'unknown';
                return "Unknown key '{$key}' at component level for '{$compStr}'";
                
            case 'json_syntax_error':
                $event->message = "JSON syntax error: " . Str::limit($event->message, 100);
                return $event->message;
                
            case 'file_read_error_or_not_found':
                $file = $event->context['offending_file'] ?? 'unknown';
                return "File could not be read or not found: {$file}";
                
            case 'invalid_child_type':
                $expectedType = $event->context['expected_type'] ?? 'a valid type';
                $actualType = $event->context['actual_type'] ?? 'an invalid type';
                $key = $event->context['key'] ?? $lastSegment;

                if (is_array($expectedType)) {
                    $expectedType = implode('|', $expectedType);
                }
                // Get the actual value's type. If it's an array and not a sequential list, treat as 'object'.
                $actualValue = $event->context['actual_value'] ?? null;
                $actualTypeDisplay = gettype($actualValue);
                if ($actualTypeDisplay === 'array') {
                    if (!empty($actualValue) && array_keys($actualValue) !== range(0, count($actualValue) - 1)) {
                        $actualTypeDisplay = 'object';
                    } else {
                        $actualTypeDisplay = 'array'; // Explicitly array if it's sequential or empty
                    }
                } else if ($actualTypeDisplay === 'NULL') {
                    $actualTypeDisplay = 'null';
                }

                $actualValueDisplay = '';
                if ($actualTypeDisplay === 'null' || $actualValue === null) {
                    $actualValueDisplay = ' (no value provided)';
                } elseif (is_scalar($actualValue)) {
                    $actualValueDisplay = " (found: " . json_encode($actualValue) . ")";
                }

                return "Invalid child type for '{$key}' in {$compStr} at path '{$jsonPath}'. Expected {$expectedType}, but found {$actualTypeDisplay}{$actualValueDisplay}.";

            case 'invalid_json_root_type':
                $expectedType = $event->context['expected_type'] ?? 'array or object';
                $actualValue = $event->context['actual_value'] ?? null;
                $actualTypeDisplay = gettype($actualValue);
                if ($actualTypeDisplay === 'NULL') {
                    $actualTypeDisplay = 'null';
                }
                return "Invalid JSON root type: expected {$expectedType}, but found {$actualTypeDisplay}.";
                
            default:
                // Format generic error messages using the error type as a base
                $errorName = str_replace('_', ' ', $errorType);
                $errorName = ucfirst($errorName);
                return "{$errorName} in {$compStr}" . ($jsonPath ? " at {$jsonPath}" : "");
        }
    }
    
    /**
     * Add suggestions to the event context if applicable
     */
    private function addSuggestionsToContext(ErrorDetectedEvent $event): void
    {
        $errorSlug = $event->errorSlug;
        $suggestions = [];
        
        switch ($errorSlug) {
            case 'unknown_prop':
                if (!empty($event->context['suggested_props'])) {
                    $suggestions[] = [
                        'type' => 'alternative',
                        'message' => 'Use one of the suggested properties: ' . implode(', ', $event->context['suggested_props']),
                        'severity' => 'suggestion'
                    ];
                }
                break;
                
            case 'prop_in_wrong_location':
                $correctLocation = $event->context['correct_location'] ?? null;
                $modelPath = $event->context['model_path'] ?? null;
                $propKey = $event->context['key'] ?? null;
                
                if ($correctLocation && $modelPath && $propKey) {
                    $suggestions[] = [
                        'type' => 'move',
                        'message' => "Move '{$propKey}' from props to {$correctLocation}: {$modelPath}.{$propKey}",
                        'severity' => 'warning',
                        'source' => 'props.' . $propKey,
                        'target' => $modelPath . '.' . $propKey
                    ];
                }
                break;
                
            case 'unknown_component_type':
                if (!empty($event->context['suggested_types'])) {
                    $suggestions[] = [
                        'type' => 'replace',
                        'message' => 'Use one of the suggested component types: ' . implode(', ', $event->context['suggested_types']),
                        'severity' => 'warning'
                    ];
                }
                break;
                
            // Add more cases for other error types as needed
        }
        
        if (!empty($suggestions)) {
            $event->context['suggestions'] = $suggestions;
        }
    }
} 