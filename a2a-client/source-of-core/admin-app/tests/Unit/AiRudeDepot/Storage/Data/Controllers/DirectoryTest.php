<?php

namespace Tests\Unit\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Storage\Data\Controllers\Directory;
use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StorageHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Exception;
use InvalidArgumentException;
use RuntimeException;

class DirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected Directory $directory;
    protected string $testPath = 'test/directory';
    protected string $testDisk = 'local';
    protected array $testData = [
        'file1.json' => ['id' => 1, 'name' => 'Test File 1'],
        'file2.json' => ['id' => 2, 'name' => 'Test File 2'],
        'subdir' => [
            'file3.json' => ['id' => 3, 'name' => 'Test File 3']
        ]
    ];

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test disk
        Storage::fake($this->testDisk);
        
        // Create test directory structure
        $this->createTestDirectoryStructure();
        
        // Initialize directory
        $this->directory = new Directory($this->testPath, $this->testDisk);
    }

    protected function tearDown(): void
    {
        // Clean up test files
        Storage::disk($this->testDisk)->deleteDirectory($this->testPath);
        
        parent::tearDown();
    }

    /**
     * Create test directory structure
     */
    protected function createTestDirectoryStructure(): void
    {
        $disk = Storage::disk($this->testDisk);
        
        // Create main directory
        $disk->makeDirectory($this->testPath);
        
        // Create test files
        foreach ($this->testData as $filename => $data) {
            if (is_array($data) && !isset($data['id'])) {
                // This is a subdirectory
                $disk->makeDirectory($this->testPath . '/' . $filename);
                foreach ($data as $subFilename => $subData) {
                    $disk->put(
                        $this->testPath . '/' . $filename . '/' . $subFilename,
                        JsonHelper::encode($subData)
                    );
                }
            } else {
                // This is a file
                $disk->put(
                    $this->testPath . '/' . $filename,
                    JsonHelper::encode($data)
                );
            }
        }
    }

    /**
     * Test directory initialization
     */
    public function testDirectoryInitialization(): void
    {
        $this->assertInstanceOf(Directory::class, $this->directory);
        $this->assertEquals($this->testPath, $this->directory->getPath());
        $this->assertEquals($this->testDisk, $this->directory->getDisk());
    }

    /**
     * Test invalid disk
     */
    public function testInvalidDisk(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new Directory($this->testPath, 'invalid_disk');
    }

    /**
     * Test data loading
     */
    public function testDataLoading(): void
    {
        // Test loading with data
        $this->directory->load($this->testData);
        $this->assertEquals($this->testData, $this->directory->getData());

        // Test loading without data
        $this->directory->load();
        $this->assertEmpty($this->directory->getData());
    }

    /**
     * Test data reloading
     */
    public function testDataReloading(): void
    {
        // Test reloading data
        $this->directory->reload();
        $this->assertEquals($this->testData, $this->directory->getData());

        // Test reloading with new data
        $newData = ['new' => 'data'];
        $this->directory->reload($newData);
        $this->assertEquals($newData, $this->directory->getData());
    }

    /**
     * Test data getting
     */
    public function testDataGetting(): void
    {
        $this->directory->reload();
        
        // Test getting all data
        $result = $this->directory->get();
        $this->assertEquals($this->testData, $result);
        
        // Test getting specific file data
        $this->assertEquals(
            $this->testData['file1.json'],
            $this->directory->get('file1.json')
        );
        
        // Test getting nested data
        $this->assertEquals(
            $this->testData['subdir']['file3.json'],
            $this->directory->get('subdir.file3.json')
        );
    }

    /**
     * Test read-only operations
     */
    public function testReadOnlyOperations(): void
    {
        // Test saving
        $this->expectException(RuntimeException::class);
        $this->directory->save();

        // Test setting data
        $this->expectException(RuntimeException::class);
        $this->directory->set('new_key', 'new_value');
    }

    /**
     * Test error handling
     */
    public function testErrorHandling(): void
    {
        // Test invalid path
        $this->expectException(InvalidArgumentException::class);
        new Directory('', $this->testDisk);

        // Test non-existent directory
        $nonExistentDir = new Directory('non_existent', $this->testDisk);
        $this->assertEmpty($nonExistentDir->get());
    }

    /**
     * Test logging
     */
    public function testLogging(): void
    {
        // Test debug logging
        $this->directory->reload();
        $this->assertTrue(LogHelper::hasDebug('Directory::reload'));

        // Test warning logging for non-existent directory
        $nonExistentDir = new Directory('non_existent', $this->testDisk);
        $nonExistentDir->reload();
        $this->assertTrue(LogHelper::hasWarning('Directory::loadDataFromDirectory'));
    }

    /**
     * Test performance
     */
    public function testPerformance(): void
    {
        $startTime = microtime(true);
        
        // Perform multiple operations
        for ($i = 0; $i < 100; $i++) {
            $this->directory->get();
        }
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        // Assert that operations complete within reasonable time
        $this->assertLessThan(1.0, $executionTime);
    }
} 