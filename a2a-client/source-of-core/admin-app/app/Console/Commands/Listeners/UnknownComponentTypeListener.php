<?php

namespace App\Console\Commands\Listeners;

use App\Hooks\FileFacade as FacadesFile; // Using the alias defined in ValidateModuleJsonCommand
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config; // For accessing config paths if needed
use Illuminate\Support\Str;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use App\Console\Commands\Helpers\ModuleValidate\ComponentRuleLoader;

class UnknownComponentTypeListener
{
    protected array $suggestionsCache = [];
    protected bool $suggestionsLoaded = false;
    protected string $suggestionsFilePath;
    protected ComponentRuleLoader $ruleLoader;
    protected string $logChannel;

    public function __construct(ComponentRuleLoader $ruleLoader, string $logChannel = 'stack')
    {
        $this->ruleLoader = $ruleLoader;
        $this->logChannel = $logChannel;
        // Determine suggestions file path - might need to be configurable or based on a known path
        // For now, hardcoding based on typical structure shown in user data
        $this->suggestionsFilePath = base_path('install-modules/aiCore/validation/suggestions.json');
    }

    protected function loadSuggestions(): void
    {
        if ($this->suggestionsLoaded) {
            return;
        }

        if (!FacadesFile::exists($this->suggestionsFilePath)) {
            Log::channel(Config::get('logging.default'))->warning("[UnknownComponentTypeListener] Suggestions file not found at: {$this->suggestionsFilePath}");
            $this->suggestionsLoaded = true; // Mark as loaded to avoid re-attempts
            return;
        }

        $content = FacadesFile::get($this->suggestionsFilePath);
        if ($content === null) {
            Log::channel(Config::get('logging.default'))->error("[UnknownComponentTypeListener] Failed to read suggestions file: {$this->suggestionsFilePath}");
            $this->suggestionsLoaded = true; // Mark as loaded
            return;
        }

        try {
            $decodedSuggestions = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
            if (is_array($decodedSuggestions)) {
                $this->suggestionsCache = $decodedSuggestions;
            } else {
                Log::channel(Config::get('logging.default'))->error("[UnknownComponentTypeListener] Suggestions file does not contain a valid JSON array: {$this->suggestionsFilePath}");
            }
        } catch (\JsonException $e) {
            Log::channel(Config::get('logging.default'))->error("[UnknownComponentTypeListener] JSON Syntax Error in suggestions file {$this->suggestionsFilePath}: " . $e->getMessage());
        }
        $this->suggestionsLoaded = true;
    }

    /**
     * Get a list of all known component types from validation files
     *
     * @return array List of component types
     */
    protected function getKnownComponentTypes(): array
    {
        static $cachedComponentTypes = null;
        
        if ($cachedComponentTypes !== null) {
            return $cachedComponentTypes;
        }
        
        $componentsPath = base_path('install-modules/aiCore/validation/components');
        if (!FacadesFile::isDirectory($componentsPath)) {
            return [];
        }
        
        $componentTypes = [];
        
        // Scan direct .json files in the components directory
        $files = glob($componentsPath . '/*.json');
        foreach ($files as $file) {
            $fileName = pathinfo($file, PATHINFO_FILENAME);
            if (!empty($fileName)) {
                $componentTypes[] = strtolower($fileName);
            }
        }
        
        // Also scan subdirectories that might contain component definitions
        $directories = glob($componentsPath . '/*', GLOB_ONLYDIR);
        foreach ($directories as $dir) {
            $dirName = basename($dir);
            
            $subFiles = glob($dir . '/*.json');
            foreach ($subFiles as $file) {
                $fileName = pathinfo($file, PATHINFO_FILENAME);
                if (!empty($fileName)) {
                    // Add both with and without directory prefix for maximum matching
                    $componentTypes[] = strtolower($fileName);
                    $componentTypes[] = strtolower($dirName . '/' . $fileName);
                }
            }
        }
        
        // Add common component types that might not be in validation files
        $commonTypes = [
            'div', 'span', 'p', 'a', 'button', 'input', 'select', 'textarea',
            'form', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'img',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'header', 'footer',
            'section', 'article', 'main', 'nav', 'aside'
        ];
        
        $componentTypes = array_merge($componentTypes, $commonTypes);
        $cachedComponentTypes = array_unique(array_map('strtolower', $componentTypes));
        
        return $cachedComponentTypes;
    }

    /**
     * Find similar component types using fuzzy matching
     *
     * @param string $unknownType The unknown component type
     * @return array List of likely matches
     */
    protected function findSimilarComponentTypes(string $unknownType): array
    {
        $unknownType = strtolower(trim($unknownType));
        if (empty($unknownType)) {
            return [];
        }
        
        $knownTypes = $this->getKnownComponentTypes();
        $suggestions = [];
        
        // Exact match check (case insensitive)
        foreach ($knownTypes as $type) {
            if (strtolower($type) === $unknownType) {
                // This is an exact match with different casing
                return [$type]; // Return just this one since it's a case issue
            }
        }
        
        // Prefix match (e.g., "btn" might match "button")
        foreach ($knownTypes as $type) {
            if (Str::startsWith($type, $unknownType) || 
                Str::startsWith($unknownType, $type)) {
                $suggestions[] = $type;
            }
        }
        
        // If we have prefix matches, return them
        if (!empty($suggestions)) {
            return array_slice($suggestions, 0, 5); // Limit to 5 suggestions
        }
        
        // Levenshtein distance for typos
        $levenshteinMatches = [];
        foreach ($knownTypes as $type) {
            $distance = levenshtein($unknownType, $type);
            if ($distance <= min(3, strlen($unknownType) / 2)) {
                $levenshteinMatches[$type] = $distance;
            }
        }
        
        // Sort by distance (closest first)
        asort($levenshteinMatches);
        
        // Limit to 3 closest matches
        return array_slice(array_keys($levenshteinMatches), 0, 3);
    }

    /**
     * Handle the node encountered event.
     *
     * @param \App\Console\Commands\NodeEncounteredEvent $event
     * @return void
     */
    public function handle(NodeEncounteredEvent $event): void
    {
        Log::channel($this->logChannel)->debug('[UnknownComponentTypeListener] Handling NodeEncounteredEvent for file: ' . $event->filePath . ' at path: ' . $event->jsonPath); // DEBUG LOG

        $node = $event->nodeData; // Use nodeData from the event
        $componentType = $node['type'] ?? null;

        if (!$componentType) {
            // This case is handled by ComponentStructureValidator now, but log for awareness
            Log::channel($this->logChannel)->debug('[UnknownComponentTypeListener] No component type found at path: ' . $event->jsonPath);
            return; // Let other listeners handle structure errors
        }

        $rule = $this->ruleLoader->getRule($componentType);

        if (!$rule) {
            // Dispatch error for unknown type
            // Use event helper function if available in this context, otherwise direct dispatch
            if (function_exists('event')) {
                event(new ErrorDetectedEvent(
                    $event->getCommand(), // Pass command instance from event
                    $event->moduleName,
                    $event->filePath,
                    $event->jsonPath,
                    'unknown_component_type',
                    "Unknown component type: {$componentType}", // Provide a default message
                    ['componentType' => $componentType, 'nodeData' => $node] // Pass context
                ));
                Log::channel($this->logChannel)->debug('[UnknownComponentTypeListener] Dispatched unknown_component_type error for: ' . $componentType);

            } else {
                 // Fallback for environments where event() helper is not available
                 // This fallback might need command instance or other setup depending on env
                 Log::channel($this->logChannel)->warning('[UnknownComponentTypeListener] event() helper not available. Could not dispatch unknown_component_type error.');
            }
        }
    }
} 