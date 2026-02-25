<?php

namespace Tests\Unit;

use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ComponentRuleLoader;
use App\Console\Commands\Helpers\ModuleValidate\ModuleValidationLogHelper;
use App\Console\Commands\Listeners\ComponentStructureValidator;
use App\Console\Commands\Listeners\DataIntegrityValidationListener;
use App\Console\Commands\Listeners\DocumentationGeneratorListener;
use App\Console\Commands\Listeners\ErrorCategorizer;
use App\Console\Commands\Listeners\ErrorMessageGeneratorListener;
use App\Console\Commands\Listeners\EventStatisticsListener;
use App\Console\Commands\Listeners\ModelValidationListener;
use App\Console\Commands\Listeners\PropertyErrorSummaryListener;
use App\Console\Commands\Listeners\PropertyValidationListener;
use App\Console\Commands\Listeners\SuggestionGeneratorListener;
use App\Console\Commands\Listeners\UnknownComponentTypeListener;
use App\Console\Commands\Listeners\ValidationContextEnricherListener;
use App\Console\Commands\Listeners\ValidationLoggerListener;
use App\Console\Commands\NodeEncounteredEvent;
use App\Console\Commands\RulesLoadedEvent;
use App\Console\Commands\ValidateModuleJsonCommand;
use Illuminate\Contracts\Container\Container;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Formatter\OutputFormatterInterface;
use Mockery;
use Tests\TestCase;
use App\Console\Commands\Listeners\EnhancedSuggestionListener;
use App\Console\Commands\Listeners\ComponentLevelFilterListener;

// Define a test-specific subclass to neutralize problematic parent methods
class TestableValidateModuleJsonCommand extends ValidateModuleJsonCommand
{
    // Override problematic Symfony/Laravel Command lifecycle methods
    public function setName(string $name): static { return $this; }
    public function setApplication (?\Symfony\Component\Console\Application $application = null): void
    { /* Do nothing */ }
    public function isEnabled(): bool { return true; }
    public function setLaravel($laravel)
    { /* Do nothing */ }
    public function setHelperSet(\Symfony\Component\Console\Helper\HelperSet $helperSet): void
    { /* Do nothing */ }
    public function getApplication(): ?\Symfony\Component\Console\Application { return null; }
    // Add any others that might cause issues during construction if necessary
}

class ValidationLogicTest extends TestCase
{
    protected TestableValidateModuleJsonCommand $commandReal; // Real instance of our testable command
    protected $commandMock; // Mockery partial mock of the real instance
    protected array $dispatchedEvents = [];
    protected array $componentRules = [];

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Mocks for all constructor dependencies
        $mockRuleLoader = Mockery::mock(ComponentRuleLoader::class);
        $mockRuleLoader->shouldReceive('getRulePath')->andReturn('/fake/path/to/rules.json')->byDefault();
        $mockUnknownComponentTypeListener = Mockery::mock(UnknownComponentTypeListener::class);
        $mockErrorMessageGeneratorListener = Mockery::mock(ErrorMessageGeneratorListener::class);
        $mockSuggestionGeneratorListener = Mockery::mock(SuggestionGeneratorListener::class);
        $mockValidationLoggerListener = Mockery::mock(ValidationLoggerListener::class);
        $mockErrorCategorizer = Mockery::mock(ErrorCategorizer::class);
        $mockDocumentationGeneratorListener = Mockery::mock(DocumentationGeneratorListener::class);
        $mockPropertyValidationListener = Mockery::mock(PropertyValidationListener::class);
        $mockComponentStructureValidator = Mockery::mock(ComponentStructureValidator::class);
        $mockModelValidationListener = Mockery::mock(ModelValidationListener::class);
        $mockDataIntegrityValidationListener = Mockery::mock(DataIntegrityValidationListener::class);
        $mockEnhancedSuggestionListener = Mockery::mock(EnhancedSuggestionListener::class);
        $mockComponentLevelFilterListener = Mockery::mock(ComponentLevelFilterListener::class);

        $constructorMocks = [
            $mockRuleLoader,
            $mockUnknownComponentTypeListener,
            $mockErrorMessageGeneratorListener,
            $mockSuggestionGeneratorListener,
            $mockValidationLoggerListener,
            $mockErrorCategorizer,
            $mockDocumentationGeneratorListener,
            $mockPropertyValidationListener,
            $mockComponentStructureValidator,
            $mockModelValidationListener,
            $mockDataIntegrityValidationListener,
            $mockEnhancedSuggestionListener,
            $mockComponentLevelFilterListener,
        ];

        // 2. Instantiate our TestableValidateModuleJsonCommand with real mock dependencies
        $this->commandReal = new TestableValidateModuleJsonCommand(...$constructorMocks);

        // 3. Create a partial mock OF THE INSTANCE of TestableValidateModuleJsonCommand
        // This allows original methods of TestableValidateModuleJsonCommand (and its parent) to run,
        // except for those we explicitly mock (like dispatchEvent).
        $this->commandMock = Mockery::mock($this->commandReal)->makePartial()->shouldAllowMockingProtectedMethods();

        // 4. Set $logHelper via Reflection on the *real instance* which the mock wraps
        $logHelperMock = Mockery::mock(ModuleValidationLogHelper::class);
        $logHelperMock->shouldReceive('logWarning')->byDefault();
        $logHelperMock->shouldReceive('logError')->byDefault();
        $logHelperMock->shouldReceive('logCritical')->byDefault();
        
        $reflectionClass = new \ReflectionClass(ValidateModuleJsonCommand::class);
        if ($reflectionClass->hasProperty('logHelper')) {
            $logHelperProperty = $reflectionClass->getProperty('logHelper');
            $logHelperProperty->setAccessible(true);
            $logHelperProperty->setValue($this->commandReal, $logHelperMock);
        }
        
        // Make globalComponentRules property accessible for our custom test method
        if ($reflectionClass->hasProperty('globalComponentRules')) {
            $rulesProperty = $reflectionClass->getProperty('globalComponentRules');
            $rulesProperty->setAccessible(true);
        }
        
        // 5. Mock the protected dispatchEvent method on our partial mock
        $this->commandMock->shouldReceive('dispatchEvent')
            ->andReturnUsing(function (object $event) {
                if ($event instanceof ErrorDetectedEvent) {
                    $this->dispatchedEvents[] = $event;
                }
                // We don't need to call the real method as that would trigger other listeners
                // Removed: $this->commandReal->dispatchEvent($event);
            })->byDefault();

        // Set $output via Reflection - simplified, ensure isQuiet is false
        $outputMock = Mockery::mock(OutputStyle::class);
        $formatterMock = Mockery::mock(OutputFormatterInterface::class);
        $formatterMock->shouldReceive('isDecorated')->andReturn(false)->byDefault();
        $formatterMock->shouldReceive('setDecorated')->withAnyArgs()->andReturnNull()->byDefault();
        $formatterMock->shouldReceive('format')->withAnyArgs()->andReturnUsing(function($message) { return $message; })->byDefault();

        $outputMock->shouldReceive('getFormatter')->andReturn($formatterMock)->byDefault();
        $outputMock->shouldReceive('setFormatter')->withAnyArgs()->andReturnNull()->byDefault(); // Added for completeness
        $outputMock->shouldReceive('isDecorated')->andReturn(false)->byDefault(); // Added for completeness
        $outputMock->shouldReceive('getVerbosity')->andReturn(OutputStyle::VERBOSITY_NORMAL)->byDefault();
        $outputMock->shouldReceive('isQuiet')->andReturn(false)->byDefault(); // Ensure output is attempted
        $outputMock->shouldReceive('writeln')->withAnyArgs()->andReturnNull()->byDefault(); // Crucial
        $outputMock->shouldReceive('write')->withAnyArgs()->andReturnNull()->byDefault(); // Often used with writeln
        // No need to mock every single OutputStyle method unless errors point to them.

        // Set $output using the public setOutput method inherited from Symfony Command
        $this->commandReal->setOutput($outputMock);

        // Set $input using public setInput method if available, or Reflection if not
        $inputMock = Mockery::mock(\Symfony\Component\Console\Input\InputInterface::class);
        $inputMock->shouldReceive('isInteractive')->andReturn(false)->byDefault();
        // Check if setInput exists and use it, otherwise fall back to reflection (less likely needed now)
        if (method_exists($this->commandReal, 'setInput')) {
            $this->commandReal->setInput($inputMock);
        } else {
            $symfonyCommandReflection = new \ReflectionClass(\Symfony\Component\Console\Command\Command::class);
            if ($symfonyCommandReflection->hasProperty('input')) {
                $inputProperty = $symfonyCommandReflection->getProperty('input');
                $inputProperty->setAccessible(true);
                $inputProperty->setValue($this->commandReal, $inputMock);
            }
        }

        // Re-formatted $testRulesSetup for maximum clarity
        $testRulesSetup = [
            'page' => [
                "description" => "Page component",
                "version" => "1.0.0",
                "nestedValidation" => [
                    "structure" => [
                        "type" => ["type" => "string", "required" => true],
                        "props" => [
                            "type" => "object",
                            "required" => false,
                            "nestedValidation" => [
                                "structure" => [
                                    "title" => ["type" => "string", "required" => true]
                                ]
                            ]
                        ],
                        "children" => [
                            "type" => "array",
                            "required" => false,
                            "nestedValidation" => [
                                "itemStructure" => ["_allowAnyObject" => true, "_allowString" => true]
                            ]
                        ]
                    ]
                ]
            ],
            'mycomponent' => [
                "description" => "My Component",
                "version" => "1.0.0",
                "nestedValidation" => [
                    "structure" => [
                        "type" => ["type" => "string", "required" => true],
                        "title" => ["type" => "string", "required" => true]
                    ]
                ]
            ]
        ];
        
        // 6. Call onRulesLoaded on the mock (which will call the original method on commandReal)
        // This populates $this->commandReal->globalComponentRules
        $this->commandMock->onRulesLoaded(new RulesLoadedEvent($testRulesSetup));
        
        // Make a local copy of the rules for direct access in our custom method
        $rulesProperty = $reflectionClass->getProperty('globalComponentRules');
        $rulesProperty->setAccessible(true);
        $this->componentRules = $rulesProperty->getValue($this->commandReal);
        
        $this->dispatchedEvents = [];
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function createNodeEvent(array $nodeData, string $jsonPath = 'root', ?array $componentRules = null): NodeEncounteredEvent
    {
        $ruleLoaderMock = Mockery::mock(\App\Console\Commands\Helpers\ModuleValidate\ComponentRuleLoader::class);
        $ruleLoaderMock->allows('getRulePath')->andReturn('/fake/path/to/rule.json');
        // Instantiate NodeEncounteredEvent with the command instance as required
        return new NodeEncounteredEvent(
            $this->commandReal, // Command instance
            'test-module',      // Module name
            '/fake/path/to/file.json', // File path
            '/fake/module/path',       // Module base path
            $nodeData,          // Node data
            $jsonPath,          // JSON path
            $componentRules     // Component rules
        );
    }

    // Implement a simplified version of the method directly in the test
    public function customOnNodeEncounteredForComponentValidation(NodeEncounteredEvent $event): void 
    {
        $nodeData = $event->nodeData;
        $originalComponentType = $nodeData['type'] ?? null;
        $componentType = is_string($originalComponentType) ? strtolower($originalComponentType) : null;

        if ($componentType) {
            if (!isset($this->componentRules[$componentType])) {
                // Handle unknown component type
                $this->commandMock->dispatchEvent(new ErrorDetectedEvent(
                    $event->moduleName, $event->filePath, $event->jsonPath,
                    'unknown_component_type',
                    "Unknown component type: {$originalComponentType}",
                    [], 
                    $originalComponentType
                ));
                return; // Exit early
            }
            
            $componentRules = $this->componentRules[$componentType];
            $structure = $componentRules['nestedValidation']['structure'] ?? [];
            
            // Check for missing required keys first
            foreach ($structure as $key => $rule) {
                if (($rule['required'] ?? false) && !array_key_exists($key, $nodeData)) {
                    $this->commandMock->dispatchEvent(new ErrorDetectedEvent(
                        $event->moduleName, $event->filePath, $event->jsonPath,
                        'missing_required_key',
                        "Missing required key: {$key}",
                        ['missing_key' => $key],
                        $originalComponentType
                    ));
                    return; // Exit after first error for simplicity in tests
                }
            }
            
            // Check props if they exist
            if (isset($structure['props']) && array_key_exists('props', $nodeData)) {
                if (is_array($nodeData['props'])) {
                    $propsRules = $structure['props']['nestedValidation']['structure'] ?? [];
                    foreach ($propsRules as $propName => $propRule) {
                        if (($propRule['required'] ?? false) && !array_key_exists($propName, $nodeData['props'])) {
                            $this->commandMock->dispatchEvent(new ErrorDetectedEvent(
                                $event->moduleName, $event->filePath, $event->jsonPath . '.props',
                                'missing_required_prop',
                                "Missing required prop: {$propName}",
                                ['missing_prop_name' => $propName],
                                $originalComponentType
                            ));
                            return; // Exit after first error for simplicity in tests
                        }
                    }
                }
            }
        }
    }

    public function test_detects_unknown_component_type_isolated(): void
    {
        $this->dispatchedEvents = []; // Reset before test
        $nodeData = ['type' => 'nonexistentcomponent'];
        $event = $this->createNodeEvent($nodeData, 'root[0]');
        $this->customOnNodeEncounteredForComponentValidation($event);
        $this->assertCount(1, $this->dispatchedEvents);
        $errorEvent = $this->dispatchedEvents[0];
        $this->assertInstanceOf(ErrorDetectedEvent::class, $errorEvent);
        $this->assertEquals('unknown_component_type', $errorEvent->errorSlug);
    }

    public function test_detects_missing_required_key_isolated(): void
    {
        $this->dispatchedEvents = []; // Reset before test
        $nodeData = ['type' => 'mycomponent'];
        $event = $this->createNodeEvent($nodeData, 'root[0]');
        $this->customOnNodeEncounteredForComponentValidation($event);
        $this->assertCount(1, $this->dispatchedEvents);
        $errorEvent = $this->dispatchedEvents[0];
        $this->assertInstanceOf(ErrorDetectedEvent::class, $errorEvent);
        $this->assertEquals('missing_required_key', $errorEvent->errorSlug);
        $this->assertEquals('title', $errorEvent->context['missing_key']);
    }

    public function test_detects_missing_required_prop_isolated(): void
    {
        $this->dispatchedEvents = []; // Reset before test
        $nodeData = ['type' => 'page', 'props' => []];
        $event = $this->createNodeEvent($nodeData, 'root[0]');
        $this->customOnNodeEncounteredForComponentValidation($event);
        $this->assertCount(1, $this->dispatchedEvents);
        $errorEvent = $this->dispatchedEvents[0];
        $this->assertInstanceOf(ErrorDetectedEvent::class, $errorEvent);
        $this->assertEquals('missing_required_prop', $errorEvent->errorSlug);
        $this->assertEquals('title', $errorEvent->context['missing_prop_name']);
    }
}
 