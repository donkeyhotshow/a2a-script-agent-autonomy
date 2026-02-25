<?php

namespace App\Console\Commands\Listeners;

use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use App\Hooks\FileFacade;
use Illuminate\Support\Str;

/**
 * Enhanced Suggestion Listener
 * 
 * This listener integrates suggestions.json data with error events
 * and stores enhanced suggestions directly in ValidationEventCollector.
 * Also respects component levels for filtering suggestions.
 */
class EnhancedSuggestionListener
{
    protected array $suggestionCache = [];
    protected bool $initialized = false;
    protected ?ComponentLevelFilterListener $levelFilter = null;
    
    public function __construct(ComponentLevelFilterListener $levelFilter = null)
    {
        $this->levelFilter = $levelFilter;
        $this->loadSuggestions();
    }
    
    protected function loadSuggestions(): void
    {
        if ($this->initialized) {
            return;
        }
        
        $suggestionsPath = base_path('install-modules/aiCore/validation/suggestions.json');
        
        if (!FileFacade::exists($suggestionsPath)) {
            return;
        }
        
        try {
            $content = FileFacade::get($suggestionsPath);
            $suggestionsData = json_decode($content, true);
            
            if (is_array($suggestionsData)) {
                $this->suggestionCache = $suggestionsData;
                $this->initialized = true;
            }
        } catch (\Exception $e) {
            // Failed to load suggestions, continue with empty cache
        }
    }
    
    public function handle(ErrorDetectedEvent $event): void
    {
        if (empty($this->suggestionCache)) {
            return;
        }
        
        $errorType = $event->errorSlug;
        $jsonPath = $event->jsonPath;
        $componentType = $event->componentType;
        
        // Check if this error would be filtered based on component level
        if ($this->levelFilter && $componentType && 
            !$this->levelFilter->shouldShowError($componentType, $errorType)) {
            // No need to add suggestions for errors that will be filtered out
            return;
        }
        
        // Find matching suggestion
        $matchingSuggestion = null;
        
        foreach ($this->suggestionCache as $suggestion) {
            if (!isset($suggestion['match']) || !is_array($suggestion['match'])) {
                continue;
            }
            
            $matchCriteria = $suggestion['match'];
            $matches = true;
            
            // Match error_type
            if (isset($matchCriteria['error_type']) && $matchCriteria['error_type'] !== $errorType) {
                $matches = false;
                continue;
            }
            
            // Match component
            if (isset($matchCriteria['component']) && 
                $matchCriteria['component'] !== $componentType &&
                strtolower($matchCriteria['component']) !== strtolower($componentType)) {
                $matches = false;
                continue;
            }
            
            // Match path_contains
            if (isset($matchCriteria['path_contains']) && 
                !Str::contains($jsonPath, $matchCriteria['path_contains'])) {
                $matches = false;
                continue;
            }
            
            // Match key
            if (isset($matchCriteria['key']) && 
                (!isset($event->context['key']) || $event->context['key'] !== $matchCriteria['key']) && 
                (!isset($event->context['missing_key']) || $event->context['missing_key'] !== $matchCriteria['key']) &&
                (!isset($event->context['unknown_prop_key']) || $event->context['unknown_prop_key'] !== $matchCriteria['key'])) {
                $matches = false;
                continue;
            }
            
            if ($matches) {
                $matchingSuggestion = $suggestion;
                break;
            }
        }
        
        if ($matchingSuggestion) {
            // Add suggestion to event context
            $event->context['suggestion'] = $matchingSuggestion['suggestion'] ?? null;
            $event->context['suggestion_example'] = $matchingSuggestion['example'] ?? null;
            
            // Add documentation path to context if available
            if (!empty($matchingSuggestion['docs'])) {
                $event->context['docs'] = $event->context['docs'] ?? [];
                if (!in_array($matchingSuggestion['docs'], $event->context['docs'])) {
                    $event->context['docs'][] = $matchingSuggestion['docs'];
                }
            }

            // Create enhanced suggestion for direct inclusion in output
            $combinedSuggestion = $matchingSuggestion['suggestion'] ?? '';
            if (!empty($matchingSuggestion['example'])) {
                $combinedSuggestion .= "\nExample: " . $matchingSuggestion['example'];
            }

            $event->context['suggestion_combined'] = $combinedSuggestion;

            // Add suggestion directly to ValidationEventCollector for direct integration
            ValidationEventCollector::addSuggestion(
                $errorType,
                $componentType ?? 'unknown',
                $combinedSuggestion,
                $matchingSuggestion['example'] ?? null,
                $matchingSuggestion['docs'] ?? null
            );
            
            // If this is an unknown property, add the suggested format to use
            if ($errorType === 'unknown_prop' && $componentType) {
                $this->addUnknownPropSuggestion($event, $componentType);
            }
        }
    }
    
    /**
     * Add specific suggestion for unknown property errors
     */
    protected function addUnknownPropSuggestion(ErrorDetectedEvent $event, string $componentType): void
    {
        $propName = $event->context['unknown_prop_key'] ?? $event->context['key'] ?? null;
        
        if (!$propName) {
            return;
        }
        
        // Get component level information if available
        $levelInfo = '';
        if ($this->levelFilter) {
            $level = $this->levelFilter->getComponentLevel($componentType);
            $levelInfo = " (Component Level: {$level})";
        }
        
        // Add correct structure suggestion
        $event->context['correct_structure'] = "When using '{$propName}' with {$componentType}{$levelInfo}, place it in the props object:";
        $event->context['correct_example'] = [
            'type' => $componentType,
            'props' => [
                $propName => 'value'
            ]
        ];
        
        // Add to general suggestions
        ValidationEventCollector::addSuggestion(
            'unknown_prop',
            $componentType,
            "When using '{$propName}' with {$componentType}, place it in the props object",
            null,
            'docs/guides/module/component-structure.md'
        );
    }
} 