<?php

namespace App\Console\Commands\Listeners;

use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use App\Console\Commands\JsonDecodedEvent;
use App\Console\Commands\FileDiscoveredEvent;
use App\Console\Commands\ValidationCompletedEvent;

/**
 * Listener that collects statistics about validation events
 */
class EventStatisticsListener
{
    // Statistics counters - simplified
    protected static array $stats = [
        'files_processed' => 0,
        'components_processed' => 0,
        'component_types_counts' => [], // Renamed for clarity, still tracks counts of each component type encountered
        'validation_time' => 0,
        // The following might be derivable from ValidationEventCollector if needed,
        // but can be kept if they represent distinct counts from this listener's perspective
        'unique_component_types_with_errors_count' => 0, 
        'files_with_errors_count' => 0 
    ];

    protected static float $validationStartTime = 0;
    
    /**
     * Reset all statistics.
     * Call at the beginning of a validation process.
     *
     * @return void
     */
    public static function reset(): void
    {
        self::$stats = [
            'files_processed' => 0,
            'components_processed' => 0,
            'component_types_counts' => [],
            'validation_time' => 0,
            'unique_component_types_with_errors_count' => 0,
            'files_with_errors_count' => 0
        ];
        
        self::$validationStartTime = microtime(true);
        ValidationEventCollector::reset(); // ADDED: Reset collector as well
    }
    
    /**
     * Handle file discovered event.
     *
     * @param \App\Console\Commands\FileDiscoveredEvent $event
     * @return void
     */
    public function handleFileDiscovered(FileDiscoveredEvent $event): void
    {
        self::$stats['files_processed']++;
        // File-specific error tracking is now in ValidationEventCollector
    }
    
    /**
     * Handle JSON decoded event.
     *
     * @param \App\Console\Commands\JsonDecodedEvent $event
     * @return void
     */
    public function handleJsonDecoded(JsonDecodedEvent $event): void
    {
        // No additional statistics needed here yet
    }
    
    /**
     * Handle node encountered event.
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    public function handleNodeEncountered(NodeEncounteredEvent $event): void
    {
        $nodeData = $event->nodeData;
        $componentType = $nodeData['type'] ?? null;
        
        if ($componentType) {
            self::$stats['components_processed']++;
            
            // Track unique component types encountered and their counts
            $componentTypeLower = strtolower($componentType);
            if (!isset(self::$stats['component_types_counts'][$componentTypeLower])) {
                self::$stats['component_types_counts'][$componentTypeLower] = 0;
            }
            self::$stats['component_types_counts'][$componentTypeLower]++;
        }
    }
    
    /**
     * Handle error detected event.
     * This method's role is reduced as detailed error tracking is in ValidationEventCollector.
     * It can still be used to increment high-level counters if needed, e.g., files_with_errors_count.
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handleErrorDetected(ErrorDetectedEvent $event): void
    {
        // Increment count of files with errors if this file hasn't been counted yet.
        // This requires a way to track files that have had errors reported by this listener.
        // For simplicity, this specific part is omitted here but could be added if necessary.
        // For now, 'files_with_errors_count' could be derived from ValidationEventCollector::getAffectedFilesCount()
        // or a similar method if ValidationEventCollector tracks this precisely.

        // If we want to count unique component types that had at least one error:
        static $componentTypesWithErrorLogged = [];
        if ($event->componentType && !isset($componentTypesWithErrorLogged[strtolower($event->componentType)])) {
             self::$stats['unique_component_types_with_errors_count']++;
             $componentTypesWithErrorLogged[strtolower($event->componentType)] = true;
        }
        
        // A simple flag for files with errors can also be managed
        static $filesWithErrorLogged = [];
        if ($event->filePath && !isset($filesWithErrorLogged[$event->filePath])) {
            self::$stats['files_with_errors_count']++;
            $filesWithErrorLogged[$event->filePath] = true;
        }
    }
    
    /**
     * Handle validation completed event.
     *
     * @param \App\Console\Commands\ValidationCompletedEvent $event
     * @return void
     */
    public function handleValidationCompleted(ValidationCompletedEvent $event): void
    {
        // Calculate validation time
        $validationEndTime = microtime(true);
        self::$stats['validation_time'] = round($validationEndTime - self::$validationStartTime, 2);
        
        // Log statistics
        $logChannel = Config::get('logging.default');
        
        // Basic stats from this listener
        $summary = [
            '------ General Stats ------' => '',
            'Total Files Processed' => self::$stats['files_processed'],
            'Total Components Processed' => self::$stats['components_processed'],
            'Unique Component Types Encountered' => count(self::$stats['component_types_counts']),
            'Validation Time (seconds)' => self::$stats['validation_time'],
            '------ Error Stats (from ValidationEventCollector) ------' => '',
            'Total Errors Logged' => count(ValidationEventCollector::getAllErrors()),
            'Errors by Severity' => ValidationEventCollector::getErrorCountsBySeverity(),
            'Errors by Category' => ValidationEventCollector::getErrorStatsByCategory(),
            'Top Component Types with Errors' => ValidationEventCollector::getTopComponentErrorCounts(5),
            'Top Error Types' => [], // Placeholder, populate from ValidationEventCollector if a getTopErrorTypes method exists
            'Errors by Module' => ValidationEventCollector::getErrorCountsByModule(),
            'Affected Files Count' => ValidationEventCollector::getAffectedFilesCount(), // Assuming this method exists or can be added
            'Component Types with Errors List' => ValidationEventCollector::getComponentTypesWithErrorsList(),

        ];

        // Populate Top Error Types
        $allErrorTypes = [];
        foreach (ValidationEventCollector::getAllErrors() as $error) {
            $errorName = $error['errorName'] ?? 'unknown';
            $allErrorTypes[$errorName] = ($allErrorTypes[$errorName] ?? 0) + 1;
        }
        arsort($allErrorTypes);
        $summary['Top Error Types'] = array_slice($allErrorTypes, 0, 5, true);


        Log::channel($logChannel)->info('======= Validation Statistics Summary =======');
        foreach ($summary as $key => $value) {
            if (is_array($value)) {
                Log::channel($logChannel)->info("{$key}:");
                foreach ($value as $subKey => $subValue) {
                     Log::channel($logChannel)->info("  {$subKey}: {$subValue}");
                }
            } else {
                Log::channel($logChannel)->info("{$key}: {$value}");
            }
        }
        Log::channel($logChannel)->info('=============================================');
    }
    
    /**
     * Get all collected statistics from this listener.
     * For detailed error stats, query ValidationEventCollector.
     *
     * @return array
     */
    public static function getStatistics(): array
    {
        // This returns the high-level stats from this listener
        return self::$stats;
    }
    
    /**
     * Get top component types by error count from ValidationEventCollector.
     *
     * @param int $limit Maximum number of component types to return
     * @return array
     */
    public static function getTopErrorComponents(int $limit = 10): array
    {
        return ValidationEventCollector::getTopComponentErrorCounts($limit);
    }
    
    /**
     * Get top error types by count from ValidationEventCollector.
     *
     * @param int $limit Maximum number of error types to return
     * @return array
     */
    public static function getTopErrorTypes(int $limit = 10): array
    {
        $allErrorTypes = [];
        foreach (ValidationEventCollector::getAllErrors() as $error) {
            $errorName = $error['errorName'] ?? 'unknown';
            $allErrorTypes[$errorName] = ($allErrorTypes[$errorName] ?? 0) + 1;
        }
        arsort($allErrorTypes);
        return array_slice($allErrorTypes, 0, $limit, true);
    }
    
    /**
     * Get error counts by severity level from ValidationEventCollector.
     *
     * @return array
     */
    public static function getErrorCountsBySeverity(): array
    {
        return ValidationEventCollector::getErrorCountsBySeverity();
    }
    
    /**
     * Get percentage of components (based on those processed by this listener) that had errors.
     * This is an estimate as error details are in ValidationEventCollector.
     *
     * @return float
     */
    public static function getErrorPercentage(): float
    {
        $totalComponentsProcessed = self::$stats['components_processed'] ?? 0;
        // Use the count of unique component types that had errors, from ValidationEventCollector
        $componentTypesWithErrorsCount = count(ValidationEventCollector::getComponentTypesWithErrorsList()); 
        
        if ($totalComponentsProcessed > 0 && $componentTypesWithErrorsCount > 0) {
            // This percentage is a bit conceptual: ratio of *types* with errors to *total processed components*
            // A more direct metric might be total errors / total components, if desired.
            // Or, count of components *instances* with errors / total component *instances*.
            // For now, using unique types with errors vs total components processed.
            return round(($componentTypesWithErrorsCount / count(self::$stats['component_types_counts'])) * 100, 2);
        }
        
        return 0;
    }
    
    /**
     * Get validation summary.
     *
     * @return array
     */
    public static function getValidationSummary(): array
    {
        $totalErrors = count(ValidationEventCollector::getAllErrors());
        $totalComponents = self::$stats['components_processed'] ?? 0;
        $totalFiles = self::$stats['files_processed'] ?? 0;
        // This should ideally come from ValidationEventCollector if it tracks files with errors distinctly
        $filesWithErrors = ValidationEventCollector::getAffectedFilesCount(); 
        $validationTime = self::$stats['validation_time'] ?? 0;
        
        return [
            'total_errors' => $totalErrors,
            'total_components_processed' => $totalComponents,
            'total_files_processed' => $totalFiles,
            'files_with_errors' => $filesWithErrors, // From Collector
            'unique_component_types_with_errors' => count(ValidationEventCollector::getComponentTypesWithErrorsList()), // From Collector
            'validation_time_seconds' => $validationTime,
            'error_percentage_by_component_type' => self::getErrorPercentage(), // Uses Collector data via getErrorPercentage
            'top_error_types' => self::getTopErrorTypes(5), // Uses Collector data
            'top_components_with_errors' => self::getTopErrorComponents(5) // Uses Collector data
        ];
    }
} 