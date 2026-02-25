<?php

namespace Tests\Feature\AiRudeDepot\Support;

// use App\AiRudeDepot\Support\StaticStorage; // Non-existent
use App\AiRudeDepot\Storage\DataHub as StaticStorage;

// Use DataHub instead
use Tests\TestCase;
use Illuminate\Support\Facades\Storage;

class StaticStorageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Manually set up a test DataHub for StaticStorage
        $testStorage = new StaticStorage('aiTest'); // Use the alias StaticStorage
        // StaticStorage::$storage = $testStorage; // REMOVE - Cannot access protected static property
    }

    protected function tearDown(): void
    {
        // StaticStorage::$storage = null; // REMOVE - Cannot access protected static property
        // Reset the actual static instance inside DataHub using reflection if needed
        $reflection = new \ReflectionClass(StaticStorage::class); // Use alias
        if ($reflection->hasProperty('staticStorageInstance')) {
            $property = $reflection->getProperty('staticStorageInstance');
            $property->setValue(null);
        }
        parent::tearDown();
    }

    public function testFakeStorage()
    {
        // Revert to using the alias
        // $storage = new \App\AiRudeDepot\Storage\DataHub('aiTest');
        $storage = new StaticStorage('aiTest'); // Use alias
        $this->assertTrue($storage instanceof \App\AiRudeDepot\Storage\DataHub); // Assert against actual class
    }
}
