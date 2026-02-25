<?php

namespace Tests\Feature\AiRudeDepot\StorageDataModules;

use App\Hooks\FileFacade;
use App\AiRudeDepot\Processors\InstructionProcessor;
use App\AiRudeDepot\Support\Facades\Data;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\StoragePathParser;
use Tests\TestCase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FileStorageTest extends TestCase
{
    protected $DataHub;
    protected $testFilePath;
    protected $testFileDir;
    protected $nestedDir;
    protected $nestedFilePath;
    protected string $testDiskName = 'aiTest';

    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->DataHub = new DataHub($this->testDiskName);
        Storage::disk($this->testDiskName)->deleteDirectory('');
        Storage::disk($this->testDiskName)->makeDirectory('');

        $this->testFileDir = 'test-files';
        $this->testFilePath = $this->testFileDir . '/test.json';
        $this->nestedDir = $this->testFileDir . '/nested';
        $this->nestedFilePath = $this->nestedDir . '/nested-test.json';

        Storage::disk($this->testDiskName)->makeDirectory($this->testFileDir);
        Storage::disk($this->testDiskName)->makeDirectory($this->nestedDir);

        $testData = [
            'name' => 'Test File',
            'description' => 'This is a test file',
            'values' => [1, 2, 3, 4],
            'nested' => [
                'key1' => 'value1',
                'key2' => 'value2'
            ]
        ];
        Storage::disk($this->testDiskName)->put($this->testFilePath, json_encode($testData));

        $nestedData = [
            'name' => 'Nested Test',
            'nested' => true
        ];
        Storage::disk($this->testDiskName)->put($this->nestedFilePath, json_encode($nestedData));
    }

    protected function tearDown(): void
    {
        Storage::disk($this->testDiskName)->deleteDirectory('');
        parent::tearDown();
    }

    public function test_parse_file_address()
    {
        $testCases = [
            [
                'address' => 'test-files/test',
                'expected' => [
                    'storagePath' => 'test-files/test',
                    'keyPath' => [],
                    'pathName' => 'file!test-files/test',
                    'moduleName' => 'File',
                    'label' => 'test',
                    'parameters' => [],
                    'filePath' => Storage::disk($this->testDiskName)->path('test-files/test.json')
                ]
            ], [
                'address' => 'file!test-files/test',
                'expected' => [
                    'storagePath' => 'test-files/test',
                    'keyPath' => [],
                    'pathName' => 'file!test-files/test',
                    'moduleName' => 'File',
                    'label' => 'test',
                    'parameters' => [],
                    'filePath' => Storage::disk($this->testDiskName)->path('test-files/test.json')
                ]
            ],
            [
                'address' => 'file!test-files/test:name',
                'expected' => [
                    'storagePath' => 'test-files/test',
                    'keyPath' => ['name'],
                    'pathName' => 'file!test-files/test',
                    'moduleName' => 'File',
                    'label' => 'name',
                    'parameters' => [],
                    'filePath' => Storage::disk($this->testDiskName)->path('test-files/test.json')
                ]
            ],
            [
                'address' => 'file!test-files/test:nested.key1',
                'expected' => [
                    'storagePath' => 'test-files/test',
                    'keyPath' => ['nested', 'key1'],
                    'pathName' => 'file!test-files/test',
                    'moduleName' => 'File',
                    'label' => 'key1',
                    'parameters' => [],
                    'filePath' => Storage::disk($this->testDiskName)->path('test-files/test.json')
                ]
            ]
        ];

        Storage::disk($this->testDiskName)->makeDirectory('test-files');
        Storage::disk($this->testDiskName)->put('test-files/test.json', '{}');

        foreach ($testCases as $case) {
            $pathInfo = StoragePathParser::parse($case['address'], false, $this->testDiskName);

            if (isset($pathInfo['filePath'])) {
                $pathInfo['filePath'] = str_replace('\\', '/', $pathInfo['filePath']);
            }
            if (isset($case['expected']['filePath'])) {
                $case['expected']['filePath'] = str_replace('\\', '/', $case['expected']['filePath']);
            }

            $this->assertEquals(
                $case['expected'],
                $pathInfo,
                "Failed parsing address: {$case['address']}"
            );
        }
    }

    public function test_address_returns_data_instance()
    {
        $address = 'file!test-files/test';
        $dataInstance = $this->DataHub->address($address);
        $this->assertInstanceOf(\App\AiRudeDepot\Processors\InstructionProcessor::class, $dataInstance);
    }

    public function test_get_file_data()
    {
        // Test getting entire file
        $address = 'file!test-files/test';
        $dataInstance = $this->DataHub->address($address);
        $data = $dataInstance->get();

        $this->assertIsArray($data);
        $this->assertEquals('Test File', $data['name']);
        $this->assertEquals('This is a test file', $data['description']);
        $this->assertEquals([1, 2, 3, 4], $data['values']);
        $this->assertIsArray($data['nested']);
        $this->assertEquals('value1', $data['nested']['key1']);
        $this->assertEquals('value2', $data['nested']['key2']);

        // Test getting specific property
        $address = 'file!test-files/test:name';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('Test File', $dataInstance->get());

        // Test getting nested property
        $address = 'file!test-files/test:nested.key1';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('value1', $dataInstance->get());

        // Test getting array element
        $address = 'file!test-files/test:values.2';
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals(3, $dataInstance->get());

        // Test getting nested file
        $address = 'file!test-files/nested/nested-test';
        $dataInstance = $this->DataHub->address($address);
        $data = $dataInstance->get();

        $this->assertIsArray($data);
        $this->assertArrayHasKey('nested', $data);
        $this->assertEquals('Nested Test', $data['name']);
    }

    public function test_set_file_data()
    {
        // Test setting entire file
        $address = 'file!test-files/new-file';
        $dataInstance = $this->DataHub->address($address);
        $newData = ['new' => true, 'value' => 123];
        $dataInstance->set($newData);

        // Save the file
        $dataInstance->save();

        // Now the file should exist (try to get it from storage to verify it exists)
        $savedData = $this->DataHub->address($address)->get();
        $this->assertEquals($newData, $savedData);

        // Test updating existing file
        $address = 'file!test-files/test';
        $dataInstance = $this->DataHub->address($address);
        $data = $dataInstance->get();

        // Modify data
        $data['name'] = 'Updated Name';
        $data['newKey'] = 'New Value';

        // Set and save
        $dataInstance->set($data)->save();

        // Verify file was updated
        $updatedContent = $this->DataHub->address($address)->get();
        $this->assertEquals('Updated Name', $updatedContent['name']);
        $this->assertEquals('New Value', $updatedContent['newKey']);
        $this->assertEquals('This is a test file', $updatedContent['description']); // Original value preserved

        // Test updating specific property
        $address = 'file!test-files/test:description';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('Updated description')->save();

        // Verify specific property was updated
        $updatedContent = $this->DataHub->address($address)->get();
        $this->assertEquals('Updated description', $updatedContent);
    }

    public function test_remove_file_data()
    {
        // Initialize test file with known data
        $address = 'file!test-files/test';
        $testData = [
            'name' => 'Test File',
            'description' => 'This is a test file',
            'values' => [1, 2, 3, 4],
            'nested' => [
                'key1' => 'value1',
                'key2' => 'value2'
            ]
        ];
        $this->DataHub->address($address)->set($testData)->save();

        // Test removing a property
        $address = 'file!test-files/test:description';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove()->save();

        // Verify property was removed
        $updatedContent = $this->DataHub->address('file!test-files/test')->get();
        $this->assertArrayNotHasKey('description', $updatedContent);

        // Test removing nested property
        $address = 'file!test-files/test:nested.key1';
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove()->save();

        // Verify nested property was removed
        $updatedNestedContent = $this->DataHub->address('file!test-files/test')->get();
        $this->assertIsArray($updatedNestedContent['nested']);
        $this->assertArrayNotHasKey('key1', $updatedNestedContent['nested']);
        $this->assertEquals('value2', $updatedNestedContent['nested']['key2']); // Other nested values preserved

        // Test removing array element
        $address = 'file!test-files/test:values.1'; // Remove the second element (index 1)
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove()->save();

        // Verify array element was removed
        $updatedArrayContent = $this->DataHub->address('file!test-files/test')->get();
        $this->assertEquals([1, 3, 4], $updatedArrayContent['values']); // Element removed and array reindexed
    }
}
