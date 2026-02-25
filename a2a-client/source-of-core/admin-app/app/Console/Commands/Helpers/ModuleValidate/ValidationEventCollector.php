<?php
namespace App\Console\Commands\Helpers\ModuleValidate;
use App\Hooks\FileFacade as FileFacade;

/**
 * Collects and manages validation events (errors, warnings, etc.).
 * This class is intended to be a central point for gathering all validation-related findings.
 */
class ValidationEventCollector
{
    public static array $errors = [];
    public static array $suggestions = [];
    public static array $docs = [];
    public static array $sources = [];
    public static array $cardCache = [];
    public static array $errorsByLevel = [];
    public static array $errorsByType = [];
    public static array $errorsByComponent = [];
    public static array $relatedFiles = [];
    public static ?int $minErrorLevel = null;
    public const DEFAULT_LEVEL = 5;
    
    public const ERROR_CRITICAL = 5;
    public const ERROR_MAJOR = 4;
    public const ERROR_WARNING = 3;
    public const ERROR_NOTICE = 2;
    public const ERROR_INFO = 1;
    public const ERROR_NONE = 0;
    
    public const TYPE_SYNTAX = 'syntax';
    public const TYPE_STRUCTURE = 'structure';
    public const TYPE_PROPERTY = 'property';
    public const TYPE_DATA = 'data_integrity';
    public const TYPE_MODEL = 'model_validation';
    public const TYPE_CONTEXT = 'contextual';
    public const TYPE_SYSTEM = 'system'; 
    
    // Category constants for reporting
    public const CATEGORY_STRUCTURE = 'structure';
    public const CATEGORY_PROPS = 'props';
    public const CATEGORY_COMPONENT = 'component';
    public const CATEGORY_JSON = 'json';
    public const CATEGORY_FILE = 'file';
    
    public static array $errorsByCategory = [];
    public static array $errorsBySeverity = [];
    public static array $componentErrorCounts = [];
    public static array $errorsByModule = [];
    public static array $componentTypesWithErrors = []; 
    public static array $collectedEvents = [];
    public static bool $isInitialized = false;
    public static int $errorCounter = 0;
    public static int $warningCounter = 0;
    public static int $noticeCounter = 0;
    
    public static array $moduleErrorCounts = [];

    public static function initialize(): void
    {
        self::$collectedEvents = [
            self::ERROR_CRITICAL => [],
            self::ERROR_MAJOR => [],
            self::ERROR_WARNING => [],
            self::ERROR_NOTICE => [],
            self::ERROR_INFO => [],
        ];
        self::$errorCounter = 0;
        self::$warningCounter = 0;
        self::$noticeCounter = 0;
        self::$moduleErrorCounts = [];
        self::$isInitialized = true;
    }
    public static function addError(
        string $slug,
        string $moduleName,
        string $filePath,
        string $jsonPath,
        string $message,
        int    $severity = self::ERROR_MAJOR, 
        string $type = self::TYPE_STRUCTURE, 
        ?array $context = null,
        ?string $componentType = null,
        ?string $fixSuggestion = null,
        ?string $ruleSource = null 
    ): void
    {
        if (!self::$isInitialized) {
            self::initialize();
        }
        if (!isset(self::$collectedEvents[$severity])) {
            $severity = self::ERROR_WARNING; 
        }
        $event = [
            'slug' => $slug,
            'moduleName' => $moduleName,
            'filePath' => $filePath,
            'jsonPath' => $jsonPath,
            'message' => $message,
            'severity' => $severity,
            'type' => $type,
            'context' => $context,
            'componentType' => $componentType,
            'fixSuggestion' => $fixSuggestion,
            'ruleSource' => $ruleSource,
            'timestamp' => microtime(true) 
        ];
        self::$collectedEvents[$severity][] = $event;
        
        if ($severity >= self::ERROR_WARNING) { 
            self::$warningCounter++; 
        }
        if ($severity >= self::ERROR_MAJOR) { 
            self::$errorCounter++;
            if (!isset(self::$moduleErrorCounts[$moduleName])) {
                self::$moduleErrorCounts[$moduleName] = 0;
            }
            self::$moduleErrorCounts[$moduleName]++;
        }
        if ($severity === self::ERROR_NOTICE) {
            self::$noticeCounter++;
        }
    }
    public static function getCollectedEvents(): array
    {
        return self::$collectedEvents;
    }
    public static function getTotalErrors(): int
    {
        return self::$errorCounter;
    }
    public static function getTotalWarnings(): int
    {
        return self::$warningCounter;
    }
    public static function getTotalNotices(): int
    {
        return self::$noticeCounter;
    }
    public static function getModuleErrorCounts(): array
    {
        return self::$moduleErrorCounts;
    }
    public static function hasCriticalErrors(): bool
    {
        return !empty(self::$collectedEvents[self::ERROR_CRITICAL]);
    }
    public static function hasMajorErrors(): bool
    {
        return !empty(self::$collectedEvents[self::ERROR_MAJOR]);
    }
    public static function reset(): void
    {
        self::initialize();
        // Clear stored error details and related collections
        self::$errors = [];
        self::$suggestions = [];
        self::$docs = [];
        self::$sources = [];
        // Note: counters and collectedEvents already reset by initialize()
    }
    /**
     * Generates a summary of collected validation events.
     *
     * @return string A formatted string summarizing the validation results.
     */
    public static function getSummary(): string
    {
        $summary = "Validation Summary:\n";
        $summary .= "Total Errors (Major/Critical): " . self::getTotalErrors() . "\n";
        $summary .= "Total Warnings: " . self::getTotalWarnings() . "\n";
        $summary .= "Total Notices: " . self::getTotalNotices() . "\n";
        if (self::getTotalErrors() > 0) {
            $summary .= "Errors by Module:\n";
            foreach (self::$moduleErrorCounts as $module => $count) {
                $summary .= "  - {$module}: {$count}\n";
            }
        }
        return $summary;
    }
    public static function processErrorEvent($event)
    {
        $errorName = $event->errorSlug ?? ($event->errorName ?? 'unknown_error');
        $componentType = $event->componentType ?? ($event->context['componentType'] ?? null);
        $jsonPath = $event->jsonPath ?? null;
        $filePath = $event->originalFile ?? $event->filePath ?? null;
        $moduleName = $event->moduleName ?? 'unknown_module'; 
        
        $errorCategory = self::categorizeError($errorName);
        
        $segments = $jsonPath ? explode('.', $jsonPath) : [];
        $last = $segments ? array_pop($segments) : '';
        $parentPath = $segments ? implode('.', $segments) : '';
        
        $humanMessage = self::generateHumanMessage($errorName, $componentType, $jsonPath, $last, $parentPath, $event);
        
        $cardData = [];
        if ($componentType) {
            $cardData = self::loadCardData($componentType);
        }
        
        $errorLevel = self::determineErrorLevel($errorName, $cardData);
        // Record the error into counters and collectedEvents
        self::addError(
            $errorName,
            $moduleName,
            $filePath,
            $jsonPath,
            $event->message ?? '',
            $errorLevel,
            $errorCategory,
            $event->context ?? [],
            $componentType
        );

        if (self::$minErrorLevel === null || $errorLevel < self::$minErrorLevel) {
            self::$minErrorLevel = $errorLevel;
        }
        $errorDetails = [
            'errorName' => $errorName,
            'componentType' => $componentType,
            'jsonPath' => $jsonPath,
            'originalFile' => $filePath,
            'message' => $event->message ?? '',
            'humanMessage' => $humanMessage,
            'card' => $cardData,
            'docs' => $event->context['docs'] ?? [],
            'docText' => $event->context['docText'] ?? null,
            'example' => $event->context['example'] ?? null,
            'level' => $errorLevel,
            'category' => $errorCategory,
            'context' => $event->context ?? [], 
        ];
        self::$errors[] = $errorDetails;
        self::$errorsByLevel[$errorLevel][] = $errorDetails;
        self::$errorsByType[$errorName][] = $errorDetails;
        
        if ($componentType) {
            self::$errorsByComponent[$componentType][] = $errorDetails;
            
            $componentTypeLower = strtolower($componentType);
            if (!isset(self::$componentTypesWithErrors[$componentTypeLower])) {
                self::$componentTypesWithErrors[$componentTypeLower] = true;
            }
        }
        if ($filePath) {
            self::$relatedFiles[$filePath] = (self::$relatedFiles[$filePath] ?? 0) + 1;
        }
        
        if ($moduleName !== 'unknown_module') {
            if (!isset(self::$errorsByModule[$moduleName])) {
                self::$errorsByModule[$moduleName] = 0;
            }
            self::$errorsByModule[$moduleName]++;
        }
    }
    public static function handleSuggestion($event) { self::$suggestions[] = $event; }
    public static function handleDoc($event) { self::$docs[] = $event; }
    public static function handleSource($event) { self::$sources[] = $event; }
    
    public static function getAllCollectedData(): array 
    {
        return [
            'errors' => self::$errors, 
            'suggestions' => self::$suggestions,
            'docs' => self::$docs,
            'sources' => self::$sources,
        ];
    }
    
    public static function getMinErrorLevel(): ?int
    {
        return self::$minErrorLevel;
    }
    
    /**
     * Gets errors for a specific level.
     *
     * @param int $level The error level to filter by
     * @return array Array of errors matching the specified level
     */
    public static function getErrorsForLevel(int $level): array
    {
        $filteredErrors = [];
        
        foreach (self::$errors as $error) {
            $errorLevel = $error['level'] ?? 5; // Default to level 5 if not specified
            
            // Only include errors of the specified level or unknown component types
            if ($errorLevel === $level || ($error['error_type'] ?? '') === 'unknown_component_type') {
                $filteredErrors[] = $error;
            }
        }
        
        return $filteredErrors;
    }
    
    /**
     * Gets component level from the component validation rules.
     * 
     * @param string $componentType The component type to get level for
     * @return int|null The component level or null if not found
     */
    public static function getComponentLevel(string $componentType): ?int
    {
        $componentRulesPath = base_path('install-modules/aiCore/validation/components/' . $componentType . '.json');
        
        if (file_exists($componentRulesPath)) {
            try {
                $componentRules = json_decode(file_get_contents($componentRulesPath), true);
                if (isset($componentRules['level']) && is_numeric($componentRules['level'])) {
                    return (int)$componentRules['level'];
                }
            } catch (\Exception $e) {
                // Fail silently and return null
            }
        }
        
        return null;
    }
    
    /**
     * Handle error event and collect the error data.
     *
     * @param object $event The error event
     */
    public static function handleError(ErrorDetectedEvent $event): void
    {
        if (!self::$isInitialized) {
            self::initialize();
        }

        // Increment error counter
        self::$errorCounter++;
        
        // Store the error
        $errorDetails = [
            'errorSlug' => $event->errorSlug,
            'componentType' => $event->componentType,
            'jsonPath' => $event->jsonPath,
            'message' => $event->message,
            'timestamp' => now()->toIso8601String(),
            'file' => $event->file,
            'line' => $event->line,
            'context' => $event->context
        ];

        self::$errors[] = $errorDetails;

        // Log the error if log path is set
        if (self::$logPath) {
            $logMessage = self::formatErrorForLog($errorDetails);
            file_put_contents(self::$logPath, $logMessage . PHP_EOL, FILE_APPEND);
        }
    }

    private static function formatErrorForLog(array $errorDetails): string
    {
        return sprintf(
            "[%s] %s: %s in %s:%d\nContext: %s\nPath: %s\nComponent: %s\n",
            $errorDetails['timestamp'],
            $errorDetails['errorSlug'],
            $errorDetails['message'],
            $errorDetails['file'],
            $errorDetails['line'],
            json_encode($errorDetails['context']),
            $errorDetails['jsonPath'],
            $errorDetails['componentType']
        );
    }

    public static function getAllErrors(): array
    {
        return self::$errors;
    }
    
    /**
     * Load component validation schema ('card') from JSON file and cache it.
     */
    private static function loadCardData(string $componentType): array
    {
        $key = strtolower($componentType);
        if (isset(self::$cardCache[$key])) {
            return self::$cardCache[$key];
        }
        
        $path = base_path('install-modules/aiCore/validation/components/' . $componentType . '.json');
        
        $card = [];
        try {
            if (FileFacade::exists($path)) {
                $content = FileFacade::get($path);
                try {
                    $card = json_decode($content, true, 512, JSON_THROW_ON_ERROR) ?: [];
                } catch (\JsonException $e) {
                    // Handle JSON decode errors
                }
            }
        } catch (\Throwable $e) {
            // Handle file read errors
        }
        
        self::$cardCache[$key] = $card;
        return $card;
    }
    
    /**
     * Categorize errors into logical groups 
     */
    private static function categorizeError(string $errorName): string
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
        
        if (in_array($errorName, $propsErrors)) return self::TYPE_PROPERTY;
        if (in_array($errorName, $structureErrors)) return self::TYPE_STRUCTURE;
        if (in_array($errorName, $componentErrors)) return self::TYPE_MODEL;
        if (in_array($errorName, $jsonErrors)) return self::TYPE_SYNTAX;
        if (in_array($errorName, $fileErrors)) return self::TYPE_SYSTEM;
        
        return 'other';
    }
    
    /**
     * Determine error severity level
     */
    private static function determineErrorLevel(string $errorName, array $cardData): int
    {
        if (isset($cardData['level']) && is_numeric($cardData['level'])) {
            return (int)$cardData['level'];
        }
        
        
        $criticalErrors = [
            'json_syntax_error', 'file_read_error', 'file_read_error_or_not_found'
        ];
        
        $majorErrors = [
            'unknown_component_type', 'missing_or_invalid_type', 'missing_required_key',
            'missing_required_prop', 'component_child_type_disallowed'
        ];
        
        $warningErrors = [
            'unknown_key_at_component_level', 'unknown_prop', 'prop_in_wrong_location',
            'invalid_prop_type', 'invalid_child_type'
        ];
        
        $noticeErrors = [
            'empty_string_not_allowed', 'empty_array_not_allowed', 'prop_likely_misplaced'
        ];
        
        if (in_array($errorName, $criticalErrors)) return self::ERROR_CRITICAL;
        if (in_array($errorName, $majorErrors)) return self::ERROR_MAJOR;
        if (in_array($errorName, $warningErrors)) return self::ERROR_WARNING;
        if (in_array($errorName, $noticeErrors)) return self::ERROR_NOTICE;
        
        return self::DEFAULT_LEVEL;
    }
    
    /**
     * Generate human-readable error message
     */
    private static function generateHumanMessage(string $errorName, ?string $componentType, ?string $jsonPath, string $last, string $parentPath, $event): string
    {
        $compStr = $componentType ? "'{$componentType}'" : 'component';
        
        switch ($errorName) {
            case 'unknown_key_at_component_level':
                return "Unknown key '{$last}' at {$compStr} level in " . ($parentPath ?: 'root node');
                
            case 'unknown_prop':
                $availableProps = isset($event->context['available_props']) ? array_values($event->context['available_props']) : [];
                $message = "Unknown property '{$last}' for {$compStr}";
                if (count($availableProps) <= 5) {
                    $message .= !empty($availableProps) ? ". Available: " . implode(', ', $availableProps) : "";
                }
                return $message;
                
            case 'prop_in_wrong_location':
            case 'prop_likely_misplaced':
                $location = $event->context['correct_location'] ?? $event->context['potential_location'] ?? 'another location';
                return "Property '{$last}' should be in '{$location}' not 'props' for {$compStr}";
                
            case 'missing_required_prop':
                return "Missing required property '{$last}' for {$compStr}";
                
            case 'unknown_component_type':
                $suggestions = isset($event->context['suggested_types']) ? array_values($event->context['suggested_types']) : [];
                $message = "Unknown component type '{$componentType}'";
                if (!empty($suggestions)) {
                    $message .= ". Did you mean: " . implode(', ', $suggestions) . "?";
                }
                return $message;
                
            case 'invalid_prop_type':
                $expectedType = isset($event->context['expected_type']) ? 
                    (is_array($event->context['expected_type']) ? implode('|', $event->context['expected_type']) : $event->context['expected_type']) : 
                    'proper type';
                $actualType = $event->context['actual_type'] ?? 'invalid type';
                return "Invalid type for '{$last}' in {$compStr}: expected {$expectedType}, got {$actualType}";
                
            case 'json_syntax_error':
                return "JSON syntax error in file " . basename($event->originalFile ?? $event->filePath ?? 'unknown');
                
            default:
                
                $formattedName = ucfirst(str_replace('_', ' ', $errorName));
                return "{$formattedName} in {$compStr}" . ($jsonPath ? " at {$jsonPath}" : "");
        }
    }
    
    /**
     * Record error statistics by category, severity, and component
     * Called by ErrorCategorizer listener
     *
     * @param string $errorSlug Error type
     * @param string $category Error category
     * @param int $severityLevel Error severity level
     * @param string|null $componentType Component type if available
     * @return void
     */
    public static function recordErrorStats(string $errorSlug, string $category, int $severityLevel, ?string $componentType): void
    {
        if (!isset(self::$errorsByCategory[$category])) {
            self::$errorsByCategory[$category] = [];
        }
        
        if (!isset(self::$errorsBySeverity[$severityLevel])) {
            self::$errorsBySeverity[$severityLevel] = [];
        }
        
        
        self::$errorsByCategory[$category][] = $errorSlug;
        
        
        self::$errorsBySeverity[$severityLevel][] = $errorSlug;
        
        
        if ($componentType) {
            $componentType = strtolower($componentType);
            if (!isset(self::$componentErrorCounts[$componentType])) {
                self::$componentErrorCounts[$componentType] = 0;
            }
            self::$componentErrorCounts[$componentType]++;
        }
    }
    
    /**
     * Get error statistics by category
     *
     * @return array Associative array with category => count
     */
    public static function getErrorStatsByCategory(): array
    {
        if (!empty(self::$errorsByCategory)) {
            $stats = [];
            foreach (self::$errorsByCategory as $category => $errors) {
                $stats[$category] = count($errors);
            }
            return $stats;
        }
        
        
        $stats = [];
        foreach (self::$errors as $error) {
            $category = $error['category'] ?? 'other';
            $stats[$category] = ($stats[$category] ?? 0) + 1;
        }
        return $stats;
    }
    
    /**
     * Get error statistics by severity level
     *
     * @return array Associative array with level => count
     */
    public static function getErrorCountsBySeverity(): array
    {
        $stats = [];
        foreach (self::$errorsBySeverity as $level => $errors) {
            $stats[$level] = count($errors);
        }
        ksort($stats); 
        return $stats;
    }
    
    /**
     * Get component error counts
     *
     * @param int $limit Maximum number of components to return
     * @return array Associative array with component => count
     */
    public static function getTopComponentErrorCounts(int $limit = 10): array
    {
        $stats = self::$componentErrorCounts;
        arsort($stats); 
        return array_slice($stats, 0, $limit, true);
    }
    
    /**
     * Get errors for a specific component
     *
     * @param string $componentType Component type
     * @return array Errors for the component
     */
    public static function getErrorsForComponent(string $componentType): array
    {
        return array_filter(self::$errors, function ($error) use ($componentType) {
            return isset($error['componentType']) && strtolower($error['componentType']) === strtolower($componentType);
        });
    }
    
    /**
     * Get errors for a specific error type
     */
    public static function getErrorsForType(string $errorType): array
    {
        return self::$errorsByType[$errorType] ?? [];
    }
    
    /**
     * Get top components with errors
     * 
     * @param int $limit Maximum number of components to return
     * @return array Components with error counts
     */
    public static function getTopErrorComponents(int $limit = 10): array
    {
        if (method_exists(self::class, 'getTopComponentErrorCounts')) {
            return self::getTopComponentErrorCounts($limit);
        }
        
        
        $componentCounts = [];
        foreach (self::$errors as $error) {
            $component = $error['componentType'] ?? ($error['component'] ?? 'unknown');
            if (!isset($componentCounts[$component])) {
                $componentCounts[$component] = 0;
            }
            $componentCounts[$component]++;
        }
        arsort($componentCounts);
        return array_slice($componentCounts, 0, $limit, true);
    }
    
    /**
     * Get total count of affected files with errors
     * 
     * @return int Number of affected files
     */
    public static function getAffectedFilesCount(): int
    {
        $files = [];
        foreach (self::$errors as $error) {
            $files[$error['file'] ?? 'unknown'] = true;
        }
        return count($files);
    }
    
    /**
     * Get error counts by level
     *
     * @return array Associative array with level => count
     */
    public static function getErrorCountsByLevel(): array
    {
        if (method_exists(self::class, 'getErrorCountsBySeverity')) {
            return self::getErrorCountsBySeverity();
        }
        
        
        $stats = [];
        foreach (self::$errors as $error) {
            $level = $error['level'] ?? 5; 
            $stats[$level] = ($stats[$level] ?? 0) + 1;
        }
        ksort($stats);
        return $stats;
    }
    
    public static function getErrorCountsByModule(): array
    {
        return self::$errorsByModule;
    }
    
    public static function getComponentTypesWithErrorsList(): array
    {
        return array_keys(self::$componentTypesWithErrors);
    }
    
    /**
     * Gets a human-readable name for a severity level.
     *
     * @param int $level The error level
     * @return string Human-readable severity name
     */
    private static function getSeverityLevelName(int $level): string
    {
        $severityNames = [
            0 => 'Critical',
            1 => 'Major',
            2 => 'Warning',
            3 => 'Notice',
            4 => 'Info',
            5 => 'Suggestion'
        ];
        
        return $severityNames[$level] ?? 'Unknown';
    }
    
    /**
     * Classifies an error slug to determine its default error level.
     *
     * @param string $errorSlug The error slug to classify
     * @return int The error level (0-5)
     */
    private static function classifyErrorLevel(string $errorSlug): int
    {
        // Critical errors (level 0)
        $criticalErrors = [
            'invalid_json_syntax',
            'json_decode_error',
            'invalid_json_root_type',
            'missing_required_key',
            'invalid_schema_reference',
            'schema_not_found'
        ];
        
        // Major errors (level 1)
        $majorErrors = [
            'invalid_child_type',
            'invalid_prop_type',
            'unknown_component_type',
            'component_disabled',
            'component_deprecated'
        ];
        
        // Warnings (level 2)
        $warnings = [
            'unknown_property',
            'unknown_key',
            'duplicate_key',
            'source_file_missing'
        ];
        
        // Remaining errors default to level 3, 4, or 5 depending on severity
        
        if (in_array($errorSlug, $criticalErrors)) {
            return 0; // Critical
        } else if (in_array($errorSlug, $majorErrors)) {
            return 1; // Major
        } else if (in_array($errorSlug, $warnings)) {
            return 2; // Warning
        } else if (strpos($errorSlug, 'notice_') === 0) {
            return 3; // Notice
        } else if (strpos($errorSlug, 'info_') === 0) {
            return 4; // Info
        }
        
        // Default to the least severe level
        return 5; // Suggestion
    }

    /**
     * Add a suggestion directly to the collector.
     * 
     * @param string $errorSlug The error type this suggestion applies to
     * @param string $componentType The component type this suggestion applies to
     * @param string $suggestion The suggestion text
     * @param string|null $example Example code if available
     * @param string|null $docs Documentation reference if available
     * @return void
     */
    public static function addSuggestion(
        string $errorSlug, 
        string $componentType, 
        string $suggestion, 
        ?string $example = null,
        ?string $docs = null
    ): void
    {
        if (!self::$isInitialized) {
            self::initialize();
        }
        
        self::$suggestions[] = [
            'error_type' => $errorSlug,
            'component' => $componentType,
            'suggestion' => $suggestion,
            'example' => $example,
            'docs' => $docs,
            'timestamp' => microtime(true)
        ];
    }

    public static function getStats(): array
    {
        return [
            'files' => self::$fileCount ?? 0,
            'components' => self::$componentCount ?? 0,
            'errors' => self::$errorCount ?? 0,
            'warnings' => self::$warningCount ?? 0
        ];
    }
}