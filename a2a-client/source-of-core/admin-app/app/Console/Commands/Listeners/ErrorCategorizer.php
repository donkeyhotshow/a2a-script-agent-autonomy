<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;

/**
 * Listener that categorizes errors by type, severity, and component
 * Moves categorization logic from ValidationEventCollector to a dedicated listener
 */
class ErrorCategorizer
{
    // Error severity categories
    public const ERROR_CRITICAL = 1;   // Fatal errors that must be fixed
    public const ERROR_MAJOR = 2;      // Major structural issues
    public const ERROR_WARNING = 3;    // Problems that might cause unexpected behavior
    public const ERROR_NOTICE = 4;     // Minor issues or style suggestions
    public const ERROR_INFO = 5;       // Informational messages

    // Error type categories for better organization
    public const CATEGORY_STRUCTURE = 'structure';
    public const CATEGORY_PROPS = 'props';
    public const CATEGORY_COMPONENT = 'component';
    public const CATEGORY_JSON = 'json';
    public const CATEGORY_FILE = 'file';
    
    /**
     * Handle the error detected event.
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        $errorSlug = $event->errorSlug;
        
        // 1. Determine error category (structure, props, component, etc.)
        $category = $this->categorizeError($errorSlug);
        
        // 2. Determine error severity level
        $severityLevel = $this->determineErrorLevel($errorSlug, $event->componentType);
        
        // 3. Add this metadata to the event context
        if (!is_array($event->context)) {
            $event->context = [];
        }
        
        $event->context['category'] = $category;
        $event->context['severity_level'] = $severityLevel;
        $event->context['severity_name'] = $this->getSeverityLevelName($severityLevel);
        
        // 4. Record statistics in ValidationEventCollector
        ValidationEventCollector::recordErrorStats($errorSlug, $category, $severityLevel, $event->componentType);
        
        Log::channel(Config::get('logging.default'))->debug(
            "[ErrorCategorizer] Categorized {$errorSlug} as {$category} with severity {$severityLevel}"
        );
    }
    
    /**
     * Categorize errors into logical groups
     * 
     * @param string $errorName Error type identifier
     * @return string Category identifier
     */
    public function categorizeError(string $errorName): string
    {
        $propsErrors = [
            'unknown_prop', 'prop_in_wrong_location', 'prop_likely_misplaced',
            'missing_required_prop', 'invalid_prop_type', 'empty_string_not_allowed',
            'empty_array_not_allowed', 'invalid_props_type'
        ];
        
        $structureErrors = [
            'unknown_key_at_component_level', 'missing_required_key',
            'missing_required_key_in_nested_object', 'unknown_key_in_nested_object',
            'invalid_child_type', 'invalid_children_type', 'invalid_slots_type',
            'missing_slot_definition', 'unknown_slot_name', 'missing_required_slot',
            'children_definition_missing', 'model_definition_missing', 'slots_definition_missing'
        ];
        
        $componentErrors = [
            'unknown_component_type', 'missing_or_invalid_type', 'component_child_type_disallowed'
        ];
        
        $jsonErrors = [
            'json_syntax_error', 'invalid_json_root_type', 'json_decode_error'
        ];
        
        $fileErrors = [
            'file_read_error', 'file_read_error_or_not_found', 'file_processing_error'
        ];
        
        if (in_array($errorName, $propsErrors)) return self::CATEGORY_PROPS;
        if (in_array($errorName, $structureErrors)) return self::CATEGORY_STRUCTURE;
        if (in_array($errorName, $componentErrors)) return self::CATEGORY_COMPONENT;
        if (in_array($errorName, $jsonErrors)) return self::CATEGORY_JSON;
        if (in_array($errorName, $fileErrors)) return self::CATEGORY_FILE;
        
        return 'other';
    }
    
    /**
     * Determine error severity level
     * 
     * @param string $errorName Error type identifier
     * @param string|null $componentType Component type if available
     * @return int Severity level (1-5, where 1 is most severe)
     */
    public function determineErrorLevel(string $errorName, ?string $componentType): int
    {
        // Critical errors (level 1)
        $criticalErrors = [
            'json_syntax_error', 'file_read_error', 'file_read_error_or_not_found'
        ];
        
        // Major errors (level 2)
        $majorErrors = [
            'unknown_component_type', 'missing_or_invalid_type', 'missing_required_key',
            'missing_required_prop', 'component_child_type_disallowed'
        ];
        
        // Warning errors (level 3)
        $warningErrors = [
            'unknown_key_at_component_level', 'unknown_prop', 'prop_in_wrong_location',
            'invalid_prop_type', 'invalid_child_type'
        ];
        
        // Notice errors (level 4)
        $noticeErrors = [
            'empty_string_not_allowed', 'empty_array_not_allowed', 'prop_likely_misplaced'
        ];
        
        // Component-specific severity overrides
        $componentOverrides = [
            // Example: these components have stricter rules
            'datatable' => [
                'unknown_prop' => self::ERROR_MAJOR, // Upgrade severity for DataTable props
                'invalid_prop_type' => self::ERROR_MAJOR
            ],
            'select' => [
                'prop_in_wrong_location' => self::ERROR_MAJOR // Upgrading this error for Select is important
            ]
        ];
        
        // Check component-specific overrides first
        if ($componentType && isset($componentOverrides[strtolower($componentType)])) {
            $componentRules = $componentOverrides[strtolower($componentType)];
            if (isset($componentRules[$errorName])) {
                return $componentRules[$errorName];
            }
        }
        
        // Then check general error type severities
        if (in_array($errorName, $criticalErrors)) return self::ERROR_CRITICAL;
        if (in_array($errorName, $majorErrors)) return self::ERROR_MAJOR;
        if (in_array($errorName, $warningErrors)) return self::ERROR_WARNING;
        if (in_array($errorName, $noticeErrors)) return self::ERROR_NOTICE;
        
        // Default severity
        return self::ERROR_INFO;
    }
    
    /**
     * Get human-readable name for severity level
     * 
     * @param int $level Severity level
     * @return string Human-readable name
     */
    public function getSeverityLevelName(int $level): string
    {
        $names = [
            self::ERROR_CRITICAL => 'CRITICAL',
            self::ERROR_MAJOR => 'MAJOR',
            self::ERROR_WARNING => 'WARNING',
            self::ERROR_NOTICE => 'NOTICE',
            self::ERROR_INFO => 'INFO'
        ];
        
        return $names[$level] ?? "Level {$level}";
    }
} 