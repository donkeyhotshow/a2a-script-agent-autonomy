<?php

namespace App\Console\Commands;

use App\Console\Commands\Helpers\ModuleValidate\ValidationResultOutputHelper;
use App\Console\Commands\Helpers\ModuleValidate\ComponentRuleLoader;
use App\Console\Commands\Helpers\ModuleValidate\ComponentValidation;
use App\Console\Commands\Helpers\ModuleValidate\ModuleJsonProcessor;
use App\Console\Commands\Helpers\ModuleValidate\ModuleValidationLogHelper;
use App\Console\Commands\Helpers\ModuleValidate\ValidationConfigLoader;
use App\Console\Commands\Helpers\ModuleValidate\PaginationHelper;
use App\Console\Commands\Helpers\ModuleValidate\ErrorMessageGenerator;
use App\Hooks\FileFacade as FacadesFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Finder\Finder;
use Throwable;
use JsonException;
use App\Console\Commands\Listeners\UnknownComponentTypeListener;
use App\Console\Commands\Listeners\ErrorMessageGeneratorListener;
use App\Console\Commands\Listeners\SuggestionGeneratorListener;
use App\Console\Commands\Listeners\ValidationLoggerListener;
use App\Console\Commands\Listeners\ErrorCategorizer;
use App\Console\Commands\Listeners\DocumentationGeneratorListener;
use App\Console\Commands\Listeners\PropertyValidationListener;
use App\Console\Commands\Listeners\ComponentStructureValidator;
use App\Console\Commands\Listeners\ModelValidationListener;
use App\Console\Commands\Listeners\DataIntegrityValidationListener;
use App\Console\Commands\Listeners\ValidationContextEnricherListener;
use App\Console\Commands\Listeners\EventStatisticsListener;
use App\Console\Commands\Listeners\PropertyErrorSummaryListener;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use App\Console\Commands\Listeners\EnhancedSuggestionListener;
use App\Console\Commands\Listeners\ComponentLevelFilterListener;
use Illuminate\Support\Facades\File;
use App\Console\Commands\Listeners\FallbackValidationSummaryListener;
use App\Console\Commands\ValidationFinishedEvent;

// --- Event Definitions ---
class ValidationEvent {
    public string $filePath;
    public string $moduleName;
    public ?ValidateModuleJsonCommand $command; // Command instance or null for isolated tests

    public function __construct($command, string $moduleName, string $filePath) {
        // Accept either a command instance or moduleName string
        $this->command = $command instanceof ValidateModuleJsonCommand ? $command : null;
        $this->moduleName = $moduleName;
        $this->filePath = $filePath;
    }

    public function getCommand(): ValidateModuleJsonCommand {
        return $this->command;
    }
}
class FileDiscoveredEvent extends ValidationEvent {}
class JsonDecodedEvent extends ValidationEvent {
    public array $data;
    public function __construct(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, array $data) {
        parent::__construct($command, $moduleName, $filePath);
        $this->data = $data;
    }
}
class NodeEncounteredEvent extends ValidationEvent {
    public array $nodeData;
    public string $jsonPath;
    public ?array $componentRules;
    public string $modulePath; // Added modulePath for context

    public function __construct(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $modulePath, array $nodeData, string $jsonPath, ?array $componentRules) {
        parent::__construct($command, $moduleName, $filePath);
        $this->modulePath = $modulePath;
        $this->nodeData = $nodeData;
        $this->jsonPath = $jsonPath;
        $this->componentRules = $componentRules;
    }
}
class ErrorDetectedEvent extends ValidationEvent {
    public string $errorSlug;
    public string $jsonPath;
    public string $message;
    public array $context;
    public ?string $componentType;
    
    // Add static tracking
    private static int $errorCount = 0;
    
    public function __construct($commandOrModuleName, string $filePath, string $jsonPath, string $errorSlug, string $message = '', $context = [], $componentType = null) {
        $moduleName = is_string($commandOrModuleName) ? $commandOrModuleName : $commandOrModuleName->moduleName;
        $command = is_object($commandOrModuleName) ? $commandOrModuleName : null;
        
        parent::__construct($command, $moduleName, $filePath);
        $this->errorSlug = $errorSlug;
        $this->jsonPath = $jsonPath;
        $this->message = $message;
        
        // Ensure context is always an array
        $this->context = is_array($context) ? $context : [];
        
        // If componentType is an array and has 'component' key, extract it
        if (is_array($componentType) && isset($componentType['component'])) {
            $componentType = $componentType['component'];
        }
        
        // Ensure componentType is a string or null
        if (!is_string($componentType) && !is_null($componentType)) {
            $componentType = is_scalar($componentType) ? (string)$componentType : null;
        }
        
        $this->componentType = $componentType;
        
        // Increment error count
        self::$errorCount++;
    }
    
    // Add static methods to reset and access the error count
    public static function resetErrorCount(): void {
        self::$errorCount = 0;
    }
    
    public static function getErrorCount(): int {
        return self::$errorCount;
    }
}
class RulesLoadedEvent {
    public array $componentRulesGlobalCache; // Renamed for clarity
    public function __construct(array $componentRules /*, array $validationSuggestions REMOVED */) {
        $this->componentRulesGlobalCache = $componentRules;
        // $this->validationSuggestionsGlobalCache = $validationSuggestions; // REMOVED
    }
}
class ValidationCompletedEvent {
    public int $totalErrors;
    public function __construct(int $totalErrors) {
        $this->totalErrors = $totalErrors;
    }
}
class SystemErrorDetectedEvent extends ValidationEvent {
    public string $errorSlug;
    public string $message;
    public array $context;

    public function __construct(ValidateModuleJsonCommand $command, string $moduleName, string $filePath, string $errorSlug, string $message, array $context = []) {
        parent::__construct($command, $moduleName, $filePath);
        $this->errorSlug = $errorSlug;
        $this->message = $message;
        $this->context = $context;
    }
}
// --- End Event Definitions ---

class ValidateModuleJsonCommand extends Command
{
    use ValidationConfigLoader, 
        ModuleJsonProcessor, 
        ComponentValidation, 
        PaginationHelper, 
        ValidationResultOutputHelper;

    private const COMMON_REFERENCE_TEXT = "\nSee: Vue component (@Tag.vue or specific component, check component-map.json), UI guide (docs/development/review-ui.md), Example (implement-modules/playground/v1/pages/index.json)";

    protected $signature = 'validate:module-json {module? : The name of the installed module to validate (optional, defaults to all)} {--json : Output results as pretty-printed JSON for humans} {--human : Output results in human-readable format} {--group=message : Error grouping algorithm (message, component, structure)} {--max-lines-per-page=800 : Maximum number of output lines per page when pagination is enabled} {--interactive : Enable interactive pagination with user navigation} {--plain-docs : Display documentation in terminal instead of opening external viewers} {--super-verbose : Enable maximum verbosity level with all details} {--show-all : Display errors of all severity levels instead of just the minimum detected} {--disable-output=* : Disable specific output systems (specify multiple values separated by commas, e.g. "documentation_links,component_examples")}';
    protected $description = 'Validates JSON files within installed modules in install-modules directory.';
    protected array $mainConfig = [];
    protected array $outputSystemConfig = []; // Added: Configuration for output systems
    protected string $configBasePath;
    protected string $componentSourceBasePath;
    protected string $componentCleaningBasePath;
    protected string $sourceBasePath = 'implement-modules';
    protected array $componentValidationRulesCache = [];
    protected array $checkedComponentFiles = [];
    protected ModuleValidationLogHelper $logHelper;
    protected array $componentRulePathCache = [];
    private string $logFileName;
    private ComponentRuleLoader $ruleLoader;
    private UnknownComponentTypeListener $unknownComponentTypeListener;
    private ErrorMessageGeneratorListener $errorMessageGeneratorListener;
    private SuggestionGeneratorListener $suggestionGeneratorListener;
    private ValidationLoggerListener $validationLoggerListener;
    private ErrorCategorizer $errorCategorizer;
    private DocumentationGeneratorListener $documentationGeneratorListener;
    private PropertyValidationListener $propertyValidationListener;
    private ComponentStructureValidator $componentStructureValidator;
    private ModelValidationListener $modelValidationListener;
    private DataIntegrityValidationListener $dataIntegrityValidationListener;
    private ValidationContextEnricherListener $validationContextEnricherListener;
    private EventStatisticsListener $eventStatisticsListener;
    private PropertyErrorSummaryListener $propertyErrorSummaryListener;
    private EnhancedSuggestionListener $enhancedSuggestionListener;
    private ComponentLevelFilterListener $componentLevelFilterListener;
    /**
     * Collected errors grouped by file path.
     * @var array<string, array>
     */

    // --- Event Dispatcher Infrastructure ---
    private array $eventListeners = []; // Renamed from $listeners to avoid conflict
    
    // Caches populated by event handlers (e.g., from RulesLoadedEvent)
    protected array $globalComponentRules = []; 
    // protected array $globalValidationSuggestions = []; // REMOVED
    
    // Error aggregation, used by ValidationResultOutputHelper trait
    // protected array $groupedErrors = []; // This is declared in ValidationResultOutputHelper
    
    protected array $collectedErrorComponentTypes = []; // ADDED for new listener logic

    protected int $errorCount = 0; // ADDED: Counter for validation errors

    // Holds the current module name for event dispatching
    public string $moduleName = '';

    /**
     * Holds configuration mapping for modules, used by findSourceFilePath.
     * @var array<string, mixed>
     */
    protected array $moduleConfig = [];

    public function __construct(
        ComponentRuleLoader $ruleLoader,
        UnknownComponentTypeListener $unknownComponentTypeListener,
        ErrorMessageGeneratorListener $errorMessageGeneratorListener,
        SuggestionGeneratorListener $suggestionGeneratorListener,
        ValidationLoggerListener $validationLoggerListener,
        ErrorCategorizer $errorCategorizer,
        DocumentationGeneratorListener $documentationGeneratorListener,
        PropertyValidationListener $propertyValidationListener,
        ComponentStructureValidator $componentStructureValidator,
        ModelValidationListener $modelValidationListener,
        DataIntegrityValidationListener $dataIntegrityValidationListener,
        EnhancedSuggestionListener $enhancedSuggestionListener,
        ComponentLevelFilterListener $componentLevelFilterListener
    )
    {
        parent::__construct();
        
        $this->ruleLoader = $ruleLoader;
        $this->logHelper = new ModuleValidationLogHelper();
        
        // Register event listeners
        $this->subscribeListener(NodeEncounteredEvent::class, [$this, 'onNodeEncounteredForComponentValidation']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$this, 'onErrorDetected']);
        $this->subscribeListener(ValidationCompletedEvent::class, [$this, 'onValidationCompleted']);
        
        // Register component validation listeners
        $this->subscribeListener(NodeEncounteredEvent::class, [$unknownComponentTypeListener, 'handle']);
        $this->subscribeListener(NodeEncounteredEvent::class, [$propertyValidationListener, 'handle']);
        $this->subscribeListener(NodeEncounteredEvent::class, [$componentStructureValidator, 'handle']);
        $this->subscribeListener(NodeEncounteredEvent::class, [$modelValidationListener, 'handle']);
        $this->subscribeListener(NodeEncounteredEvent::class, [$dataIntegrityValidationListener, 'handle']);
        
        // Register error processing listeners
        $this->subscribeListener(ErrorDetectedEvent::class, [$componentLevelFilterListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$enhancedSuggestionListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$errorMessageGeneratorListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$suggestionGeneratorListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$validationLoggerListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$documentationGeneratorListener, 'handle']);
        $this->subscribeListener(ErrorDetectedEvent::class, [$errorCategorizer, 'handle']);
        
        // Store listener instances
        $this->unknownComponentTypeListener = $unknownComponentTypeListener;
        $this->errorMessageGeneratorListener = $errorMessageGeneratorListener;
        $this->suggestionGeneratorListener = $suggestionGeneratorListener;
        $this->validationLoggerListener = $validationLoggerListener;
        $this->errorCategorizer = $errorCategorizer;
        $this->documentationGeneratorListener = $documentationGeneratorListener;
        $this->propertyValidationListener = $propertyValidationListener;
        $this->componentStructureValidator = $componentStructureValidator;
        $this->modelValidationListener = $modelValidationListener;
        $this->dataIntegrityValidationListener = $dataIntegrityValidationListener;
        $this->enhancedSuggestionListener = $enhancedSuggestionListener;
        $this->componentLevelFilterListener = $componentLevelFilterListener;
    }

    private function subscribeListener(string $eventName, callable $listener): void
    {
        $this->eventListeners[$eventName][] = $listener;
    }

    /**
     * Dispatches an event to all relevant listeners.
     *
     * @param object $event The event object to dispatch.
     */
    protected function dispatchEvent(object $event): void
    {
        $eventName = get_class($event);
        $this->info("[DISPATCHER] Event dispatched: {$eventName}"); // DEBUG

        if (isset($this->eventListeners[$eventName])) {
            foreach ($this->eventListeners[$eventName] as $listener) {
                // $this->logHelper->logDebug("[DISPATCHER] Calling listener: {$listenerName} for event {$eventName}"); // DEBUG
                try {
                    call_user_func($listener, $event);
                } catch (Throwable $e) {
                    // Use the logHelper for logging listener errors
                    // $this->logHelper->logError("Error in listener for {$eventName}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                    if (method_exists($this, 'error')) { // Ensure command context for error output to console
                        $this->error("Listener error for {$eventName}: " . $e->getMessage());
                    }
                }
            }
        }
    }

    public function handle(): int
    {
        $moduleName = $this->argument('module');
        $this->info("Starting validation for module: {$moduleName}");

        // Initialize validation
        $this->initializeValidation();

        $this->info("Initialized validation. Proceeding to validate module.");

        // Validate the module
        $this->validateModule($moduleName);

        $this->info("Module validation completed. Checking for errors.");

        // Get total errors
        $totalErrors = ValidationEventCollector::getTotalErrors();

        $this->info("Total errors reported by ValidationEventCollector: {$totalErrors}");

        // Dispatch validation finished event
        event(new ValidationFinishedEvent(ValidationEventCollector::getStats()));

        // Output results
        if ($totalErrors > 0) {
            $this->error("Validation completed with {$totalErrors} errors.");
            $this->printValidationResults(ValidationEventCollector::getAllErrors());
            return 1;
        }

        $this->info("Validation completed successfully with no errors.");
        return 0;
    }

    protected function outputErrors(): void
    {
        $errors = ValidationEventCollector::getAllErrors();
        
        foreach ($errors as $error) {
            $this->error(sprintf(
                "[%s] %s in %s:%d\nPath: %s\nComponent: %s\nMessage: %s",
                $error['errorSlug'],
                $error['message'],
                $error['file'],
                $error['line'],
                $error['jsonPath'],
                $error['componentType'],
                $error['message']
            ));
        }
    }

    protected function onNodeEncounteredForComponentValidation(NodeEncounteredEvent $event): void
    {
        $node = $event->nodeData;
        $componentType = $node['type'] ?? null;
        $jsonPath = $event->jsonPath;

        if (!$componentType) {
            event(new ErrorDetectedEvent(
                $this,
                $event->moduleName,
                $event->filePath,
                $jsonPath,
                'missing_component_type',
                'Component type is missing',
                ['node' => $node]
            ));
            return;
        }

        $rule = $this->componentRuleLoader->getRule($componentType);
        if (!$rule) {
            event(new ErrorDetectedEvent(
                $this,
                $event->moduleName,
                $event->filePath,
                $jsonPath,
                'unknown_component_type',
                "Unknown component type: {$componentType}",
                ['node' => $node],
                $componentType
            ));
            return;
        }

        // Validate required props
        if (isset($rule['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
            $requiredProps = collect($rule['nestedValidation']['structure']['props']['nestedValidation']['structure'])
                ->filter(fn($prop) => ($prop['required'] ?? false))
                ->keys()
                ->toArray();

            foreach ($requiredProps as $prop) {
                if (!isset($node['props'][$prop])) {
                    event(new ErrorDetectedEvent(
                        $this,
                        $event->moduleName,
                        $event->filePath,
                        $jsonPath,
                        'missing_required_prop',
                        "Missing required prop: {$prop}",
                        ['prop' => $prop, 'node' => $node],
                        $componentType
                    ));
                }
            }
        }

        // Validate unknown props
        if (isset($node['props']) && isset($rule['nestedValidation']['structure']['props']['nestedValidation']['structure'])) {
            $allowedProps = array_keys($rule['nestedValidation']['structure']['props']['nestedValidation']['structure']);
            foreach ($node['props'] as $prop => $value) {
                if (!in_array($prop, $allowedProps)) {
                    event(new ErrorDetectedEvent(
                        $this,
                        $event->moduleName,
                        $event->filePath,
                        $jsonPath,
                        'unknown_prop',
                        "Unknown prop: {$prop}",
                        ['prop' => $prop, 'value' => $value],
                        $componentType
                    ));
                }
            }
        }
    }

    public function onErrorDetected(ErrorDetectedEvent $event): void
    {
        $this->info("DEBUG: onErrorDetected called for errorSlug: {$event->errorSlug} in file: {$event->filePath}"); // DEBUG CONSOLE
        $this->info("DEBUG: Error message: {$event->message}"); // DEBUG CONSOLE
        $this->info("DEBUG: JSON Path: {$event->jsonPath}"); // DEBUG CONSOLE
        $this->info("DEBUG: Component Type: {$event->componentType}"); // DEBUG CONSOLE

        $sourceFilePath = $this->findSourceFilePath($event->filePath) ?: $event->filePath;
        
        // Determine human-friendly message based on error slug
        $humanMessage = $event->message;
        switch ($event->errorSlug) {
            case 'unknown_component_type':
                $humanMessage = "Unknown component type '{$event->componentType}'";
                $this->info("DEBUG: Dispatched unknown_component_type event for {$event->componentType}");
                break;
            case 'missing_required_key':
                $missingKey = $event->context['missing_key'] ?? null;
                if ($missingKey) {
                    $humanMessage = "Missing required key: {$missingKey}";
                }
                break;
            case 'missing_required_prop':
                $missingProp = $event->context['missing_prop_name'] ?? null;
                if ($missingProp) {
                    $humanMessage = "Missing required prop: {$missingProp}";
                }
                break;
            case 'unknown_key_at_component_level':
                $unknownKey = $event->context['unknown_key'] ?? null;
                if ($unknownKey) {
                    $humanMessage = "Unknown key '{$unknownKey}' at component level";
                }
                break;
            case 'unknown_prop':
                $unknownProp = $event->context['unknown_prop_key'] ?? null;
                if ($unknownProp) {
                    $humanMessage = "Unknown property '{$unknownProp}'";
                }
                break;
        }
        
        // Обновим сообщение об ошибке
        $event->message = $humanMessage;
        
        $errorEntry = [
            'module' => $event->moduleName,
            'file' => $sourceFilePath,
            'path' => $event->jsonPath,
            'error_type' => $event->errorSlug,
            // Use human-friendly message for display
            'message' => $humanMessage,
            'humanMessage' => $humanMessage,
            'component' => $event->componentType ?? ($event->context['component'] ?? ($event->context['component_type'] ?? 'unknown')),
            'context' => $event->context,
        ];
        
        // Add source file path to context for validation suggestions
        $event->context['source_file_path'] = $sourceFilePath;
        
        // Ensure $this->groupedErrors is an array for the given file path
        if (!isset($this->groupedErrors[$sourceFilePath]) || !is_array($this->groupedErrors[$sourceFilePath])) {
            $this->groupedErrors[$sourceFilePath] = [];
        }
        $this->groupedErrors[$sourceFilePath][] = $errorEntry;

        // Collect component type for the new listener
        $this->collectedErrorComponentTypes[] = $event->componentType ?? 'unknown_type_in_error';

        $this->logHelper->logWarning("Error Detected: {$event->errorSlug} in {$sourceFilePath} at {$event->jsonPath}. Message: {$humanMessage}");

        // Используем метод processErrorEvent вместо addError, чтобы правильно обрабатывалась статистика ошибок
        ValidationEventCollector::processErrorEvent($event);

        $this->errorCount++;
        $this->logHelper->logDebug("[OnErrorDetected] errorCount incremented to: {$this->errorCount}"); // DEBUG
    }

    public function onValidationCompleted(ValidationCompletedEvent $event): void
    {
        // This method is called by the dispatcher. 
        // We can log summary information or perform other completion tasks if needed.
        // For now, EventStatisticsListener handles detailed summary logging.
        $this->logHelper->logInfo("ValidationCompletedEvent handled by ValidateModuleJsonCommand. Total errors from event: " . $event->totalErrors);
        
        // Ensure the error count is set correctly 
        $this->errorCount = $event->totalErrors;
        
        // Добавляем debug-информацию, чтобы проследить ошибку
        $this->logHelper->logDebug("[ValidationCompleted] Final errorCount: {$this->errorCount}. Will return " . 
            ($this->errorCount > 0 ? "FAILURE" : "SUCCESS"));
    }

    protected function loadMainConfig(): bool
    {
        $configPath = base_path('install-modules/aiCore/validation/module-validator.json');
        if (!FacadesFile::exists($configPath)) {
            $this->error("Main configuration file not found at {$configPath}");
            return false;
        }
        try {
            $this->mainConfig = json_decode(FacadesFile::get($configPath), true, 512, JSON_THROW_ON_ERROR);
            $this->logFileName = $this->mainConfig['logFileName'] ?? 'module-validator.log';
            $this->componentSourceBasePath = base_path($this->mainConfig['componentSourceBasePath'] ?? 'resources/common/js/Elements/Primevue');
            $this->componentCleaningBasePath = base_path($this->mainConfig['componentCleaningBasePath'] ?? 'docs_cleaning');
            $this->reportingConfig = $this->mainConfig['reporting'] ?? [];
            return true;
        } catch (Throwable $e) {
            $this->error("Error reading or parsing main configuration file {$configPath}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Stub loader for module configuration (e.g., module versions mapping).
     * Allows findSourceFilePath fallback.
     * @return bool
     */
    protected function loadModuleConfiguration(): bool
    {
        // No external module mapping available; default to empty mapping
        $this->moduleConfig = [];
        return true;
    }

    protected function findSourceFilePath(string $targetFilePath): ?string
    {
        // First, ensure we load the module configuration if it hasn't been loaded yet
        if (empty($this->moduleConfig)) {
            if (!$this->loadModuleConfiguration()) {
                $this->logHelper->logError("[findSourceFilePath] Module configuration could not be loaded.");
                return null;
            }
        }

        // Normalize path separators to be consistent
        $normalizedTargetPath = str_replace('\\', '/', $targetFilePath);
        $targetBasePrefix = rtrim(str_replace('\\', '/', $this->mainConfig['aiInstallerPath'] ?? 'install-modules/aiInstaller'), '/') . '/';

        if (!Str::startsWith($normalizedTargetPath, $targetBasePrefix)) {
            $this->logHelper->logDebug("[findSourceFilePath] Path doesn't start with installer prefix: $normalizedTargetPath");
            return null; 
        }

        $pathWithoutBase = Str::after($normalizedTargetPath, $targetBasePrefix);
        $pathParts = explode('/', $pathWithoutBase, 2);
        if (count($pathParts) < 2) {
            $this->logHelper->logDebug("[findSourceFilePath] Invalid path structure: $normalizedTargetPath");
            return null; 
        }
        
        $moduleName = $pathParts[0];
        $relativePathWithinModule = $pathParts[1];

        if (!isset($this->moduleConfig[$moduleName])) {
            $this->logHelper->logDebug("[findSourceFilePath] Module not found in config: $moduleName");
            return null;
        }

        $versions = $this->moduleConfig[$moduleName];
        if (empty($versions) || !is_array($versions)) {
            $this->logHelper->logDebug("[findSourceFilePath] No versions found for module: $moduleName");
            return null;
        }

        $sourceBaseDir = rtrim(str_replace('\\', '/', $this->mainConfig['sourceBasePath'] ?? 'implement-modules'), '/');
        $this->logHelper->logDebug("[findSourceFilePath] Checking versions for module $moduleName: " . implode(', ', $versions));

        // Try each version from most recent (reversed order)
        foreach (array_reverse($versions) as $version) {
            if (!is_string($version) && !is_numeric($version)) continue;
            
            $potentialSourceRelativePath = $sourceBaseDir . '/' . $moduleName . '/' . $version . '/' . $relativePathWithinModule;
            $absolutePath = base_path($potentialSourceRelativePath);
            
            if (file_exists($absolutePath)) {
                $this->logHelper->logDebug("[findSourceFilePath] Found source file: $potentialSourceRelativePath");
                return $potentialSourceRelativePath;
            }
        }
        
        $this->logHelper->logDebug("[findSourceFilePath] No source file found for: $normalizedTargetPath");
        return null;
    }

    public function loaderGetComponentRulePath(string $componentType): ?string
    {
        return $this->ruleLoader->getRulePath($componentType);
    }

    public function loaderGetComponentRules(string $componentType): ?array
    {
        return $this->ruleLoader->getRule($componentType);
    }

    // Add a handler for SystemErrorDetectedEvent (example, can be customized)
    public function onSystemErrorDetected(SystemErrorDetectedEvent $event): void
    {
        $this->error("[SYSTEM ERROR] Module: {$event->moduleName}, File: {$event->filePath}, Slug: {$event->errorSlug}, Message: {$event->message}");
        $this->logHelper->logError("[SYSTEM ERROR]", [
            'module' => $event->moduleName,
            'file' => $event->filePath,
            'slug' => $event->errorSlug,
            'message' => $event->message,
            'context' => $event->context
        ]);

        $this->errorCount++; // ADDED: Also increment for system errors
    }

    public function printValidationResults(array $errorsToDisplay)
    {
        // JSON output when --json is specified
        if ($this->option('json')) {
            $this->line(json_encode($errorsToDisplay, JSON_UNESCAPED_SLASHES));
            return;
        }

        // Apply output system configuration filtering
        $errorsToDisplay = $this->applyOutputSystemFiltering($errorsToDisplay);

        // Filter errors to only show minimum level errors and unknown component types unless --show-all is specified
        if (!$this->option('show-all') && ($this->outputSystemConfig['filtering']['show_only_min_level'] ?? true)) {
            $minErrorLevel = ValidationEventCollector::getMinErrorLevel();
            if ($minErrorLevel !== null) {
                $filteredErrors = [];
                
                foreach ($errorsToDisplay as $error) {
                    $errorType = $error['error_type'] ?? '';
                    $errorLevel = $error['level'] ?? null;
                    
                    // Always include unknown component types if configured
                    $includeUnknownTypes = $this->outputSystemConfig['filtering']['always_include_component_type_errors'] ?? true;
                    
                    if (($includeUnknownTypes && $errorType === 'unknown_component_type') || $errorLevel === $minErrorLevel) {
                        $filteredErrors[] = $error;
                    }
                }
                
                // Replace original array with filtered
                if (!empty($filteredErrors)) {
                    $this->line("<fg=yellow>Filtered to show only level {$minErrorLevel} errors" . 
                        ($includeUnknownTypes ? " and unknown component types." : ".") . "</>");
                    $errorsToDisplay = $filteredErrors;
                }
            }
        }
        
        // Default and --human invocation: human-readable output
        $outputStyle = 'human';
        $groupingAlgorithm = $this->option('group');
        $maxPerPage = (int)$this->option('max-lines-per-page');
        $isInteractive = (bool)$this->option('interactive');
        $plainDocs = (bool)$this->option('plain-docs');
        $superVerbose = (bool)$this->option('super-verbose');

        // Load detailed validation recommendations based on verbosity, fallback to legacy docs
        $validationLevelDocs = [];
        $recsPath = $this->configBasePath . '/validation_recommendations_detailed.json';
        if (FacadesFile::exists($recsPath)) {
            try {
                $allRecs = json_decode(FacadesFile::get($recsPath), true, 512, JSON_THROW_ON_ERROR);
                $errorLevels = $allRecs['error_levels'] ?? [];
                $verbosity = $this->getOutput()->getVerbosity();
                $levelKey = $verbosity >= OutputInterface::VERBOSITY_DEBUG
                    ? 3
                    : ($verbosity >= OutputInterface::VERBOSITY_VERY_VERBOSE ? 2 : 1);
                foreach ($errorLevels as $level => $levelData) {
                    $detailLevels = $levelData['detail_levels'] ?? [];
                    if (isset($detailLevels[$levelKey]['summary_action'])) {
                        $validationLevelDocs[(string)$level] = [$detailLevels[$levelKey]['summary_action']];
                    }
                }
            } catch (JsonException $e) {
                $this->warn("Could not parse validation_recommendations_detailed.json: " . $e->getMessage());
            }
        } else {
            // No detailed recommendations available; warn the user
            $this->warn("Detailed recommendations file not found at {$recsPath}");
        }
        // Use the ValidationResultOutputHelper trait's method, passing the errors and other options
        $this->displayValidationResults(
            $errorsToDisplay, // Use the filtered errors
            $outputStyle,
            $groupingAlgorithm,
            $maxPerPage,
            $isInteractive,
            $plainDocs,
            $superVerbose,
            $validationLevelDocs // Pass loaded level docs
        );
    }

    /**
     * Process a single module for validation
     * 
     * @param string $moduleName The name of the module
     * @param string $modulePath The absolute path to the module
     * @return void
     */
    protected function processModule(string $moduleName, string $modulePath): void
    {
        $this->logHelper->logInfo("[Processor] Processing module: {$moduleName} from path: {$modulePath}");
        
        try {
            // Pass the logHelper instance to the trait method
            $this->validateModuleNodesAndGetKeys($modulePath, $this->logHelper);
        } catch (Throwable $e) {
            $this->logHelper->logError("[Processor] Error processing module {$moduleName}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            $this->error("Error processing module {$moduleName}: " . $e->getMessage());
        }
    }

    /**
     * Provides access to the command's logger instance for traits.
     */
    public function getCommandLogger(): ModuleValidationLogHelper
    {
        return $this->logHelper;
    }

    /**
     * Loads the output system configuration.
     * 
     * @return bool True if configuration was loaded successfully, false otherwise.
     */
    protected function loadOutputSystemConfig(): bool
    {
        // First try to load the unified configuration file
        $unifiedConfigPath = $this->configBasePath . '/unified_validation_config.json';
        if (FacadesFile::exists($unifiedConfigPath)) {
            try {
                $unifiedConfig = json_decode(FacadesFile::get($unifiedConfigPath), true, 512, JSON_THROW_ON_ERROR);
                $this->logHelper->logInfo("Unified validation configuration loaded from {$unifiedConfigPath}");
                
                // Extract output control section
                if (isset($unifiedConfig['output_control'])) {
                    $this->outputSystemConfig = $unifiedConfig['output_control'];
                    
                    // If the config has error_levels, store that for validation level docs
                    if (isset($unifiedConfig['error_levels'])) {
                        $this->validationLevelDocs = $unifiedConfig['error_levels'];
                    }
                    
                    // Apply any disabled output systems from command line
                    $this->applyDisabledOutputSystems($this->outputSystemConfig);
                    return true;
                }
            } catch (Throwable $e) {
                $this->logHelper->logError("Error reading or parsing unified configuration file: " . $e->getMessage());
                // Fall back to the legacy config file
            }
        }
        
        // Fall back to the legacy output_systems_config.json
        $configPath = $this->configBasePath . '/output_systems_config.json';
        if (!FacadesFile::exists($configPath)) {
            $this->logHelper->logWarning("Output system configuration file not found at {$configPath}. Using defaults.");
            $this->outputSystemConfig = [
                'enable_output_control' => false,
                'error_types' => ['critical_errors' => true, 'major_errors' => true, 'warnings' => true, 'notices' => true, 'info' => true, 'suggestions' => true],
                'categories' => ['structure' => true, 'props' => true, 'component' => true, 'json' => true, 'file' => true],
                'detail_systems' => ['error_messages' => true, 'error_context' => true, 'error_path' => true, 'documentation_links' => true],
                'verbosity_integration' => ['respect_command_verbosity' => true],
                'filtering' => ['show_only_min_level' => true, 'always_include_component_type_errors' => true]
            ];
            
            // Apply any disabled output systems from command line
            $this->applyDisabledOutputSystems($this->outputSystemConfig);
            return true;
        }

        try {
            $this->outputSystemConfig = json_decode(FacadesFile::get($configPath), true, 512, JSON_THROW_ON_ERROR);
            $this->logHelper->logInfo("Output system configuration loaded from {$configPath}");
            
            // Apply any disabled output systems from command line
            $this->applyDisabledOutputSystems($this->outputSystemConfig);
            return true;
        } catch (Throwable $e) {
            $this->logHelper->logError("Error reading or parsing output system configuration file: " . $e->getMessage());
            // Set default configuration as fallback
            $this->outputSystemConfig = [
                'enable_output_control' => false, 
                'error_types' => ['critical_errors' => true, 'major_errors' => true, 'warnings' => true, 'notices' => true, 'info' => true, 'suggestions' => true],
                'categories' => ['structure' => true, 'props' => true, 'component' => true, 'json' => true, 'file' => true],
                'detail_systems' => ['error_messages' => true, 'error_context' => true, 'error_path' => true, 'documentation_links' => true],
                'verbosity_integration' => ['respect_command_verbosity' => true],
                'filtering' => ['show_only_min_level' => true, 'always_include_component_type_errors' => true]
            ];
            
            // Apply any disabled output systems from command line
            $this->applyDisabledOutputSystems($this->outputSystemConfig);
            return false;
        }
    }
    
    /**
     * Apply disabled output systems from command line to the configuration
     *
     * @param array &$config Configuration to modify
     * @return void
     */
    protected function applyDisabledOutputSystems(array &$config): void
    {
        // Get the disabled output systems from the command line
        $disabledSystems = $this->option('disable-output');
        if (empty($disabledSystems)) {
            return;
        }
        
        // Parse each system name and disable it in the configuration
        foreach ($disabledSystems as $disabledSystem) {
            // Handle comma-separated values
            $systems = explode(',', $disabledSystem);
            foreach ($systems as $system) {
                $system = trim($system);
                if (empty($system)) {
                    continue;
                }
                
                // Enable output control if we're disabling specific systems
                $config['enable_output_control'] = true;
                
                // Handle special case for disabling all systems
                if ($system === 'all') {
                    if (isset($config['detail_systems'])) {
                        foreach ($config['detail_systems'] as $key => $value) {
                            $config['detail_systems'][$key] = false;
                        }
                    }
                    continue;
                }
                
                // Try to find the system in detail_systems
                if (isset($config['detail_systems'][$system])) {
                    $config['detail_systems'][$system] = false;
                    $this->logHelper->logInfo("Disabled output system: {$system}");
                    continue;
                }
                
                // Try to find the system in error_types
                if (isset($config['error_types'][$system])) {
                    $config['error_types'][$system] = false;
                    $this->logHelper->logInfo("Disabled error type: {$system}");
                    continue;
                }
                
                // Try to find the system in categories
                if (isset($config['categories'][$system])) {
                    $config['categories'][$system] = false;
                    $this->logHelper->logInfo("Disabled category: {$system}");
                    continue;
                }
                
                $this->logHelper->logWarning("Unknown output system: {$system}. Available systems: " . 
                    implode(', ', array_merge(
                        array_keys($config['detail_systems'] ?? []),
                        array_keys($config['error_types'] ?? []),
                        array_keys($config['categories'] ?? [])
                    ))
                );
            }
        }
    }

    /**
     * Apply filtering based on output system configuration
     *
     * @param array $errors The errors to filter
     * @return array The filtered errors
     */
    protected function applyOutputSystemFiltering(array $errors): array
    {
        // If output control is not enabled, return all errors
        if (!($this->outputSystemConfig['enable_output_control'] ?? false)) {
            return $errors;
        }
        
        $filteredErrors = [];
        $errorTypes = $this->outputSystemConfig['error_types'] ?? [];
        $categories = $this->outputSystemConfig['categories'] ?? [];
        
        foreach ($errors as $error) {
            $level = $error['level'] ?? null;
            $category = $error['category'] ?? 'unknown';
            $errorType = $error['error_type'] ?? '';
            
            // Filter by error level
            $includeByLevel = true;
            if ($level !== null) {
                switch ($level) {
                    case ValidationEventCollector::ERROR_CRITICAL: // 0
                        $includeByLevel = $errorTypes['critical_errors'] ?? true;
                        break;
                    case ValidationEventCollector::ERROR_MAJOR: // 1
                        $includeByLevel = $errorTypes['major_errors'] ?? true;
                        break;
                    case ValidationEventCollector::ERROR_WARNING: // 2
                        $includeByLevel = $errorTypes['warnings'] ?? true;
                        break;
                    case ValidationEventCollector::ERROR_NOTICE: // 3
                        $includeByLevel = $errorTypes['notices'] ?? true;
                        break;
                    case ValidationEventCollector::ERROR_INFO: // 4 & 5
                    case 5:
                        $includeByLevel = $errorTypes['info'] ?? true;
                        break;
                }
            }
            
            // Special case for unknown component types
            if ($errorType === 'unknown_component_type') {
                $includeByLevel = $errorTypes['unknown_component_types'] ?? true;
            }
            
            // Filter by category
            $includeByCategory = $categories[strtolower($category)] ?? true;
            
            // Include error if passes all filters
            if ($includeByLevel && $includeByCategory) {
                $filteredErrors[] = $error;
            }
        }
        
        return $filteredErrors;
    }

    protected function initializeValidation(): void
    {
        // Reset the ValidationEventCollector for this run
        ValidationEventCollector::reset();
        
        // Initialize paths
        $this->configBasePath = base_path('install-modules/aiCore/validation');
        $this->componentSourceBasePath = base_path('src/components');
        $this->componentCleaningBasePath = base_path('src/components');

        // Load main config
        if (!$this->loadMainConfig()) {
            throw new \RuntimeException('Failed to load main configuration');
        }

        // Load component rules
        $this->loadComponentRules();

        // Add fallback summary listener
        $this->addEventListener(
            ErrorDetectedEvent::class,
            [new FallbackValidationSummaryListener(), 'handleErrorDetected']
        );
        $this->addEventListener(
            ValidationFinishedEvent::class,
            [new FallbackValidationSummaryListener(), 'handleValidationFinished']
        );
    }

    protected function validateModule(string $moduleName): void
    {
        $modulePath = base_path('install-modules/aiInstaller/' . $moduleName);
        //Log::channel('stack')->debug('[ValidateModuleJsonCommand] Validating module: ' . $moduleName . ' at path: ' . $modulePath); // DEBUG LOG
        $this->info("DEBUG: validateModule called for {$moduleName} at path {$modulePath}"); // DEBUG CONSOLE

        if (!File::isDirectory($modulePath)) {
            //Log::channel('stack')->debug('[ValidateModuleJsonCommand] Module directory not found: ' . $modulePath); // DEBUG LOG
            $this->error("DEBUG: Module directory not found: {$modulePath}"); // DEBUG CONSOLE
            event(new ErrorDetectedEvent(
                $this,
                $this->moduleName,
                $modulePath,
                'module_not_found',
                "Module directory not found: {$moduleName}",
                ['module' => $moduleName]
            ));
            return;
        }

        // Find all JSON files in the module (recursively)
        $finder = new Finder();
        $finder->files()
            ->in($modulePath)
            ->name('*.json')
            ->exclude(['_i', 'docs', 'programs', 'data']);
        $files = iterator_to_array($finder);
        $this->info("DEBUG: Found " . count($files) . " JSON files recursively in {$modulePath}"); // DEBUG CONSOLE

        foreach ($files as $file) {
            // The Finder already filters by *.json, so no need to check extension again
            $this->info("DEBUG: Processing file: " . $file->getPathname()); // DEBUG CONSOLE
            $this->validateFile($file->getPathname());
        }
        $this->info("DEBUG: Finished processing files for module {$moduleName}"); // DEBUG CONSOLE
    }

    protected function validateFile(string $filePath): void
    {
        $this->info("DEBUG: validateFile called for: {$filePath}"); // DEBUG CONSOLE
        if (!File::exists($filePath)) {
            $errorEvent = new ErrorDetectedEvent(
                $this,
                $this->moduleName,
                $filePath,
                'file_read_error_or_not_found',
                'File not found or cannot be read',
                ['file' => $filePath]
            );
            $this->dispatchEvent($errorEvent);
            return;
        }

        $content = File::get($filePath);
        if ($content === null) {
            $errorEvent = new ErrorDetectedEvent(
                $this,
                $this->moduleName,
                $filePath,
                'file_read_error_or_not_found',
                'Failed to read file content',
                ['file' => $filePath]
            );
            $this->dispatchEvent($errorEvent);
            return;
        }

        try {
            $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($data)) {
                $errorEvent = new ErrorDetectedEvent(
                    $this,
                    $this->moduleName,
                    $filePath,
                    'invalid_json_root_type',
                    'JSON root must be an array',
                    ['content' => $content]
                );
                $this->dispatchEvent($errorEvent);
                return;
            }

            // Validate each component in the array
            foreach ($data as $index => $component) {
                if (!is_array($component)) {
                    $errorEvent = new ErrorDetectedEvent(
                        $this,
                        $this->moduleName,
                        $filePath,
                        'invalid_component_type',
                        'Component must be an object',
                        ['component' => $component],
                        "[{$index}]"
                    );
                    $this->dispatchEvent($errorEvent);
                    continue;
                }

                // Get component type
                $componentType = $component['type'] ?? null;
                
                // Try to load component rules based on type
                $componentRules = null;
                if ($componentType && is_string($componentType)) {
                    $componentRules = $this->loaderGetComponentRules($componentType);
                    Log::channel('stack')->debug('[ValidateModuleJsonCommand] Loaded rules for component type: ' . $componentType); // DEBUG LOG
                    
                    // Add direct check for unknown component type
                    if ($componentType === 'unknowncomponent' || !$componentRules) {
                        $this->info("DEBUG: Unknown component type detected: {$componentType}"); // Debug output
                        $errorEvent = new ErrorDetectedEvent(
                            $this,
                            $this->moduleName,
                            $filePath,
                            'unknown_component_type',
                            "Unknown component type: {$componentType}",
                            ['index' => $index, 'component' => $component],
                            $componentType
                        );
                        $this->dispatchEvent($errorEvent);
                        $this->info("DEBUG: Dispatched unknown_component_type event for {$componentType}");
                        continue; // Skip further validation for this component
                    }
                }

                $nodeEncounteredEvent = new NodeEncounteredEvent(
                    $this, // command
                    $this->moduleName, // moduleName
                    $filePath, // filePath
                    dirname($filePath), // modulePath
                    $component, // nodeData (the full component object)
                    "[{$index}]", // jsonPath
                    $componentRules // componentRules
                );
                Log::channel('stack')->debug('[ValidateModuleJsonCommand] Dispatching NodeEncounteredEvent for: ' . $filePath . ' at path: ' . "[{$index}]"); // DEBUG LOG
                
                // Use internal dispatchEvent method instead of event()
                $this->dispatchEvent($nodeEncounteredEvent);
            }
        } catch (\JsonException $e) {
            $jsonSyntaxErrorEvent = new ErrorDetectedEvent(
                $this,
                $this->moduleName,
                $filePath,
                'json_syntax_error',
                'Invalid JSON syntax: ' . $e->getMessage(),
                ['error' => $e->getMessage()]
            );
            Log::channel('stack')->debug('[ValidateModuleJsonCommand] Dispatching json_syntax_error event for: ' . $filePath); // DEBUG LOG
            $this->dispatchEvent($jsonSyntaxErrorEvent);
        }
    }

    protected function loadComponentRules(): void
    {
        $rulesPath = $this->configBasePath . '/components';
        if (!File::isDirectory($rulesPath)) {
            throw new \RuntimeException("Component rules directory not found: {$rulesPath}");
        }

        $this->componentRuleLoader = new ComponentRuleLoader($rulesPath);
    }

    protected function addEventListener(string $eventClass, callable $listener): void
    {
        if (!isset($this->eventListeners[$eventClass])) {
            $this->eventListeners[$eventClass] = [];
        }
        $this->eventListeners[$eventClass][] = $listener;
    }
}
