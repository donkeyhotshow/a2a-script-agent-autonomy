<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as FacadesFile;
use App\Console\Commands\Helpers\ModuleValidate\ErrorMessageGenerator;
use App\Console\Commands\Helpers\ModuleValidate\AIFriendlyOutputFormatter;
use Symfony\Component\Console\Output\OutputInterface;

trait ValidationResultOutputHelper
{
    // Pagination settings
    protected int $defaultPageSize = 25; 
    protected int $currentPage = 1;     
    protected array $paginatedOutput = []; 
    protected bool $usePagination = false; 
    protected bool $useInteractivePagination = false; 

    protected function initializePagination(): void
    {
        $this->usePagination = false; 
        $this->useInteractivePagination = false;
        
        $verbosityLevel = $this->getSuggestionVerbosityLevel();

        if (method_exists($this, 'hasOption') && $this->option('interactive')) {
            $this->useInteractivePagination = true;
            $this->usePagination = true; 
        }

        $maxPerPage = $this->defaultPageSize;
        if (method_exists($this, 'hasOption')) {
            // Use new option name, but fall back to old one for backward compatibility
            if ($this->hasOption('max-lines-per-page')) {
                $customPageSize = (int)$this->option('max-lines-per-page');
                if ($customPageSize > 0) {
                    $maxPerPage = $customPageSize;
                    $this->usePagination = true; 
                }
            } elseif ($this->hasOption('max-per-page')) {
                // For backward compatibility
                $customPageSize = (int)$this->option('max-per-page');
                if ($customPageSize > 0) {
                    $maxPerPage = $customPageSize;
                    $this->usePagination = true; 
                }
            }
        }
        $this->defaultPageSize = $maxPerPage;
        
        if ($this->useInteractivePagination) {
            $this->usePagination = true;
        }

        if ($this->usePagination) {
            if ($verbosityLevel >= 3) { 
                $this->defaultPageSize = min($this->defaultPageSize, 15); 
            } elseif ($verbosityLevel == 2) { 
                $this->defaultPageSize = min($this->defaultPageSize, 20);
            }
        }
    }
    
    protected function displayCurrentPage(): void
    {
        if(!$this->usePagination || empty($this->paginatedOutput)) return;

        $totalPages = ceil(count($this->paginatedOutput) / $this->defaultPageSize);
        if ($totalPages <= 0) return;
        $this->currentPage = max(1, min($this->currentPage, $totalPages));

        $start = ($this->currentPage - 1) * $this->defaultPageSize;
        $end = min($start + $this->defaultPageSize, count($this->paginatedOutput));
        
        if ($totalPages > 1) {
            $this->line("<fg=yellow>--- Page {$this->currentPage} of {$totalPages} ---</>");
        }
        
        for ($i = $start; $i < $end; $i++) {
            if(isset($this->paginatedOutput[$i])) $this->line($this->paginatedOutput[$i]);
        }
        
        if ($totalPages > 1 && method_exists($this, 'option') && !$this->option('interactive')) {
            if ($this->currentPage < $totalPages) {
                 $this->line("\n<fg=yellow>More errors on next page. Run with --interactive or increase --max-per-page.</>");
            } elseif ($this->currentPage >= $totalPages) {
                 $this->line("\n<fg=green>All pages displayed.</>");
            }
        } elseif ($totalPages <=1 && !empty($this->paginatedOutput)) {
            $this->line("\n<fg=green>All content displayed.</>");
        }
    }

    // Retained for pagination logic if it depends on verbosity for page size or interactive mode.
    // Its name "SuggestionVerbosityLevel" is now a misnomer as suggestions are removed.
    protected function getSuggestionVerbosityLevel(): int
    {
        return OutputInterface::VERBOSITY_VERBOSE;
    }

    /**
     * Formats an error for display, with improved context based on error type.
     */
    protected function formatError(array $error): string
    {
        $path = $error['path'] ?? 'unknown_path';
        $component = $error['component'] ?? 'unknown';
        $errorType = $error['error_type'] ?? 'unknown_error';
        $message = '';
        
        // Format message based on error type for more specific feedback
        switch ($errorType) {
            case 'unknown_prop':
                $availableProps = isset($error['available_props']) ? array_values($error['available_props']) : [];
                $suggestedProps = isset($error['suggested_props']) ? array_values($error['suggested_props']) : [];
                
                $message = "Unknown property '{$error['key']}' in component '{$component}' at {$path}";
                
                if (!empty($suggestedProps)) {
                    $message .= "\nDid you mean: " . implode(', ', $suggestedProps);
                }
                
                if (!empty($availableProps)) {
                    $propCount = count($availableProps);
                    if ($propCount <= 10) {
                        $message .= "\nAllowed props: " . implode(', ', $availableProps);
                    } else {
                        $firstFew = array_slice($availableProps, 0, 5);
                        $message .= "\nAllowed props include: " . implode(', ', $firstFew) . " and {$propCount} more...";
                    }
                }
                break;
                
            case 'prop_in_wrong_location':
            case 'prop_likely_misplaced':
                $correctLocation = $error['correct_location'] ?? $error['potential_location'] ?? 'another location';
                $message = "Property '{$error['key']}' should be in '{$correctLocation}' not 'props' for component '{$component}' at {$path}";
                if (isset($error['suggestion'])) {
                    $message .= "\nSuggestion: " . $error['suggestion'];
                }
                break;
                
            case 'missing_required_prop':
                $message = "Missing required property '{$error['key']}' in component '{$component}' at {$path}";
                break;
                
            case 'unknown_component_type':
                $suggestions = isset($error['suggested_types']) ? $error['suggested_types'] : [];
                $message = "Unknown component type '{$component}' at {$path}";
                if (!empty($suggestions)) {
                    $message .= "\nDid you mean: " . implode(', ', $suggestions);
                }
                break;
                
            case 'invalid_prop_type':
                $expectedType = $error['expected_type'] ?? 'unknown';
                $actualType = $error['actual_type'] ?? 'unknown';
                $message = "Invalid property type for '{$error['key']}' in component '{$component}' at {$path}";
                $message .= "\nExpected: " . (is_array($expectedType) ? implode('|', $expectedType) : $expectedType);
                $message .= ", Got: {$actualType}";
                break;
                
            case 'empty_string_not_allowed':
            case 'empty_array_not_allowed':
                $message = "Empty " . ($errorType === 'empty_string_not_allowed' ? 'string' : 'array') . 
                           " not allowed for '{$error['key']}' in component '{$component}' at {$path}";
                break;
                
            case 'invalid_props_type':
                $message = "Invalid 'props' type in component '{$component}' at {$path} - must be an object";
                break;
                
            case 'json_syntax_error':
                $message = "JSON syntax error in file {$error['file']}: {$error['message']}";
                break;
                
            default:
                // Fallback for other error types not specifically handled
                $message = "Error in component '{$component}' at {$path}: {$errorType}";
                if (isset($error['message']) && !empty($error['message'])) {
                    $message .= " - {$error['message']}";
                }
        }
        
        return $message;
    }

    /**
     * Format a suggestion for display
     */
    protected function formatSuggestion(array $suggestion): string
    {
        $message = $suggestion['message'] ?? 'No detailed suggestion available';
        $component = $suggestion['component'] ?? null;
        $file = $suggestion['file'] ?? null;
        
        $formattedMessage = "✓ " . $message;
        
        if ($component) {
            $formattedMessage .= " (Component: {$component})";
        }
        
        if ($file) {
            $formattedMessage .= " in {$file}";
        }
        
        return $formattedMessage;
    }

    // NEW/REFACTORED METHOD
    public function displayValidationResults(
        array $errorsToDisplay, 
        string $outputStyle,
        string $groupingAlgorithm, // Consider how to use this or simplify
        int $maxPerPage,
        bool $isInteractive,
        bool $plainDocs, // For future use with docs display
        bool $superVerbose, // For controlling verbosity of each error
        array $validationLevelDocs
    ): void
    {
        if ($outputStyle === 'json') {
            $this->line(json_encode($errorsToDisplay, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return;
        }

        if (empty($errorsToDisplay)) {
            $this->line("<fg=green>No errors to display.</>");
            return;
        }

        // Load output system configuration if it exists in the command
        $outputSystemConfig = [];
        if (method_exists($this, 'command') && property_exists($this->command, 'outputSystemConfig')) {
            $outputSystemConfig = $this->command->outputSystemConfig;
        } elseif (property_exists($this, 'outputSystemConfig')) {
            $outputSystemConfig = $this->outputSystemConfig;
        }
        
        $outputControlEnabled = $outputSystemConfig['enable_output_control'] ?? false;
        $detailSystems = $outputSystemConfig['detail_systems'] ?? [
            'error_messages' => true,
            'error_context' => true,
            'error_path' => true,
            'documentation_links' => true,
            'component_examples' => true,
            'schema_information' => true,
            'suggestion_hints' => true
        ];

        // Filter errors to only show minimum level errors and unknown component types unless --show-all is specified
        if (!$this->option('show-all')) {
            $minErrorLevel = ValidationEventCollector::getMinErrorLevel();
            if ($minErrorLevel !== null) {
                $filteredErrors = [];
                
                foreach ($errorsToDisplay as $error) {
                    $errorType = $error['error_type'] ?? '';
                    $errorLevel = $error['level'] ?? 5; // Default to level 5 if not specified
                    
                    // Always include unknown component types regardless of level
                    if ($errorType === 'unknown_component_type' || $errorLevel === $minErrorLevel) {
                        $filteredErrors[] = $error;
                    }
                }
                
                // Replace original array with filtered
                if (!empty($filteredErrors)) {
                    $this->line("<fg=yellow>Filtered to show only level {$minErrorLevel} errors and unknown component types.</>");
                    $errorsToDisplay = $filteredErrors;
                }
            }
        }

        // Group errors by file for default human-readable output
        // If other grouping algorithms are complex, they might need more logic here
        $errorsByFile = [];
        foreach ($errorsToDisplay as $error) {
            $filePath = $error['originalFile'] ?? 'unknown_file';
            $errorsByFile[$filePath][] = $error;
        }

        $outputBuffer = [];
        $displayedLevelDocs = []; // To avoid repeating docs for the same level

        // Overall summary (can be enriched from EventStatisticsListener if needed)
        $totalErrorCount = count($errorsToDisplay);
        $this->line("\n<fg=blue;options=bold>--- Validation Results ---</>");
        $this->line("Total errors to display: <fg=yellow>{$totalErrorCount}</>");
        $minErrorLevel = ValidationEventCollector::getMinErrorLevel();
        if (!$this->option('show-all') && $minErrorLevel !== null) {
            $this->line("Displaying errors for priority level: <fg=yellow>{$minErrorLevel}</> (" . ($this->getSeverityLevelName($minErrorLevel) ?? 'Unknown Level') . ")");
        } else {
            $this->line("Displaying <fg=yellow>all</> detected errors.");
        }
        $this->line("");

        foreach ($errorsByFile as $filePath => $errorsInFile) {
            $outputBuffer[] = "\n<fg=cyan>File: {$filePath}</>";
            
            // Sort errors in file by level, then by path
            usort($errorsInFile, function ($a, $b) {
                $levelComparison = ($a['level'] ?? 99) <=> ($b['level'] ?? 99);
                if ($levelComparison !== 0) {
                    return $levelComparison;
                }
                return ($a['jsonPath'] ?? '') <=> ($b['jsonPath'] ?? '');
            });

            foreach ($errorsInFile as $error) {
                $level = (string)($error['level'] ?? 'unknown');
                $severityName = $this->getSeverityLevelName((int)$level);
                $levelColor = $this->getColorForSeverityLevel((int)$level);

                // Display level documentation if not already shown for this level
                if (isset($validationLevelDocs[$level]) && !isset($displayedLevelDocs[$level])) {
                    $outputBuffer[] = "\n<fg=blue;options=bold>Guidance for Level {$level} ({$severityName}) Errors:</>";
                    foreach ($validationLevelDocs[$level] as $docLine) {
                        $outputBuffer[] = "  <fg=gray>- {$docLine}</>";
                    }
                    $outputBuffer[] = ""; // Extra line after docs
                    $displayedLevelDocs[$level] = true;
                }

                $errorType = $error['errorName'] ?? 'unknown_error_type';
                $category = $error['category'] ?? 'other';
                $categoryColor = $this->getColorForCategory($category);
                $humanMessage = $error['humanMessage'] ?? $error['message'] ?? $errorType;
                $jsonPath = $error['jsonPath'] ?? 'N/A';

                // Check if error messages should be displayed
                if (!$outputControlEnabled || ($detailSystems['error_messages'] ?? true)) {
                    $outputBuffer[] = sprintf("  <fg=%s>[L%s:%s]</> <fg=%s>[%s]</> <options=bold>%s</>",
                        $levelColor, $level, $severityName, $categoryColor, ucfirst($category), $humanMessage);
                }
                
                // Check if error paths should be displayed
                if (!$outputControlEnabled || ($detailSystems['error_path'] ?? true)) {
                    $outputBuffer[] = "    <fg=gray>Path:</> {$jsonPath}";
                }
                
                // Check if error context should be displayed
                if ((!$outputControlEnabled || ($detailSystems['error_context'] ?? true)) && $superVerbose && !empty($error['componentType'])) {
                     $outputBuffer[] = "    <fg=gray>Component:</> {$error['componentType']}";
                }

                // Get output system configuration if available
                $showDocs = true;
                $showExamples = true;
                $showSchema = true;
                $showSuggestions = true;
                
                // Check if this command has output system configuration
                if (property_exists($this, 'outputSystemConfig')) {
                    $outputConfig = $this->outputSystemConfig;
                    $enableControl = $outputConfig['enable_output_control'] ?? false;
                    $detailSystems = $outputConfig['detail_systems'] ?? [];
                    
                    if ($enableControl) {
                        $showDocs = $detailSystems['documentation_links'] ?? true;
                        $showExamples = $detailSystems['component_examples'] ?? true;
                        $showSchema = $detailSystems['schema_information'] ?? true;
                        $showSuggestions = $detailSystems['suggestion_hints'] ?? true;
                    }
                }

                // Verbosity levels for additional details (docs, example, card)
                if ($this->getOutput()->getVerbosity() >= OutputInterface::VERBOSITY_VERBOSE) { // -v
                    if ($showDocs && !empty($error['docs'])) {
                        $outputBuffer[] = '    <fg=blue>--- Links ---</>';
                        foreach ($error['docs'] as $link) $outputBuffer[] = "      - $link";
                    }
                    if ($showDocs && !empty($error['docText'])) {
                        $outputBuffer[] = '    <fg=blue>--- Documentation Snippet ---</>';
                        foreach(explode("\n", $error['docText']) as $docTextLine) {
                            $outputBuffer[] = '      ' . $docTextLine;
                        }
                    }
                }
                if ($this->getOutput()->getVerbosity() >= OutputInterface::VERBOSITY_VERY_VERBOSE) { // -vv
                    // Show suggested types for unknown component errors
                    if ($showSuggestions && $errorType === 'unknown_component_type' && !empty($error['context']['suggested_types'])) {
                        $outputBuffer[] = '    <fg=green>--- Suggested Types ---</>';
                        $outputBuffer[] = '      ' . implode(', ', $error['context']['suggested_types']);
                    }
                    // Show available props for unknown prop errors
                    if ($showSuggestions && $errorType === 'unknown_prop' && !empty($error['context']['available_props'])) {
                        $outputBuffer[] = '    <fg=green>--- Available Properties ---</>';
                        $props = $error['context']['available_props'];
                        $chunks = array_chunk($props, 5);
                        foreach ($chunks as $chunk) {
                            $outputBuffer[] = '      ' . implode(', ', $chunk);
                        }
                    }
                }
                if ($this->getOutput()->getVerbosity() >= OutputInterface::VERBOSITY_DEBUG && !empty($error['card'])) { // -vvv
                    if ($showSchema) {
                        $outputBuffer[] = '    <fg=blue>--- Component Card Data (Schema) ---</>';
                        $cardOutput = json_encode($error['card'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                        foreach(explode("\n", $cardOutput) as $cardLine) {
                            $outputBuffer[] = '      ' . $cardLine;
                        }
                    }
                }
                if ($this->getOutput()->getVerbosity() >= OutputInterface::VERBOSITY_DEBUG && !empty($error['example'])) { // -vvv
                    if ($showExamples) {
                        $outputBuffer[] = '    <fg=blue>--- Example ---</>';
                        $exampleOutput = is_array($error['example']) ? json_encode($error['example'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : $error['example'];
                        foreach(explode("\n", $exampleOutput) as $exampleLine) {
                            $outputBuffer[] = '      ' . $exampleLine;
                        }
                    }
                }
                $outputBuffer[] = ""; // Blank line between errors
            }
        }

        // Pagination logic (simplified, adapt as needed from existing trait methods)
        $this->initializePagination(); // Sets up $this->usePagination, $this->defaultPageSize etc.
        
        // Apply pagination configuration from output system config if available
        if ($outputControlEnabled && isset($outputSystemConfig['pagination'])) {
            $paginationConfig = $outputSystemConfig['pagination'];
            if (isset($paginationConfig['enabled'])) {
                $this->usePagination = $paginationConfig['enabled'];
            }
            // Use max_lines_per_page instead of max_errors_per_page
            if (isset($paginationConfig['max_lines_per_page']) && $paginationConfig['max_lines_per_page'] > 0) {
                $this->defaultPageSize = $paginationConfig['max_lines_per_page'];
            } 
            // For backward compatibility
            elseif (isset($paginationConfig['max_errors_per_page']) && $paginationConfig['max_errors_per_page'] > 0) {
                $this->defaultPageSize = $paginationConfig['max_errors_per_page'];
            }
            if (isset($paginationConfig['interactive_pagination'])) {
                $this->useInteractivePagination = $paginationConfig['interactive_pagination'] && $this->option('interactive');
            }
        }
        
        if ($this->usePagination) {
            $this->paginatedOutput = $outputBuffer;
            if ($this->useInteractivePagination && method_exists($this, 'paginateInteractive')) {
                $this->paginateInteractive($this->paginatedOutput, $this->defaultPageSize);
            } else {
                $this->displayCurrentPage(); // This method needs to exist and work with $this->paginatedOutput
            }
        } else {
            foreach ($outputBuffer as $line) {
                $this->line($line);
            }
        }
        
        // Display suggestions if any, collected by ValidationEventCollector
        $suggestions = ValidationEventCollector::getAllCollectedData()['suggestions'] ?? [];
        if (!empty($suggestions) && (!$outputControlEnabled || ($outputSystemConfig['error_types']['suggestions'] ?? true))) {
            $this->line("\n<fg=blue;options=bold>--- Suggestions ---</>");
            foreach ($suggestions as $suggestion) {
                $message = $suggestion['message'] ?? (is_string($suggestion) ? $suggestion : json_encode($suggestion));
                $this->line("<fg=green>✓</> " . $message);
            }
        }
    }

    // Helper methods assumed to be in the command or this trait 
    // (getSeverityLevelName, getColorForSeverityLevel, getColorForCategory)
    // Make sure these are accessible, e.g., by moving them to this trait if they were in the command

    // MOVED FROM ValidateModuleJsonCommand.php
    private function getColorForCategory(string $category): string
    {
        return match (strtolower($category)) {
            ValidationEventCollector::CATEGORY_STRUCTURE => 'red',
            ValidationEventCollector::CATEGORY_PROPS => 'yellow',
            ValidationEventCollector::CATEGORY_COMPONENT => 'magenta',
            ValidationEventCollector::CATEGORY_JSON => 'blue',
            ValidationEventCollector::CATEGORY_FILE => 'cyan',
            default => 'white',
        };
    }

    private function getSeverityLevelName(int $level): string
    {
        return match ($level) {
            ValidationEventCollector::ERROR_CRITICAL => 'Critical',
            ValidationEventCollector::ERROR_MAJOR => 'Major',
            ValidationEventCollector::ERROR_WARNING => 'Warning',
            ValidationEventCollector::ERROR_NOTICE => 'Notice',
            ValidationEventCollector::ERROR_INFO => 'Info',
            default => 'Unknown Level',
        };
    }

    private function getColorForSeverityLevel(int $level): string
    {
        return match ($level) {
            ValidationEventCollector::ERROR_CRITICAL => 'red;options=bold',
            ValidationEventCollector::ERROR_MAJOR => 'yellow;options=bold',
            ValidationEventCollector::ERROR_WARNING => 'yellow',
            ValidationEventCollector::ERROR_NOTICE => 'cyan',
            ValidationEventCollector::ERROR_INFO => 'gray',
            default => 'white',
        };
    }
}