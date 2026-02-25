<?php

namespace Tests\Feature\AiRudeDepot\Support;

use App\AiRudeDepot\Storage\DataHub as Storage;
use App\AiRudeDepot\Processors\InstructionProcessor;
use Tests\TestCase;
use App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper;
use App\AiRudeDepot\App\StepResponse\StepResponse;

class DataTest extends TestCase
{
    use StorageHelper;

    protected $storage;
    protected $testPaths = [
        'system/tests/data/test_file',
        'system/tests/data/nested/test_file',
        'system/tests/data/complex_data',
        'system/tests/data/test_find',
        'system/tests/data/test_process'
    ];
    public bool $allowDebug = false;
    public bool $allowVerbosity = false;

    public function setUp(): void
    {
        parent::setUp();

        $this->storage = new Storage('aiTest');

        // Create test data
        $windowsData = [
            [
                'id' => 1,
                'selectedProgram' => 'program1',
                'selectedWindow' => 'window1',
                'state' => [['run' => 0, 'install' => 0]]
            ],
            [
                'id' => 2,
                'selectedProgram' => 'program2',
                'selectedWindow' => 'window2',
                'state' => [['run' => 1, 'install' => 1]]
            ]
        ];
        $this->storage->address('primary-form/data/models/windows')->data($windowsData)->save();

        $this->storage->address('system/tests/data/test_file')->data('test data')->save();

        $nestedData = [
            'level1' => [
                'level2' => 'nested value',
                'array' => [1, 2, 3]
            ]
        ];
        $this->storage->address('system/tests/data/nested/test_file')->data($nestedData)->save();

        $complexData = [
            'items' => [
                ['id' => 1, 'name' => 'Item 1', 'active' => true],
                ['id' => 2, 'name' => 'Item 2', 'active' => false],
                ['id' => 3, 'name' => 'Item 3', 'active' => true]
            ],
            'metadata' => [
                'count' => 3,
                'version' => '1.0'
            ]
        ];
        $this->storage->address('system/tests/data/complex_data')->data($complexData)->save();

        $findTestData = [
            ['id' => 101, 'name' => 'Test Item 1', 'type' => 'A'],
            ['id' => 102, 'name' => 'Test Item 2', 'type' => 'B'],
            ['id' => 103, 'name' => 'Test Item 3', 'type' => 'A'],
            ['id' => 104, 'name' => 'Test Item 4', 'type' => 'C']
        ];
        $this->storage->address('system/tests/data/test_find')->data($findTestData)->save();
    }

    public function tearDown(): void
    {
        foreach ($this->testPaths as $path) {
            try {
                $this->storage->address($path)->remove();
            } catch (\Exception $e) {
                // Ignore errors if file doesn't exist
            }
        }

        parent::tearDown();
    }

    public function testDataConstructor()
    {
        // Test that the storage property is set correctly in setUp
        $this->assertInstanceOf(Storage::class, $this->storage);
        // Test an address call returns InstructionProcessor
        $instructionProcessor = $this->storage->address('primary-form/data/models/windows');
        $this->assertInstanceOf(InstructionProcessor::class, $instructionProcessor);
        $this->assertNotEmpty($instructionProcessor->get());
    }

    public function testAddressMethod()
    {
        $result = $this->storage->address('system/tests/data/test_file');

        $this->assertInstanceOf(InstructionProcessor::class, $result);
        $this->assertNotNull($result->module);
    }

    public function testGetMethod()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_file');

        $result = $instructionProcessor->get();
        $this->assertEquals('test data', $result);
    }

    public function testSetMethod()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_file');

        $instructionProcessor->set('updated data');
        $this->assertEquals('updated data', $instructionProcessor->get());

        $newData = ['key' => 'value', 'nested' => ['subkey' => 'subvalue']];
        $instructionProcessor->set($newData);
        $this->assertEquals($newData, $instructionProcessor->get());
    }

    public function testSaveMethod()
    {
        $instructionProcessor1 = $this->storage->address('system/tests/data/test_file');

        $instructionProcessor1->set('saved data')->save();

        $instructionProcessor2 = $this->storage->address('system/tests/data/test_file');
        $this->assertEquals('saved data', $instructionProcessor2->get());
    }

    public function testFindMethod()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');

        $findResult = $instructionProcessor->find(['attr' => 'type', 'value' => 'B']);
        $this->assertEquals(["id" => 102, "name" => "Test Item 2", "type" => "B"], $findResult);
    }

    public function testFindReturnKeyMethod()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');

        $findResult = $instructionProcessor->find(['attr' => 'id', 'value' => '103', 'return' => 'key']);
        $this->assertEquals(2, $findResult);
    }

    public function testNestedDataAccess()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/nested/test_file');

        $nestedData = $instructionProcessor->get();
        $this->assertEquals('nested value', $nestedData['level1']['level2']);
        $this->assertEquals([1, 2, 3], $nestedData['level1']['array']);
    }

    public function testRemoveMethod()
    {
        $testPath = 'system/tests/removal_test';
        $anotherPath = 'system/tests/another_key';

        $this->storage->address($testPath)->data('test data for removal')->save();
        $this->storage->address($anotherPath)->data('another value')->save();

        $instructionProcessor = $this->storage->address($testPath);

        $this->assertEquals('test data for removal', $instructionProcessor->get());

        $removeResult = $instructionProcessor->remove();
        $instructionProcessor->save();

        $this->storage->clear();

        $storageData = $this->storage->address($testPath)->get();
        $this->assertEquals([], $storageData, "The remove method should result in an empty array when no keyPath is specified.");
    }

    public function testConditionalBatchProcessing()
    {
        $this->storage->address('system/tests/data/test_process')->set('initial')->save();

        $instructions = [
            [
                'action' => 'update',
                'condition' => true,
                'batch' => [
                    [
                        'to' => 'system/tests/data/test_process',
                        'value' => 'batch update 1'
                    ],
                    [
                        'condition' => false,
                        'to' => 'system/tests/data/test_process',
                        'value' => 'should not update'
                    ],
                    [
                        'to' => 'system/tests/data/test_process',
                        'value' => 'batch update 2'
                    ]
                ]
            ]
        ];

        $this->initializeActionHandlers();
        $this->commonStorage = $this->storage;

        $response = $this->executeInstructions($instructions);

        $this->assertInstanceOf(StepResponse::class, $response);
        $processedData = $this->storage->address('system/tests/data/test_process')->get();
        $this->assertEquals('batch update 2', $processedData);
    }

    public function testArrayFunctionality()
    {
        $instructions = [
            [
                'action' => 'update',
                'from' => 'system/tests/data/complex_data',
                'key' => 'items',
                'to' => 'system/tests/data/test_process'
            ]
        ];

        $complexData = $this->storage->address('system/tests/data/complex_data')->get();
        $this->assertIsArray($complexData);
        $this->assertArrayHasKey('items', $complexData);

        $this->initializeActionHandlers();
        $this->commonStorage = $this->storage;
        $response = $this->executeInstructions($instructions);

        $this->assertInstanceOf(StepResponse::class, $response);
        $result = $this->storage->address('system/tests/data/test_process')->get();
        $this->assertIsArray($result);
        $this->assertCount(3, $result);
        $this->assertEquals('Item 1', $result[0]['name']);
        $this->assertEquals($complexData['items'], $result);
    }

    public function testWithTransformations()
    {
        $transformations = [
            'json_encode' => ['input' => ['test' => 'value'], 'expected' => '{"test":"value"}'],
            'array_keys' => ['input' => ['key1' => 'val1', 'key2' => 'val2'], 'expected' => ['key1', 'key2']],
            'count' => ['input' => [1, 2, 3, 4], 'expected' => 4],
            'int' => ['input' => '123', 'expected' => 123],
        ];

        $this->initializeActionHandlers();
        $this->commonStorage = $this->storage;

        foreach ($transformations as $transform => $testCase) {
            $this->storage->address('system/tests/data/input_for_transform')->set($testCase['input'])->save();

            $instructions = [
                [
                    'action' => 'update',
                    'from' => 'system/tests/data/input_for_transform',
                    'with' => $transform,
                    'to' => 'system/tests/data/transform_result'
                ]
            ];

            $response = $this->executeInstructions($instructions);

            $this->assertInstanceOf(StepResponse::class, $response, "Failed for transformation: {$transform}");
            $result = $this->storage->address('system/tests/data/transform_result')->get();

            if (is_array($testCase['expected'])) {
                $this->assertEquals($testCase['expected'], $result, "Failed assertion for transformation: {$transform}");
            } else {
                $this->assertSame($testCase['expected'], $result, "Failed assertion for transformation: {$transform}");
            }

            $this->storage->address('system/tests/data/transform_result')->remove()->save();
        }

        $this->storage->address('system/tests/data/input_for_transform')->remove()->save();
    }

    public function testFindReturnsKeyWhenMatchFound()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');
        $key = $instructionProcessor->find(['attr' => 'name', 'value' => 'Test Item 2', 'return' => 'key']);
        $this->assertEquals(1, $key);
    }

    public function testFindReturnsItemWhenMatchFound()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');
        $item = $instructionProcessor->find(['attr' => 'name', 'value' => 'Test Item 2']);
        $this->assertEquals(['id' => 102, 'name' => 'Test Item 2', 'type' => 'B'], $item);

        $itemDefault = $instructionProcessor->find(['attr' => 'name', 'value' => 'Test Item 3', 'return' => 'item']);
        $this->assertEquals(['id' => 103, 'name' => 'Test Item 3', 'type' => 'A'], $itemDefault);
    }

    public function testFindReturnsNullWhenNoMatch()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');
        $key = $instructionProcessor->find(['attr' => 'name', 'value' => 'Non Existent Item', 'return' => 'key']);
        $this->assertNull($key);

        $item = $instructionProcessor->find(['attr' => 'name', 'value' => 'Non Existent Item']);
        $this->assertNull($item);
    }

    public function testFindWithDynamicValue()
    {
        $this->storage->address('system/tests/current_item_id')->set(103)->save();

        $instructionProcessor = $this->storage->address('system/tests/data/test_find');
        $item = $instructionProcessor->find(['attr' => 'id', 'value' => '{system/tests/current_item_id}']);
        $this->assertEquals(['id' => 103, 'name' => 'Test Item 3', 'type' => 'A'], $item);
    }

    public function testFindAfterRemove()
    {
        $instructionProcessor = $this->storage->address('system/tests/data/test_find');

        $keyToRemove = $instructionProcessor->find(['attr' => 'id', 'value' => 102, 'return' => 'key']);
        $this->assertNotNull($keyToRemove);
        $instructionProcessor->remove($keyToRemove)->save();

        $itemAfterRemove = $instructionProcessor->find(['attr' => 'id', 'value' => 102]);
        $this->assertNull($itemAfterRemove);

        $itemRemaining = $instructionProcessor->find(['attr' => 'id', 'value' => 103]);
        $this->assertNotNull($itemRemaining);
    }
}

