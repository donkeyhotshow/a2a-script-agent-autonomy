<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

class ErrorMessageGenerator
{
    /**
     * Generate a technical error message with minimal formatting
     * 
     * @param string $errorCode The error code
     * @param array $details Error details
     * @return string Technical error message
     */
    public static function generateTechnicalMessage(string $errorCode, array $details): string
    {
        // Normalize error codes for better specificity
        $errorCode = self::normalizeErrorCode($errorCode, $details);
        
        // Ensure basic details are present
        $component = $details['component'] ?? $details['component_type'] ?? 'unknown_component';
        $key = $details['key'] ?? $details['path'] ?? 'unknown_path';
        
        // Create a technical representation of the error
        $message = "{$errorCode}::{$component}::{$key}";
        
        // Add actual/expected values when available
        if (isset($details['actual_type']) && isset($details['expected_type'])) {
            $expectedType = is_array($details['expected_type']) 
                ? json_encode($details['expected_type']) 
                : $details['expected_type'];
            $actualType = is_array($details['actual_type']) 
                ? json_encode($details['actual_type']) 
                : $details['actual_type'];
            $message .= "::expected={$expectedType},actual={$actualType}";
        } else if (isset($details['actual_value'])) {
            $actualValueDisplay = is_scalar($details['actual_value']) 
                ? var_export($details['actual_value'], true)
                : (is_array($details['actual_value']) ? json_encode($details['actual_value']) : gettype($details['actual_value']));
            $message .= "::actual_value={$actualValueDisplay}";
            
            if (!empty($details['options']) && is_array($details['options'])) {
                $optionsString = implode(',', array_map(function($opt) {
                    if (is_scalar($opt)) {
                        return var_export($opt, true);
                    } elseif (is_array($opt)) {
                        return json_encode($opt);
                    } else {
                        return gettype($opt);
                    }
                }, $details['options']));
                $message .= ",options=[{$optionsString}]";
            }
        }
        
        // Add reason for contextual errors
        if (isset($details['reason'])) {
            $reason = is_array($details['reason']) 
                ? json_encode($details['reason']) 
                : $details['reason'];
            $message .= "::reason={$reason}";
        }
        
        return $message;
    }
    
    /**
     * Normalize error codes for better specificity
     * 
     * @param string $errorCode Original error code
     * @param array $details Error details
     * @return string Normalized error code
     */
    private static function normalizeErrorCode(string $errorCode, array $details): string
    {
        // Distinguish between missing_type and invalid_type
        if ($errorCode === 'missing_or_invalid_type') {
            // If component is 'unknown', it's likely a missing type
            if (isset($details['component']) && $details['component'] === 'unknown') {
                return 'missing_type';
            }
            
            // If there's an actual_type but it doesn't match expected_type, it's invalid
            if (isset($details['actual_type']) && isset($details['expected_type'])) {
                return 'invalid_type';
            }
            
            // If path contains 'type' and the error is about a type property
            if (isset($details['key']) && $details['key'] === 'type') {
                // Check if the type property exists but is null/empty or if it's truly missing
                if (array_key_exists('actual_value', $details)) {
                    // Type exists but is invalid (null, empty, wrong format)
                    if (empty($details['actual_value'])) {
                        return 'empty_type';
                    }
                    return 'invalid_type';
                }
                return 'missing_type';
            }
        }
        
        return $errorCode;
    }
    
    /**
     * Generate detailed information for debugging
     * 
     * @param array $details Error details
     * @return array Technical representation of error details
     */
    public static function getDetailedInfo(array $details): array
    {
        // Process and clean any array values for consistent output
        $expectedType = isset($details['expected_type']) 
            ? (is_array($details['expected_type']) ? json_encode($details['expected_type']) : $details['expected_type'])
            : null;
            
        $actualType = isset($details['actual_type']) 
            ? (is_array($details['actual_type']) ? json_encode($details['actual_type']) : $details['actual_type'])
            : null;
            
        $actualValue = isset($details['actual_value']) 
            ? (is_array($details['actual_value']) ? json_encode($details['actual_value']) : $details['actual_value'])
            : null;
            
        $options = isset($details['options']) 
            ? (is_array($details['options']) ? json_encode($details['options']) : $details['options'])
            : null;
            
        $reason = isset($details['reason']) 
            ? (is_array($details['reason']) ? json_encode($details['reason']) : $details['reason'])
            : null;
            
        return [
            'error_type' => self::normalizeErrorCode($details['error_type'] ?? 'unknown_error_type', $details),
            'component' => $details['component'] ?? $details['component_type'] ?? 'unknown_component',
            'path' => $details['path'] ?? 'unknown_path',
            'key' => $details['key'] ?? null,
            'expected_type' => $expectedType,
            'actual_type' => $actualType,
            'actual_value' => $actualValue,
            'options' => $options,
            'reason' => $reason,
            'file' => $details['file'] ?? null,
        ];
    }
} 