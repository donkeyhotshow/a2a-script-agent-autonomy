<?php

namespace Tests\Unit\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Storage\Data\Controllers\File;
use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StorageHelper;
use App\Hooks\StorageFacade as Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage as StorageFacade;
use Tests\TestCase;
use Exception;
use InvalidArgumentException;
use Illuminate\Contracts\Filesystem\FileNotFoundException;

class FileTest extends TestCase
{
    use RefreshDatabase;

    protected File $file;
    protected string $testPath = 'test/test.json';
    protected string $testDisk = 'local';
    protected array $testData = [
        'id' => 1,
        'name' => 'Test File',
        'data' => ['key' => 'value']
    ];

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test disk
        StorageFacade::fake($this->testDisk);
        
        // Initialize file
        $this->file = new File($this->testPath, $this->testDisk);
    }

    protected function tearDown(): void
    {
        // Clean up test files
        StorageFacade::disk($this->testDisk)->delete($this->testPath);
        
        parent::tearDown();
    }

    /**
     * Test file initialization
     */
    public function testFileInitialization(): void
    {
        $this->assertInstanceOf(File::class, $this->file);
        $this->assertEquals($this->testPath, $this->file->getPath());
        $this->assertEquals($this->testDisk, $this->file->getDisk());
    }

    /**
     * Test invalid disk name
     */
    public function testInvalidDiskName(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new File($this->testPath, 'invalid_disk');
    }

    /**
     * Test data loading
     */
    public function testDataLoading(): void
    {
        // Test loading with data
        $this->file->load($this->testData);
        $this->assertEquals($this->testData, $this->file->getData());

        // Test loading without data
        $this->file->load();
        $this->assertNull($this->file->getData());
    }

    /**
     * Test data reloading
     */
    public function testDataReloading(): void
    {
        // Save test data
        StorageFacade::disk($this->testDisk)->put(
            $this->testPath,
            JsonHelper::encode($this->testData)
        );

        // Test reloading data
        $this->file->reload();
        $this->assertEquals($this->testData, $this->file->getData());

        // Test reloading with new data
        $newData = ['new' => 'data'];
        $this->file->reload($newData);
        $this->assertEquals($newData, $this->file->getData());
    }

    /**
     * Test data saving
     */
    public function testDataSaving(): void
    {
        $this->file->load($this->testData);
        $result = $this->file->save();

        $this->assertTrue($result);
        $this->assertTrue(StorageFacade::disk($this->testDisk)->exists($this->testPath));
        $this->assertEquals(
            $this->testData,
            JsonHelper::decode(StorageFacade::disk($this->testDisk)->get($this->testPath))
        );
    }

    /**
     * Test path handling
     */
    public function testPathHandling(): void
    {
        $this->file->load($this->testData);
        
        // Test getting data by path
        $this->assertEquals('value', $this->file->get('data.key'));
        
        // Test setting data by path
        $this->file->set('data.new_key', 'new_value');
        $this->assertEquals('new_value', $this->file->get('data.new_key'));
        
        // Test removing data by path
        $this->file->remove('data.key');
        $this->assertNull($this->file->get('data.key'));
    }

    /**
     * Test file deletion
     */
    public function testFileDeletion(): void
    {
        // Create test file
        StorageFacade::disk($this->testDisk)->put(
            $this->testPath,
            JsonHelper::encode($this->testData)
        );

        // Test file deletion
        $result = $this->file->deleteFile();
        $this->assertTrue($result);
        $this->assertFalse(StorageFacade::disk($this->testDisk)->exists($this->testPath));
    }

    /**
     * Test error handling
     */
    public function testErrorHandling(): void
    {
        // Test invalid path
        $this->expectException(InvalidArgumentException::class);
        new File('');

        // Test file not found
        $this->file->reload();
        $this->assertNull($this->file->getData());
    }

    /**
     * Test logging
     */
    public function testLogging(): void
    {
        // Test debug logging
        $this->file->load($this->testData);
        $this->assertTrue(LogHelper::hasDebug('File::load'));

        // Test error logging
        try {
            $this->file->load('invalid_data');
        } catch (Exception $e) {
            $this->assertTrue(LogHelper::hasError('File::load'));
        }
    }

    /**
     * Test performance
     */
    public function testPerformance(): void
    {
        $startTime = microtime(true);
        
        // Perform multiple operations
        for ($i = 0; $i < 1000; $i++) {
            $this->file->set("key{$i}", "value{$i}");
        }
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        // Assert that operations complete within reasonable time
        $this->assertLessThan(1.0, $executionTime);
    }
} 