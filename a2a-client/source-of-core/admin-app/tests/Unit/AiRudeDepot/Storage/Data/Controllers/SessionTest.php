<?php

namespace Tests\Unit\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Storage\Data\Controllers\Session;
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\StringHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Session\Store;
use Tests\TestCase;
use Exception;
use InvalidArgumentException;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    protected Session $session;
    protected Store $sessionStore;
    protected string $testPath = 'test.path';
    protected array $testData = [
        'id' => 1,
        'name' => 'Test Session',
        'data' => ['key' => 'value']
    ];

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create session store
        $this->sessionStore = $this->app['session.store'];
        
        // Initialize session
        $this->session = new Session($this->sessionStore, $this->testPath);
    }

    protected function tearDown(): void
    {
        // Clean up session data
        $this->sessionStore->forget($this->testPath);
        
        parent::tearDown();
    }

    /**
     * Test session initialization
     */
    public function testSessionInitialization(): void
    {
        $this->assertInstanceOf(Session::class, $this->session);
        $this->assertInstanceOf(Store::class, $this->sessionStore);
    }

    /**
     * Test invalid path
     */
    public function testInvalidPath(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new Session($this->sessionStore, '');
    }

    /**
     * Test data getting
     */
    public function testDataGetting(): void
    {
        // Set test data
        $this->sessionStore->put($this->testPath, $this->testData);
        
        // Test getting data
        $result = $this->session->get();
        $this->assertEquals($this->testData, $result);
        
        // Test getting nested data
        $this->assertEquals('value', $this->session->get('data.key'));
        
        // Test getting all data
        $allData = $this->session->get(null);
        $this->assertIsArray($allData);
        $this->assertArrayHasKey($this->testPath, $allData);
    }

    /**
     * Test data setting
     */
    public function testDataSetting(): void
    {
        // Test setting data
        $this->session->set($this->testData);
        $this->assertEquals($this->testData, $this->sessionStore->get($this->testPath));
        
        // Test setting nested data
        $this->session->set('data.new_key', 'new_value');
        $this->assertEquals('new_value', $this->sessionStore->get($this->testPath . '.data.new_key'));
    }

    /**
     * Test data removal
     */
    public function testDataRemoval(): void
    {
        // Set test data
        $this->sessionStore->put($this->testPath, $this->testData);
        
        // Test removing data
        $this->session->remove();
        $this->assertNull($this->sessionStore->get($this->testPath));
        
        // Test removing nested data
        $this->sessionStore->put($this->testPath, $this->testData);
        $this->session->remove('data.key');
        $this->assertNull($this->sessionStore->get($this->testPath . '.data.key'));
    }

    /**
     * Test session saving
     */
    public function testSessionSaving(): void
    {
        // Set test data
        $this->session->set($this->testData);
        
        // Test saving session
        $this->session->save();
        $this->assertEquals($this->testData, $this->sessionStore->get($this->testPath));
    }

    /**
     * Test error handling
     */
    public function testErrorHandling(): void
    {
        // Test setting without path
        $this->expectException(InvalidArgumentException::class);
        $this->session->set('');

        // Test removing without path
        $this->expectException(InvalidArgumentException::class);
        $this->session->remove('');
    }

    /**
     * Test logging
     */
    public function testLogging(): void
    {
        // Test debug logging
        $this->session->get();
        $this->assertTrue(LogHelper::hasDebug('Session::get'));

        // Test error logging
        try {
            $this->session->set('');
        } catch (InvalidArgumentException $e) {
            $this->assertTrue(LogHelper::hasError('Session::set'));
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
            $this->session->set("key{$i}", "value{$i}");
        }
        
        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;
        
        // Assert that operations complete within reasonable time
        $this->assertLessThan(1.0, $executionTime);
    }
} 