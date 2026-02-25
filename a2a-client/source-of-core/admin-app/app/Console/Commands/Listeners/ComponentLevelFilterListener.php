<?php

namespace App\Console\Commands\Listeners;

use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use App\Hooks\FileFacade;
use Illuminate\Support\Facades\Log;

/**
 * Filters errors based on component importance levels loaded from validation files.
 * Prevents high-level components (like div, span) from generating too many errors.
 * Also enriches error context with documentation based on verbosity level.
 */
class ComponentLevelFilterListener
{
    /** @var array Core component levels cache, lower number = more critical */
    protected array $componentLevels = [];
    
    /** @var array Fully assembled component cards with resolved references */
    protected array $componentCards = [];
    
    /** @var array Always allowed error types regardless of component level */
    protected array $alwaysAllowedErrorTypes = [
        'unknown_component_type',
        'json_syntax_error',
        'file_read_error',
        'missing_required_key'
    ];
    
    /** @var int Maximum component level to show errors for */
    protected int $maxComponentLevel = 10;
    
    /** @var array Whitelisted component types that always show errors */
    protected array $whitelistedComponents = [
        'page', 'form', 'table', 'datatable', 'chart'
    ];
    
    /** @var array Blacklisted components that never show certain errors */
    protected array $blacklistedComponents = [
        'div' => ['unknown_prop'],
        'span' => ['unknown_prop'],
        'p' => ['unknown_prop'],
        'h1' => ['unknown_prop'],
        'h2' => ['unknown_prop'],
        'h3' => ['unknown_prop'],
        'h4' => ['unknown_prop'],
        'label' => ['unknown_prop'],
        'button' => ['unknown_prop']
    ];
    
    /** @var string Base path for component validation files */
    protected string $basePath;
    
    /** @var string Common references path */
    protected string $commonPath;

    /** @var array Documentation content for components */
    protected array $componentDocs = [];
    
    public function __construct()
    {
        $this->basePath = base_path('install-modules/aiCore/validation/components');
        $this->commonPath = base_path('install-modules/aiCore/validation/common');
        $this->loadComponentCards();
    }
    
    /**
     * Load and assemble full component cards with resolved references
     */
    protected function loadComponentCards(): void
    {
        // First load common reference files
        $commonRefs = $this->loadCommonReferences();
        
        if (!FileFacade::isDirectory($this->basePath)) {
            Log::warning("Component validation directory not found: {$this->basePath}");
            return;
        }
        
        try {
            $files = FileFacade::files($this->basePath);
            foreach ($files as $file) {
                $componentName = strtolower(basename($file, '.json'));
                $card = $this->loadCardWithReferences($file, $commonRefs);
                
                // Store the assembled card
                $this->componentCards[$componentName] = $card;
                
                // Extract level from card
                if (isset($card['level']) && is_numeric($card['level'])) {
                    $this->componentLevels[$componentName] = (int)$card['level'];
                } else {
                    // Default level if not specified (non-critical)
                    $this->componentLevels[$componentName] = 5;
                }

                // Store documentation links and example data
                if (isset($card['documentationLink'])) {
                    $this->componentDocs[$componentName]['docLink'] = $card['documentationLink'];
                }
                if (isset($card['examples'])) {
                    $this->componentDocs[$componentName]['examples'] = $card['examples'];
                }
                if (isset($card['description'])) {
                    $this->componentDocs[$componentName]['description'] = $card['description'];
                }
                if (isset($card['implementationNotes'])) {
                    $this->componentDocs[$componentName]['notes'] = $card['implementationNotes'];
                }
            }
            
            Log::info("Loaded " . count($this->componentLevels) . " component levels from validation files");
        } catch (\Exception $e) {
            Log::warning("Failed to load component cards: {$e->getMessage()}");
        }
    }
    
    /**
     * Load common reference files (props.json, root.json, etc.)
     * 
     * @return array Common reference data by filename
     */
    protected function loadCommonReferences(): array
    {
        $references = [];
        
        if (!FileFacade::isDirectory($this->commonPath)) {
            return $references;
        }
        
        try {
            $files = FileFacade::files($this->commonPath);
            foreach ($files as $file) {
                $refName = basename($file);
                $content = FileFacade::get($file);
                $data = json_decode($content, true);
                
                if (is_array($data)) {
                    $references[$refName] = $data;
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to load common references: {$e->getMessage()}");
        }
        
        return $references;
    }
    
    /**
     * Load and resolve a component card with its references
     * 
     * @param string $filePath Card file path
     * @param array $commonRefs Common reference data
     * @return array Assembled card data
     */
    protected function loadCardWithReferences(string $filePath, array $commonRefs): array
    {
        try {
            $content = FileFacade::get($filePath);
            $data = json_decode($content, true);
            
            if (!is_array($data)) {
                return [];
            }
            
            // Resolve $ref references recursively
            $this->resolveReferences($data, $commonRefs);
            
            return $data;
        } catch (\Exception $e) {
            Log::warning("Failed to load card {$filePath}: {$e->getMessage()}");
            return [];
        }
    }
    
    /**
     * Recursively resolve $ref references in the component data
     * 
     * @param array &$data Component data being processed
     * @param array $commonRefs Common reference data
     * @return void
     */
    protected function resolveReferences(array &$data, array $commonRefs): void
    {
        foreach ($data as $key => &$value) {
            if ($key === '$ref' && is_string($value)) {
                // Handle reference resolution
                $refPath = $value;
                $refContent = $this->resolveReference($refPath, $commonRefs);
                
                if ($refContent) {
                    // Remove $ref key and merge the reference content
                    unset($data['$ref']);
                    $data = array_merge($data, $refContent);
                }
            } elseif (is_array($value)) {
                // Recursively process nested arrays
                $this->resolveReferences($value, $commonRefs);
            }
        }
    }
    
    /**
     * Resolve a single reference path to its content
     * 
     * @param string $refPath Reference path (e.g. "../common/props.json")
     * @param array $commonRefs Common reference data
     * @return array|null Resolved reference content
     */
    protected function resolveReference(string $refPath, array $commonRefs): ?array
    {
        // Extract filename from path
        $filename = basename($refPath);
        
        // Check if it's a common reference
        if (str_contains($refPath, '../common/') && isset($commonRefs[$filename])) {
            return $commonRefs[$filename];
        }
        
        // If it's a direct path, try to load it
        $fullPath = base_path(str_replace('../', 'install-modules/aiCore/validation/', $refPath));
        if (FileFacade::exists($fullPath)) {
            $content = FileFacade::get($fullPath);
            return json_decode($content, true);
        }
        
        return null;
    }
    
    /**
     * Get component level (from pre-loaded data)
     * 
     * @param string $componentType Component type
     * @return int Component level (0-5, lower = more critical)
     */
    public function getComponentLevel(string $componentType): int
    {
        $componentType = strtolower($componentType);
        return $this->componentLevels[$componentType] ?? 5; // Default to non-critical
    }
    
    /**
     * Get component documentation if available
     *
     * @param string $componentType Component type
     * @return array Documentation data
     */
    public function getComponentDocumentation(string $componentType): array
    {
        $componentType = strtolower($componentType);
        return $this->componentDocs[$componentType] ?? [];
    }

    /**
     * Get component validation structure if available
     * 
     * @param string $componentType Component type
     * @return array|null Component structure
     */
    public function getComponentStructure(string $componentType): ?array
    {
        $componentType = strtolower($componentType);
        $card = $this->componentCards[$componentType] ?? null;

        if (!$card) {
            return null;
        }

        return $card['nestedValidation']['structure'] ?? null;
    }

    /**
     * Get allowed props for a component
     * 
     * @param string $componentType Component type
     * @return array List of valid property names
     */
    public function getAllowedProps(string $componentType): array
    {
        $componentType = strtolower($componentType);
        $structure = $this->getComponentStructure($componentType);
        
        if (!$structure || !isset($structure['props']['nestedValidation']['structure'])) {
            return [];
        }
        
        // If structure uses allOf with references, we need to extract the props
        $propsStructure = $structure['props']['nestedValidation']['structure'];
        if (isset($propsStructure['allOf']) && is_array($propsStructure['allOf'])) {
            $props = [];
            foreach ($propsStructure['allOf'] as $part) {
                if (is_array($part)) {
                    $props = array_merge($props, array_keys($part));
                }
            }
            return $props;
        }
        
        return array_keys($propsStructure);
    }

    /**
     * Check if a component has a specific property
     * 
     * @param string $componentType Component type
     * @param string $propName Property name
     * @return bool True if the property is valid
     */
    public function hasAllowedProp(string $componentType, string $propName): bool
    {
        return in_array($propName, $this->getAllowedProps($componentType));
    }
    
    /**
     * Determine if an error should be shown for a component
     */
    public function shouldShowError(string $componentType, string $errorType): bool
    {
        // Always allow certain error types
        if (in_array($errorType, $this->alwaysAllowedErrorTypes)) {
            return true;
        }
        
        // Convert to lowercase for case-insensitive comparison
        $componentType = strtolower($componentType);
        
        // Always allow errors for whitelisted components
        if (in_array($componentType, $this->whitelistedComponents)) {
            return true;
        }
        
        // Check if this component is blacklisted for this error type
        if (isset($this->blacklistedComponents[$componentType]) && 
            in_array($errorType, $this->blacklistedComponents[$componentType])) {
            return false;
        }
        
        // Get component level (lower = more critical)
        $level = $this->getComponentLevel($componentType);
        
        // Only show errors for components with level <= maxComponentLevel
        return $level <= $this->maxComponentLevel;
    }
    
    /**
     * Handle error detected event by filtering by component level and adding documentation
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        $componentType = $event->componentType ?? null;
        $errorType = $event->errorSlug ?? 'unknown';
        
        // If no component type, allow the error
        if (!$componentType) {
            return;
        }
        
        // Create suggestions for HTML components if they're missing common props
        if ($errorType === 'unknown_prop') {
            $propName = $event->context['unknown_prop_key'] ?? $event->context['key'] ?? null;
            if ($propName) {
                $this->enrichUnknownPropError($event, $componentType, $propName);
            }
        }
        
        // Add component documentation based on verbosity
        $this->addComponentDocumentation($event, $componentType);
        
        // Check if this error should be shown
        if (!$this->shouldShowError($componentType, $errorType)) {
            // Mark this error to be ignored in ValidationEventCollector
            $event->context['ignore_error'] = true;
            $event->context['ignored_reason'] = "Component '{$componentType}' level too high for error type '{$errorType}'";
            
            // Add debugging information 
            if (class_exists('Illuminate\Support\Facades\Log')) {
                \Illuminate\Support\Facades\Log::debug("Filtering out error: {$errorType} for component {$componentType} with level " . $this->getComponentLevel($componentType));
            }
        } else {
            // For debugging, log what errors are passing through the filter
            if (class_exists('Illuminate\Support\Facades\Log')) {
                \Illuminate\Support\Facades\Log::debug("Showing error: {$errorType} for component {$componentType} with level " . $this->getComponentLevel($componentType));
            }
        }
    }

    /**
     * Add component documentation to error context based on verbosity level
     * 
     * @param ErrorDetectedEvent $event Error event
     * @param string $componentType Component type
     */
    protected function addComponentDocumentation(ErrorDetectedEvent $event, string $componentType): void
    {
        $componentDocs = $this->getComponentDocumentation($componentType);
        
        // Basic documentation (for -v)
        if (!empty($componentDocs['description'])) {
            $event->context['component_description'] = $componentDocs['description'];
        }
        
        // Add documentation link path (for -vv)
        if (!empty($componentDocs['docLink'])) {
            $event->context['docs'] = $event->context['docs'] ?? [];
            $event->context['docs'][] = $componentDocs['docLink'];
        }
        
        // Add implementation notes (for -vv)
        if (!empty($componentDocs['notes'])) {
            $event->context['implementation_notes'] = $componentDocs['notes'];
        }
        
        // Add examples (for -vvv)
        if (!empty($componentDocs['examples'])) {
            $event->context['example'] = $componentDocs['examples'][0] ?? null;
        }

        // Add component level information
        $level = $this->getComponentLevel($componentType);
        $event->context['component_level'] = $level;
        
        $levelNames = [
            0 => 'Critical',
            1 => 'High',
            2 => 'Medium',
            3 => 'Standard',
            4 => 'Basic',
            5 => 'HTML Level'
        ];
        
        $event->context['component_level_name'] = $levelNames[$level] ?? 'Unknown';
    }

    /**
     * Enrich unknown property errors with context-specific suggestions
     *
     * @param ErrorDetectedEvent $event Error event
     * @param string $componentType Component type
     * @param string $propName Property name
     */
    protected function enrichUnknownPropError(ErrorDetectedEvent $event, string $componentType, string $propName): void
    {
        // For HTML components, provide suggestions for common props
        $htmlComponents = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'a', 'input'];
        
        if (in_array(strtolower($componentType), $htmlComponents)) {
            // Common HTML attributes that are often required
            $commonHtmlAttributes = [
                'children' => 'Content that should be placed inside the HTML element',
                'id' => 'HTML ID attribute to uniquely identify the element',
                'class' => 'CSS classes to style the element',
                'style' => 'Inline CSS styles',
                'role' => 'ARIA role for accessibility',
                'aria-label' => 'Accessible label for screen readers',
                'data-' => 'Custom data attributes should be placed in props',
                'src' => 'Image source URL (for img elements)',
                'alt' => 'Alternative text for images (for img elements)',
                'href' => 'Hyperlink reference (for a elements)',
                'width' => 'Width attribute (for img elements)',
                'height' => 'Height attribute (for img elements)'
            ];
            
            if (isset($commonHtmlAttributes[$propName])) {
                // This is a common HTML attribute, add explanation
                $event->context['suggestion'] = "'{$propName}' is a standard HTML attribute: " . $commonHtmlAttributes[$propName];
                
                // Example of correct structure
                $event->context['suggestion_example'] = "To use HTML attributes with component '{$componentType}', place them in the 'props' object:";
                $event->context['example'] = [
                    'type' => $componentType,
                    'props' => [
                        $propName => ($propName === 'children') ? 'Content goes here' : 'value'
                    ]
                ];
                
                // Special case for 'children' which is handled differently
                if ($propName === 'children') {
                    $event->context['suggestion_example'] = "For content/children, you can use either the 'children' property or place content directly:";
                    $event->context['example'] = [
                        [
                            'type' => $componentType,
                            'children' => 'Content goes here'
                        ],
                        [
                            'type' => $componentType,
                            'children' => [
                                'type' => 'span',
                                'children' => 'Nested content'
                            ]
                        ]
                    ];
                }
            }
        }
    }
} 