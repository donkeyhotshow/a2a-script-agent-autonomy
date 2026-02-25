<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\NodeEncounteredEvent;
use App\Hooks\FileFacade as File;
use Illuminate\Support\Str;

/**
 * Listener that enriches validation events with additional context
 */
class ValidationContextEnricherListener
{
    /**
     * Cache of loaded component examples
     */
    protected static array $exampleCache = [];
    
    /**
     * Cache of loaded component documentation
     */
    protected static array $documentationCache = [];
    
    /**
     * Handle an error detected event to enrich it with additional context
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        // Skip if context isn't an array
        if (!is_array($event->context)) {
            $event->context = [];
        }
        
        // Add file-related context
        $this->enrichWithFileContext($event);
        
        // Add component-specific context
        if ($event->componentType) {
            $this->enrichWithComponentContext($event);
        }
        
        // Add error-specific context
        $this->enrichWithErrorContext($event);
    }
    
    /**
     * Enrich the event with file-related context
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    protected function enrichWithFileContext(ErrorDetectedEvent $event): void
    {
        // Add file path context
        $event->context['file_path'] = $event->filePath;
        
        // Try to get relative path for better readability
        $absolutePath = base_path($event->filePath);
        if (File::exists($absolutePath)) {
            $event->context['absolute_file_path'] = $absolutePath;
        }
        
        // Add line number if available (useful for linking to IDE)
        if (isset($event->context['line_number'])) {
            $lineNumber = $event->context['line_number'];
            $event->context['file_location'] = "{$event->filePath}:{$lineNumber}";
        }
    }
    
    /**
     * Enrich the event with component-specific context
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    protected function enrichWithComponentContext(ErrorDetectedEvent $event): void
    {
        $componentType = $event->componentType;
        if (!$componentType) {
            return;
        }
        
        // Add component type to context
        $event->context['component_type'] = $componentType;
        
        // Try to load component documentation
        $docText = $this->getComponentDocumentation($componentType);
        if ($docText) {
            $event->context['component_documentation'] = $docText;
        }
        
        // Try to load component example
        $example = $this->getComponentExample($componentType);
        if ($example) {
            $event->context['component_example'] = $example;
        }
        
        // Include component validation file path
        $validationFilePath = $this->getComponentValidationFilePath($componentType);
        if ($validationFilePath) {
            $event->context['component_validation_path'] = $validationFilePath;
        }
    }
    
    /**
     * Enrich the event with error-specific context
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    protected function enrichWithErrorContext(ErrorDetectedEvent $event): void
    {
        $errorType = $event->errorSlug;
        
        // Common fixes based on error type
        $fixSuggestions = $this->getFixSuggestions($errorType, $event->componentType);
        if ($fixSuggestions) {
            $event->context['fix_suggestions'] = $fixSuggestions;
        }
        
        // Add documentation links
        $docLinks = $this->getDocumentationLinks($errorType, $event->componentType);
        if (!empty($docLinks)) {
            $event->context['documentation_links'] = $docLinks;
        }
        
        // Get any additional context based on error type
        $additionalContext = $this->getAdditionalErrorContext($errorType, $event);
        if ($additionalContext && is_array($additionalContext)) {
            $event->context = array_merge($event->context, $additionalContext);
        }
    }
    
    /**
     * Get component documentation text
     *
     * @param string $componentType
     * @return string|null
     */
    protected function getComponentDocumentation(string $componentType): ?string
    {
        $componentTypeLower = strtolower($componentType);
        
        // Use cached documentation if available
        if (isset(self::$documentationCache[$componentTypeLower])) {
            return self::$documentationCache[$componentTypeLower];
        }
        
        // Try different documentation file locations
        $docPaths = [
            base_path("install-modules/aiCore/validation/components/{$componentType}.doc.md"),
            base_path("docs/development/components/{$componentType}.md"),
            base_path("docs/components/{$componentType}.md")
        ];
        
        foreach ($docPaths as $docPath) {
            if (File::exists($docPath)) {
                $docText = File::get($docPath);
                self::$documentationCache[$componentTypeLower] = $docText;
                return $docText;
            }
        }
        
        self::$documentationCache[$componentTypeLower] = null;
        return null;
    }
    
    /**
     * Get component example code
     *
     * @param string $componentType
     * @return string|null
     */
    protected function getComponentExample(string $componentType): ?string
    {
        $componentTypeLower = strtolower($componentType);
        
        // Use cached example if available
        if (isset(self::$exampleCache[$componentTypeLower])) {
            return self::$exampleCache[$componentTypeLower];
        }
        
        // Try different example file locations
        $examplePaths = [
            base_path("install-modules/aiCore/validation/examples/{$componentType}.example.json"),
            base_path("docs/examples/components/{$componentType}.json"),
            base_path("implement-modules/playground/v1/examples/{$componentType}.json")
        ];
        
        foreach ($examplePaths as $examplePath) {
            if (File::exists($examplePath)) {
                $exampleText = File::get($examplePath);
                
                // Try to parse and pretty-print the example
                try {
                    $exampleData = json_decode($exampleText, true);
                    if (is_array($exampleData)) {
                        $prettyExample = json_encode($exampleData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                        self::$exampleCache[$componentTypeLower] = $prettyExample;
                        return $prettyExample;
                    }
                } catch (\Throwable $e) {
                    // If parsing fails, return the raw example
                }
                
                self::$exampleCache[$componentTypeLower] = $exampleText;
                return $exampleText;
            }
        }
        
        self::$exampleCache[$componentTypeLower] = null;
        return null;
    }
    
    /**
     * Get component validation file path
     *
     * @param string $componentType
     * @return string|null
     */
    protected function getComponentValidationFilePath(string $componentType): ?string
    {
        $validationPath = base_path("install-modules/aiCore/validation/components/{$componentType}.json");
        
        if (File::exists($validationPath)) {
            return $validationPath;
        }
        
        return null;
    }
    
    /**
     * Get fix suggestions for an error type
     *
     * @param string $errorType
     * @param string|null $componentType
     * @return array|null
     */
    protected function getFixSuggestions(string $errorType, ?string $componentType): ?array
    {
        $fixSuggestions = [
            'unknown_component_type' => [
                'Check if the component type is misspelled.',
                'Verify that the component type is defined in the validation rules.',
                'Look in component-map.json to see if it needs an alias.',
                'Check available component types in install-modules/aiCore/validation/components/.'
            ],
            'unknown_prop' => [
                'Check for typos in the prop name.',
                'Look at the component validation rules to see available props.',
                'The prop might need to be in a different location (e.g., in model instead of props).',
                'If this is a new prop, add it to the component validation rules.'
            ],
            'missing_required_key' => [
                'Add the required key to the component.',
                'Look at the component validation rules to see required keys.',
                'Check if the component needs a model/slots/children/props section.'
            ],
            'invalid_json_root_not_array' => [
                'Ensure the JSON root is an array or object.',
                'Check for syntax errors in the JSON file.',
                'Make sure the file encoding is UTF-8.'
            ]
        ];
        
        if (isset($fixSuggestions[$errorType])) {
            $suggestions = $fixSuggestions[$errorType];
            
            // Add component-specific suggestions
            if ($componentType && strpos($errorType, 'unknown_prop') === 0) {
                $componentExample = $this->getComponentExample($componentType);
                if ($componentExample) {
                    $suggestions[] = "See the example for this component type.";
                }
            }
            
            return $suggestions;
        }
        
        return null;
    }
    
    /**
     * Get documentation links for an error type
     *
     * @param string $errorType
     * @param string|null $componentType
     * @return array
     */
    protected function getDocumentationLinks(string $errorType, ?string $componentType): array
    {
        $links = [];
        
        // Common documentation links
        $links[] = 'docs/development/json-validation.md';
        
        // Error-specific links
        switch ($errorType) {
            case 'unknown_component_type':
                $links[] = 'install-modules/aiCore/validation/component-map.json';
                break;
                
            case 'unknown_prop':
            case 'missing_required_key':
            case 'invalid_props_type':
                if ($componentType) {
                    $links[] = "install-modules/aiCore/validation/components/{$componentType}.json";
                }
                break;
                
            case 'json_syntax_error':
                $links[] = 'docs/development/json-syntax.md';
                break;
        }
        
        // Component-specific links
        if ($componentType) {
            $docs = [
                "docs/development/components/{$componentType}.md",
                "docs/components/{$componentType}.md",
                "implement-modules/playground/v1/examples/{$componentType}.json"
            ];
            
            foreach ($docs as $docPath) {
                if (File::exists(base_path($docPath))) {
                    $links[] = $docPath;
                }
            }
        }
        
        return $links;
    }
    
    /**
     * Get additional context for specific error types
     *
     * @param string $errorType
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return array|null
     */
    protected function getAdditionalErrorContext(string $errorType, ErrorDetectedEvent $event): ?array
    {
        $context = [];
        
        switch ($errorType) {
            case 'unknown_component_type':
                // Suggest similar component types
                $similarComponents = $this->findSimilarComponentTypes($event->componentType);
                if (!empty($similarComponents)) {
                    $context['suggested_component_types'] = $similarComponents;
                }
                break;
                
            case 'unknown_prop':
                // Get the unknown prop and path from context
                $unknownProp = $event->context['unknown_key'] ?? $event->context['key'] ?? null;
                if ($unknownProp && $event->componentType) {
                    // Find similarly named props for this component
                    $similarProps = $this->findSimilarProps($event->componentType, $unknownProp);
                    if (!empty($similarProps)) {
                        $context['suggested_props'] = $similarProps;
                    }
                }
                break;
        }
        
        return $context;
    }
    
    /**
     * Find component types similar to a given name
     *
     * @param string|null $componentType
     * @return array
     */
    protected function findSimilarComponentTypes(?string $componentType): array
    {
        if (!$componentType) {
            return [];
        }
        
        $componentTypeLower = strtolower($componentType);
        $similarComponents = [];
        
        // Try to find component validation files
        $componentsDirPath = base_path('install-modules/aiCore/validation/components');
        if (File::isDirectory($componentsDirPath)) {
            $files = File::files($componentsDirPath);
            
            foreach ($files as $file) {
                $filename = $file->getBasename('.json');
                
                // Skip if filename contains '.' (like .doc.md, .example.json)
                if (strpos($filename, '.') !== false) {
                    continue;
                }
                
                // Check filename similarity
                $similarity = similar_text($componentTypeLower, strtolower($filename), $percent);
                
                if ($percent > 70) {
                    $similarComponents[] = $filename;
                }
            }
        }
        
        return $similarComponents;
    }
    
    /**
     * Find props similar to a given prop name for a component type
     *
     * @param string|null $componentType
     * @param string|null $propName
     * @return array
     */
    protected function findSimilarProps(?string $componentType, ?string $propName): array
    {
        if (!$componentType || !$propName) {
            return [];
        }
        
        $componentTypeLower = strtolower($componentType);
        $propNameLower = strtolower($propName);
        $similarProps = [];
        
        // Get component validation file
        $validationPath = base_path("install-modules/aiCore/validation/components/{$componentType}.json");
        if (File::exists($validationPath)) {
            try {
                $validationData = json_decode(File::get($validationPath), true);
                
                if (isset($validationData['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
                    $propsStructure = $validationData['nestedValidation']['structure']['props']['nestedValidation']['structure'];
                    $availableProps = array_keys($propsStructure);
                    
                    foreach ($availableProps as $availableProp) {
                        // Check prop name similarity
                        $similarity = similar_text($propNameLower, strtolower($availableProp), $percent);
                        
                        if ($percent > 70) {
                            $similarProps[] = $availableProp;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore errors in finding similar props
            }
        }
        
        return $similarProps;
    }
} 