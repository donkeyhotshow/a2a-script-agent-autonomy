<?php

namespace Tests\Unit\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Storage\Data\Controllers\Model;
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Hooks\StorageFacade as Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Exception;
use InvalidArgumentException;

class ModelTest extends TestCase
{
    use RefreshDatabase;

    protected Model $model;
    protected string $testTable = 'test_table';
    protected array $testData = [
        'id' => 1,
        'name' => 'Test Model',
        'data' => ['key' => 'value']
    ];

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test table
        $this->artisan('migrate', [
            '--path' => 'database/migrations/test',
            '--force' => true
        ]);

        // Initialize model
        $this->model = new Model($this->testTable);
    }

    protected function tearDown(): void
    {
        // Clean up test table
        $this->artisan('migrate:rollback', [
            '--path' => 'database/migrations/test',
            '--force' => true
        ]);

        parent::tearDown();
    }

    /**
     * Test model initialization
     */
    public function testModelInitialization(): void
    {
        $this->assertInstanceOf(Model::class, $this->model);
        $this->assertEquals($this->testTable, $this->model->getTable());
    }

    /**
     * Test data loading
     */
    public function testDataLoading(): void
    {
        // Test loading with data
        $this->model->load($this->testData);
        $this->assertEquals($this->testData, $this->model->getData());

        // Test loading without data
        $this->model->load();
        $this->assertNull($this->model->getData());
    }

    /**
     * Test data saving
     */
    public function testDataSaving(): void
    {
        $this->model->load($this->testData);
        $result = $this->model->save();

        $this->assertTrue($result);
        $this->assertEquals($this->testData, $this->model->getData());
    }

    /**
     * Test error handling
     */
    public function testErrorHandling(): void
    {
        // Test invalid table name
        $this->expectException(InvalidArgumentException::class);
        new Model('');

        // Test invalid data
        $this->expectException(Exception::class);
        $this->model->load('invalid_data');
    }

    /**
     * Test path handling
     */
    public function testPathHandling(): void
    {
        $this->model->load($this->testData);
        
        // Test getting data by path
        $this->assertEquals('value', $this->model->get('data.key'));
        
        // Test setting data by path
        $this->model->set('data.new_key', 'new_value');
        $this->assertEquals('new_value', $this->model->get('data.new_key'));
        
        // Test removing data by path
        $this->model->remove('data.key');
        $this->assertNull($this->model->get('data.key'));
    }

    /**
     * Test logging
     */
    public function testLogging(): void
    {
        // Test debug logging
        $this->model->load($this->testData);
        $this->assertTrue(LogHelper::hasDebug('Model::load'));

        // Test error logging
        try {
            $this->model->load('invalid_data');
        } catch (Exception $e) {
            $this->assertTrue(LogHelper::hasError('Model::load'));
        }
    }

    /**
     * Test array helper integration
     */
    public function testArrayHelperIntegration(): void
    {
        $this->model->load($this->testData);
        
        // Test getting nested data
        $this->assertEquals('value', ArrayHelper::get($this->model->getData(), 'data.key'));
        
        // Test setting nested data
        $this->model->set('data.nested.key', 'nested_value');
        $this->assertEquals('nested_value', ArrayHelper::get($this->model->getData(), 'data.nested.key'));
    }

    /**
     * Test performance
     */
    public function testPerformance(): void
    {
        $startTime = microtime(true);
        
        // Perform multiple operations
        for ($i = 0; $i < 1000; $i++) {
            $this->model->set("key{$i}", "value{$i}");
        }
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        // Assert that operations complete within reasonable time
        $this->assertLessThan(1.0, $executionTime);
    }
} 