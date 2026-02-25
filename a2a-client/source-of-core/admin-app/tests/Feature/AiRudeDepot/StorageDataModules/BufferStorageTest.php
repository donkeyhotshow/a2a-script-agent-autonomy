<?php

namespace Tests\Feature\AiRudeDepot\StorageDataModules;

use App\AiRudeDepot\Processors\InstructionProcessor;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\StoragePathParser;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;

class BufferStorageTest extends TestCase
{
    protected $DataHub;

    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->DataHub = new DataHub();

        // Setup logging for the test method if needed
        // $testName = $this->getName(false); // COMMENTED OUT
        // $className = get_class($this);
        // $logPath = storage_path("logs/tests/". str_replace('\\', '_', $className) ."/". $testName . ".log");
        // if (!file_exists(dirname($logPath))) {
        //     mkdir(dirname($logPath), 0777, true);
        // }
        // // Configure a dedicated JSON log channel for the test
        // Log::build([
        //   'driver' => 'single',
        //   'path' => $logPath,
        //   'level' => 'debug',
        // ])->info("--- Test Started: " . $className . '::' . $testName . " ---");
    }

    public function test_parse_buffer_address()
    {
        $testCases = [
            [
                'address' => 'args',
                'expected' => [
                    'storagePath' => 'args',
                    'keyPath' => [],
                    'pathName' => 'buffer!args',
                    'moduleName' => 'Buffer',
                    'label' => 'args',
                    'parameters' => [],
                    'filePath' => null
                ]
            ], [
                'address' => 'output',
                'expected' => [
                    'storagePath' => 'output',
                    'keyPath' => [],
                    'pathName' => 'buffer!output',
                    'moduleName' => 'Buffer',
                    'label' => 'output',
                    'parameters' => [], 'filePath' => null
                ]
            ],
            [
                'address' => 'input:simple',
                'expected' => [
                    'storagePath' => 'input',
                    'keyPath' => ['simple'],
                    'pathName' => 'buffer!input',
                    'moduleName' => 'Buffer',
                    'label' => 'simple',
                    'parameters' => [],
                    'filePath' => null
                ]
            ],
            [
                'address' => 'buffer:simple',
                'expected' => [
                    'storagePath' => 'buffer',
                    'keyPath' => ['simple'],
                    'pathName' => 'buffer!buffer',
                    'moduleName' => 'Buffer',
                    'label' => 'simple',
                    'parameters' => [], 'filePath' => null
                ]
            ],
            [
                'address' => 'buffer:nested.value',
                'expected' => [
                    'storagePath' => 'buffer',
                    'keyPath' => ['nested', 'value'],
                    'pathName' => 'buffer!buffer',
                    'moduleName' => 'Buffer',
                    'label' => 'value',
                    'parameters' => [], 'filePath' => null
                ]
            ],
            [
                'address' => 'buffer:deeply.nested.path.value',
                'expected' => [
                    'storagePath' => 'buffer',
                    'keyPath' => ['deeply', 'nested', 'path', 'value'],
                    'pathName' => 'buffer!buffer',
                    'moduleName' => 'Buffer',
                    'label' => 'value',
                    'parameters' => [], 'filePath' => null
                ]
            ]
        ];

        foreach ($testCases as $case) {
            $pathInfo = StoragePathParser::parse($case['address']);
            $this->assertEquals(
                $case['expected'],
                $pathInfo,
                "Failed parsing address: {$case['address']}"
            );
        }
    }

    public function test_address_returns_data_instance()
    {
        $address = 'buffer:test';
        $dataInstance = $this->DataHub->address($address);
        $this->assertInstanceOf(\App\AiRudeDepot\Processors\InstructionProcessor::class, $dataInstance);
    }

    public function test_set_get_buffer_data()
    {
        // Test simple value
        $address = 'buffer:testKey';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('testValue');

        $this->assertEquals('testValue', $dataInstance->get());

        // Test array value
        $address = 'buffer:testArray';
        $arrayData = ['key1' => 'value1', 'key2' => 'value2'];
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set($arrayData);

        $this->assertEquals($arrayData, $dataInstance->get());

        // Test accessing nested keys
        $address = 'buffer:testArray.key1';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('value1', $dataInstance->get());

        // Test with complex nested data
        $address = 'buffer:complex';
        $complexData = [
            'level1' => [
                'level2' => [
                    'level3' => 'nestedValue',
                    'array' => [1, 2, 3, 4]
                ]
            ],
            'siblings' => ['a', 'b', 'c']
        ];

        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set($complexData);

        // Access deeply nested value
        $address = 'buffer:complex.level1.level2.level3';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('nestedValue', $dataInstance->get());

        // Access array element in nested structure
        $address = 'buffer:complex.level1.level2.array.2';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals(3, $dataInstance->get());

        // Access sibling array element
        $address = 'buffer:complex.siblings.1';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('b', $dataInstance->get());
    }

    public function test_set_nested_buffer_data()
    {
        // Set up initial data
        $address = 'buffer:parent';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set(['child' => 'initialValue']);

        // Set nested value
        $address = 'buffer:parent.child';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('updatedValue');

        // Verify updated value
        $this->assertEquals('updatedValue', $dataInstance->get());

        // Verify parent structure is preserved
        $address = 'buffer:parent';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals(['child' => 'updatedValue'], $dataInstance->get());

        // Create new nested path
        $address = 'buffer:parent.newChild.grandchild';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('newNestedValue');

        // Verify new nested value
        $this->assertEquals('newNestedValue', $dataInstance->get());

        // Verify parent structure is updated correctly
        $address = 'buffer:parent';
        $dataInstance = $this->DataHub->address($address);
        $expected = [
            'child' => 'updatedValue',
            'newChild' => [
                'grandchild' => 'newNestedValue'
            ]
        ];
        $this->assertEquals($expected, $dataInstance->get());
    }

    public function test_remove_buffer_data()
    {
        // Set up test data
        $address = 'buffer:toRemove';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set([
            'key1' => 'value1',
            'key2' => 'value2',
            'nested' => [
                'a' => 1,
                'b' => 2
            ]
        ]);

        // Remove a top-level key
        $address = 'buffer:toRemove.key1';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove();

        // Verify it's removed
        $address = 'buffer:toRemove';
        $dataInstance = $this->DataHub->address($address);
        $result = $dataInstance->get();

        $this->assertArrayNotHasKey('key1', $result);
        $this->assertArrayHasKey('key2', $result);
        $this->assertArrayHasKey('nested', $result);

        // Remove a nested key
        $address = 'buffer:toRemove.nested.a';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove();

        // Verify nested key is removed but parent stays
        $address = 'buffer:toRemove.nested';
        $dataInstance = $this->DataHub->address($address);
        $result = $dataInstance->get();

        $this->assertArrayNotHasKey('a', $result);
        $this->assertArrayHasKey('b', $result);
    }

    /**
     * Очищаем данные после тестов
     */
    protected function tearDown(): void
    {
        parent::tearDown();
    }
}
