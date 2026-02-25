<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Hooks\FileFacade as FacadesFile;

/**
 * Listener that generates documentation snippets for error types
 */
class DocumentationGeneratorListener
{
    protected array $componentDocsCache = [];
    protected array $errorTypeDocsCache = [];
    
    /**
     * @var string Base path for documentation
     */
    protected string $docsBasePath;
    
    /**
     * Initialize the listener
     */
    public function __construct()
    {
        $this->docsBasePath = base_path('install-modules/aiCore/docs');
    }
    
    /**
     * Handle the error detected event
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        $errorSlug = $event->errorSlug;
        $componentType = $event->componentType;
        
        if (!is_array($event->context)) {
            $event->context = [];
        }
        
        // Load generic error type documentation
        $errorDocs = $this->getErrorTypeDocs($errorSlug);
        if (!empty($errorDocs)) {
            $event->context['error_docs'] = $errorDocs;
        }
        
        // If we have a component type, try to load component-specific docs
        if ($componentType) {
            $componentDocs = $this->getComponentDocs($componentType);
            if (!empty($componentDocs)) {
                $event->context['component_docs'] = $componentDocs;
            }
            
            // Try to find component-specific error docs
            $componentErrorDocs = $this->getComponentErrorDocs($componentType, $errorSlug);
            if (!empty($componentErrorDocs)) {
                $event->context['component_error_docs'] = $componentErrorDocs;
            }
        }
        
        // Find examples that demonstrate the correct approach
        $examples = $this->findExamples($errorSlug, $componentType);
        if (!empty($examples)) {
            $event->context['examples'] = $examples;
        }
        
        // Find related documentation links
        $docLinks = $this->findDocumentationLinks($errorSlug, $componentType);
        if (!empty($docLinks)) {
            $event->context['doc_links'] = $docLinks;
        }
        
        Log::channel(Config::get('logging.default'))->debug(
            "[DocumentationGeneratorListener] Generated docs for {$errorSlug}" . 
            ($componentType ? " in component {$componentType}" : "")
        );
    }
    
    /**
     * Get documentation for an error type
     *
     * @param string $errorType Error type identifier
     * @return array Documentation data
     */
    protected function getErrorTypeDocs(string $errorType): array
    {
        // Check cache first
        if (isset($this->errorTypeDocsCache[$errorType])) {
            return $this->errorTypeDocsCache[$errorType];
        }
        
        // Try to load from error documentation file
        $errorDocsPath = $this->docsBasePath . '/errors/' . $errorType . '.md';
        if (FacadesFile::exists($errorDocsPath)) {
            $content = FacadesFile::get($errorDocsPath);
            $this->errorTypeDocsCache[$errorType] = [
                'title' => $this->extractTitle($content),
                'description' => $this->extractDescription($content),
                'solution' => $this->extractSolution($content)
            ];
            return $this->errorTypeDocsCache[$errorType];
        }
        
        // If no specific file, try to load from generic error docs
        $genericDocsPath = $this->docsBasePath . '/error-types.json';
        if (FacadesFile::exists($genericDocsPath)) {
            try {
                $genericDocs = json_decode(FacadesFile::get($genericDocsPath), true, 512, JSON_THROW_ON_ERROR);
                if (isset($genericDocs[$errorType])) {
                    $this->errorTypeDocsCache[$errorType] = $genericDocs[$errorType];
                    return $genericDocs[$errorType];
                }
            } catch (\Throwable $e) {
                Log::channel(Config::get('logging.default'))->warning(
                    "[DocumentationGeneratorListener] Error loading generic docs: " . $e->getMessage()
                );
            }
        }
        
        // Fallback - generate basic docs from error type name
        $title = str_replace('_', ' ', $errorType);
        $title = ucwords($title);
        
        $this->errorTypeDocsCache[$errorType] = [
            'title' => $title,
            'description' => "This error occurs when there is an issue with {$title}.",
            'solution' => "Review the component documentation and ensure it follows the expected format."
        ];
        
        return $this->errorTypeDocsCache[$errorType];
    }
    
    /**
     * Get documentation for a component
     *
     * @param string $componentType Component type
     * @return array Documentation data
     */
    protected function getComponentDocs(string $componentType): array
    {
        // Check cache first
        if (isset($this->componentDocsCache[$componentType])) {
            return $this->componentDocsCache[$componentType];
        }
        
        // Try to load from component documentation file
        $componentDocsPath = $this->docsBasePath . '/components/' . $componentType . '.md';
        if (FacadesFile::exists($componentDocsPath)) {
            $content = FacadesFile::get($componentDocsPath);
            $this->componentDocsCache[$componentType] = [
                'title' => $this->extractTitle($content),
                'description' => $this->extractDescription($content),
                'usage' => $this->extractUsage($content)
            ];
            return $this->componentDocsCache[$componentType];
        }
        
        // Try to load from component definition JSON
        $componentJsonPath = base_path('install-modules/aiCore/validation/components/' . $componentType . '.json');
        if (FacadesFile::exists($componentJsonPath)) {
            try {
                $componentJson = json_decode(FacadesFile::get($componentJsonPath), true, 512, JSON_THROW_ON_ERROR);
                $docs = [
                    'title' => $componentType,
                    'description' => $componentJson['description'] ?? "Component of type {$componentType}"
                ];
                
                // Extract accepted properties if available
                if (isset($componentJson['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
                    $propsDefs = $componentJson['nestedValidation']['structure']['props']['nestedValidation']['structure'];
                    $acceptedProps = [];
                    foreach ($propsDefs as $propName => $propDef) {
                        $propType = $propDef['type'] ?? 'any';
                        $propDesc = $propDef['description'] ?? '';
                        $acceptedProps[$propName] = [
                            'type' => $propType,
                            'description' => $propDesc,
                            'required' => $propDef['required'] ?? false
                        ];
                    }
                    $docs['properties'] = $acceptedProps;
                }
                
                $this->componentDocsCache[$componentType] = $docs;
                return $docs;
            } catch (\Throwable $e) {
                Log::channel(Config::get('logging.default'))->warning(
                    "[DocumentationGeneratorListener] Error loading component definition: " . $e->getMessage()
                );
            }
        }
        
        // Fallback
        return [
            'title' => $componentType,
            'description' => "Component of type {$componentType}.",
            'note' => "No detailed documentation available for this component."
        ];
    }
    
    /**
     * Get documentation for a specific error in a specific component
     *
     * @param string $componentType Component type
     * @param string $errorType Error type
     * @return array Documentation data
     */
    protected function getComponentErrorDocs(string $componentType, string $errorType): array
    {
        // Try to load from component-specific error docs
        $specificDocsPath = $this->docsBasePath . '/components/' . $componentType . '/errors/' . $errorType . '.md';
        if (FacadesFile::exists($specificDocsPath)) {
            $content = FacadesFile::get($specificDocsPath);
            return [
                'title' => $this->extractTitle($content),
                'description' => $this->extractDescription($content),
                'solution' => $this->extractSolution($content)
            ];
        }
        
        // Try to load from examples repository
        $examplesPath = base_path('implement-modules/playground/v1/examples/' . $componentType . '.json');
        if (FacadesFile::exists($examplesPath)) {
            return [
                'title' => "Example for {$componentType}",
                'description' => "See the example file for {$componentType} usage",
                'example_path' => $examplesPath
            ];
        }
        
        return [];
    }
    
    /**
     * Find examples for a specific error or component
     *
     * @param string $errorType Error type
     * @param string|null $componentType Component type
     * @return array Example data
     */
    protected function findExamples(string $errorType, ?string $componentType): array
    {
        $examples = [];
        
        // Error-specific examples
        $errorExamplesPath = $this->docsBasePath . '/examples/errors/' . $errorType . '.json';
        if (FacadesFile::exists($errorExamplesPath)) {
            try {
                $errorExamples = json_decode(FacadesFile::get($errorExamplesPath), true, 512, JSON_THROW_ON_ERROR);
                $examples['error_examples'] = $errorExamples;
            } catch (\Throwable $e) {
                // Just log and continue
                Log::channel(Config::get('logging.default'))->warning(
                    "[DocumentationGeneratorListener] Error loading error examples: " . $e->getMessage()
                );
            }
        }
        
        // Component-specific examples
        if ($componentType) {
            $componentExamplesPath = $this->docsBasePath . '/examples/components/' . $componentType . '.json';
            if (FacadesFile::exists($componentExamplesPath)) {
                try {
                    $componentExamples = json_decode(FacadesFile::get($componentExamplesPath), true, 512, JSON_THROW_ON_ERROR);
                    $examples['component_examples'] = $componentExamples;
                } catch (\Throwable $e) {
                    // Just log and continue
                    Log::channel(Config::get('logging.default'))->warning(
                        "[DocumentationGeneratorListener] Error loading component examples: " . $e->getMessage()
                    );
                }
            }
            
            // Implementation examples from playground
            $implExamplesPath = base_path('implement-modules/playground/v1/examples/' . $componentType . '.json');
            if (FacadesFile::exists($implExamplesPath)) {
                $examples['implementation_examples'] = [
                    'path' => $implExamplesPath,
                    'note' => "See implementation example for {$componentType}"
                ];
            }
        }
        
        return $examples;
    }
    
    /**
     * Find documentation links for an error or component
     *
     * @param string $errorType Error type
     * @param string|null $componentType Component type
     * @return array Documentation links
     */
    protected function findDocumentationLinks(string $errorType, ?string $componentType): array
    {
        $links = [];
        
        // General validation documentation
        $links[] = [
            'title' => 'Validation Guide',
            'path' => $this->docsBasePath . '/validation-guide.md',
            'type' => 'general'
        ];
        
        // Error-specific documentation
        $errorDocsPath = $this->docsBasePath . '/errors/' . $errorType . '.md';
        if (FacadesFile::exists($errorDocsPath)) {
            $links[] = [
                'title' => 'Error Documentation',
                'path' => $errorDocsPath,
                'type' => 'error'
            ];
        }
        
        // Component-specific documentation
        if ($componentType) {
            $componentDocsPath = $this->docsBasePath . '/components/' . $componentType . '.md';
            if (FacadesFile::exists($componentDocsPath)) {
                $links[] = [
                    'title' => 'Component Documentation',
                    'path' => $componentDocsPath,
                    'type' => 'component'
                ];
            }
            
            // Component definition
            $componentJsonPath = base_path('install-modules/aiCore/validation/components/' . $componentType . '.json');
            if (FacadesFile::exists($componentJsonPath)) {
                $links[] = [
                    'title' => 'Component Definition',
                    'path' => $componentJsonPath,
                    'type' => 'definition'
                ];
            }
        }
        
        return $links;
    }
    
    /**
     * Extract the title from markdown content
     *
     * @param string $content Markdown content
     * @return string Title or empty string
     */
    protected function extractTitle(string $content): string
    {
        if (preg_match('/^#\s+(.+)$/m', $content, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
    
    /**
     * Extract the description from markdown content
     *
     * @param string $content Markdown content
     * @return string Description or empty string
     */
    protected function extractDescription(string $content): string
    {
        // Get content after title and before next heading
        if (preg_match('/^#\s+.+\n+(.+?)(?=\n+#|$)/s', $content, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
    
    /**
     * Extract the solution section from markdown content
     *
     * @param string $content Markdown content
     * @return string Solution or empty string
     */
    protected function extractSolution(string $content): string
    {
        // Get content after "## Solution" heading
        if (preg_match('/^##\s+Solution.*\n+(.+?)(?=\n+#|$)/sm', $content, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
    
    /**
     * Extract the usage section from markdown content
     *
     * @param string $content Markdown content
     * @return string Usage or empty string
     */
    protected function extractUsage(string $content): string
    {
        // Get content after "## Usage" heading
        if (preg_match('/^##\s+Usage.*\n+(.+?)(?=\n+#|$)/sm', $content, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
} 