<?php

namespace Tests\Feature\AiRudeDepot\Modificators\PhpBased;

use App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Storage\DataHub as Storage;
use Tests\TestCase;

class ProcessingActionsTest extends TestCase
{
    use StorageHelper;

    public $commonStorage;
    protected $actionHandlers;
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    public function setUp(): void
    {
        parent::setUp();
        // Pass the disk NAME, not the absolute path
        // $this->storage = new Storage(storage_path("aiTest")); // OLD - Incorrect
        $this->commonStorage = new Storage('aiTest'); // Assign to commonStorage
        // Initialize action handlers for the tests
        $this->initializeActionHandlers();
    }

    public function tearDown(): void
    {
        // Clean up test data
        $testPaths = [
            'system/tests/test_address',
            'system/tests/test_data',
            'system/tests/Feature/myData',
            'system/tests/Feature/myDataArray',
            'system/tests/Feature/myDataForJson',
            'system/tests/primary-form/data'
        ];

        foreach ($testPaths as $path) {
            try {
                // Attempt to remove test data using the correct property
                $this->commonStorage->address($path)->remove();
            } catch (\Exception $e) {
                // Ignore errors if file doesn't exist
            }
        }

        parent::tearDown();
    }

    public function testExecuteInstructionsWithValidInstructions(): void
    {
        // Prepare test data
        $this->commonStorage->address('path/to/target')->set(null)->save();

        $instructions = [
            ['action' => 'update', 'to' => 'path/to/target', 'value' => 'newValue'],
        ];

        $response = $this->executeInstructions($instructions);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertEquals('newValue', $this->commonStorage->address('path/to/target')->get());
    }

    public function testExecuteInstructionsWithInvalidInstruction(): void
    {
        $instructions = [
            ['action' => 'invalid_action', 'to' => 'path/to/target', 'value' => 'newValue'],
        ];

        $response = $this->executeInstructions($instructions);

        // In the current implementation, invalid actions are logged but don't throw exceptions
        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertStringContainsString('error', json_encode($response->getHistory()));
    }

    public function testHandleSourceWithValue(): void
    {
        $instruction = ['value' => 'test value'];
        $result = $this->handleSource($instruction);
        $this->assertEquals('test value', $result);
    }

    public function testHandleSourceFromAddress(): void
    {
        $this->commonStorage->address('system/tests/test_address')->data('data from address')->save();
        $instruction = ['from' => 'system/tests/test_address'];
        $result = $this->handleSource($instruction);
        $this->assertEquals('data from address', $result);
    }

    public function testHandleSourceWithKey(): void
    {
        $data = ['key1' => 'value1', 'key2' => 'value2'];
        $this->commonStorage->address('system/tests/Feature/myData')->data($data)->save();
        $instruction = ['from' => 'system/tests/Feature/myData', 'key' => 'key2'];
        $result = $this->handleSource($instruction);

        $this->assertEquals('value2', $result);
    }

    public function testHandleSourceWithFind(): void
    {
        $data = [
            ['id' => 1, 'name' => 'Item 1'],
            ['id' => 2, 'name' => 'Item 2'],
            ['id' => 3, 'name' => 'Item 1'],
        ];
        $this->commonStorage->address('system/tests/Feature/myDataArray')->data($data)->save();
        $instruction = ['from' => 'system/tests/Feature/myDataArray', 'find' => ['attr' => 'name', 'value' => 'Item 2']];
        $result = $this->handleSource($instruction);

        $this->assertEquals(['id' => 2, 'name' => 'Item 2'], $result);
    }

    public function testHandleSourceWithFindReturnKey(): void
    {
        $data = [
            ['id' => 1, 'name' => 'Item 1'],
            ['id' => 2, 'name' => 'Item 2'],
            ['id' => 3, 'name' => 'Item 3'],
        ];
        $this->commonStorage->address('system/tests/Feature/myDataArray')->data($data)->save();
        $instruction = [
            'from' => 'system/tests/Feature/myDataArray',
            'find' => ['attr' => 'id', 'value' => 2, 'return' => 'key']
        ];
        $result = $this->handleSource($instruction);

        $this->assertEquals(1, $result); // Should return index 1 (the second item)
    }

    public function testHandleSourceWithWithJsonEncode(): void
    {
        $data = ['key' => 'value'];
        $this->commonStorage->address('system/tests/Feature/myDataForJson')->data($data)->save();
        $instruction = ['from' => 'system/tests/Feature/myDataForJson', 'with' => 'json_encode'];
        $result = $this->handleSource($instruction);

        $this->assertEquals('{"key":"value"}', $result);
    }

    public function testBatchProcessing(): void
    {
        $instructions = [
            [
                'action' => 'update',
                'batch' => [
                    ['to' => 'system/tests/test_data', 'value' => 'value1'],
                    ['to' => 'system/tests/Feature/myData', 'value' => 'value2'],
                ]
            ]
        ];

        $response = $this->executeInstructions($instructions);

        $this->assertEquals('value1', $this->commonStorage->address('system/tests/test_data')->get());
        $this->assertEquals('value2', $this->commonStorage->address('system/tests/Feature/myData')->get());
    }

    public function testConditionalProcessing(): void
    {
        // Setup test data
        $this->commonStorage->address('system/tests/test_data')->set('initial')->save();

        $instructions = [
            [
                'action' => 'update',
                'condition' => true,
                'to' => 'system/tests/test_data',
                'value' => 'updated if true'
            ],
            [
                'action' => 'update',
                'condition' => false,
                'to' => 'system/tests/test_data',
                'value' => 'should not update'
            ]
        ];

        $response = $this->executeInstructions($instructions);

        $this->assertEquals('updated if true', $this->commonStorage->address('system/tests/test_data')->get());
    }

    public function testFindOperationWithArrayFilter(): void
    {
        // This test simulates how the find feature is used in PrimaryForm.php
        $windows = [
            ['id' => 1, 'selectedWindow' => 'window1', 'state' => [['run' => 0]]],
            ['id' => 2, 'selectedWindow' => 'window2', 'state' => [['run' => 1]]],
            ['id' => 3, 'selectedWindow' => 'window3', 'state' => [['run' => 2]]]
        ];

        $selectedWindow = 'window2';

        // Save data for testing
        $this->commonStorage->address('system/tests/primary-form/data/models/windows')->data($windows)->save();
        $this->commonStorage->address('system/tests/primary-form/data/program-section:selectedWindow')->data($selectedWindow)->save();

        // Set up the find instruction similar to PrimaryForm.php
        $instruction = [
            'from' => 'system/tests/primary-form/data/models/windows',
            'find' => [
                'attr' => 'selectedWindow',
                'value' => '{system/tests/primary-form/data/program-section:selectedWindow}',
                'return' => 'key'
            ]
        ];

        $result = $this->handleSource($instruction);

        $this->assertEquals(1, $result); // Should return index 1 for window2
    }

    public function testProcessInstructionWithActionUpdate(): void
    {
        $instruction = [
            'action' => 'update',
            'to' => 'system/tests/test_data',
            'value' => 'updated via process'
        ];

        // Set initial data to make sure it's properly overwritten
        $this->commonStorage->address('system/tests/test_data')->set('initial')->save();

        $response = $this->processInstruction($instruction);

        $this->assertInstanceOf(StepResponse::class, $response);
        $actualValue = $this->commonStorage->address('system/tests/test_data')->get();
        $this->assertEquals('updated via process', $actualValue);
    }

    public function testProcessInstructionWithNestedConditions(): void
    {
        // Set initial data
        $this->commonStorage->address('system/tests/test_data')->set('initial')->save();

        $instruction = [
            'action' => 'update',
            'condition' => true,
            'batch' => [
                [
                    'condition' => false,
                    'to' => 'system/tests/test_data',
                    'value' => 'should not update'
                ],
                [
                    'condition' => true,
                    'to' => 'system/tests/test_data',
                    'value' => 'should update'
                ]
            ]
        ];

        $response = $this->processInstruction($instruction);
        $actualValue = $this->commonStorage->address('system/tests/test_data')->get();
        $this->assertEquals('should update', $actualValue);
    }

    // Helper method needed for tests
    protected function filterData($data, $attr, $value)
    {
        if (!is_array($data)) {
            return [];
        }

        return array_filter($data, function ($item) use ($attr, $value) {
            return isset($item[$attr]) && $item[$attr] == $value;
        });
    }
}

