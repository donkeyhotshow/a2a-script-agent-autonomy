<?php

namespace Tests\Feature\AiRudeDepot\StorageDataModules;

use App\AiRudeDepot\Processors\InstructionProcessor;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Support\Facades\Data;
use App\AiRudeDepot\Managers\StoragePathParser;
use Illuminate\Support\Facades\Session as LaravelSession;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

class SessionStorageTest extends TestCase
{
    protected $DataHub;
    protected string $testDiskName = 'aiTest';
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    public function test_parse_session_address()
    {
        $testCases = [
            [
                'address' => 'session!user',
                'expected' => [
                    'storagePath' => 'session',
                    'keyPath' => ['user'],
                    'pathName' => 'session',
                    'moduleName' => 'Session',
                    'label' => 'user',
                    'parameters' => [],
                    'filePath' => null
                ]
            ],
            [
                'address' => 'session:user.preferences',
                'expected' => [
                    'storagePath' => 'session',
                    'keyPath' => ['user', 'preferences'],
                    'pathName' => 'session',
                    'moduleName' => 'Session',
                    'label' => 'preferences',
                    'parameters' => [],
                    'filePath' => null
                ]
            ],
            [
                'address' => 'session:user.preferences.theme',
                'expected' => [
                    'storagePath' => 'session',
                    'keyPath' => ['user', 'preferences', 'theme'],
                    'pathName' => 'session',
                    'moduleName' => 'Session',
                    'label' => 'theme',
                    'parameters' => [],
                    'filePath' => null
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
        $address = 'session:testKey';
        $dataInstance = $this->DataHub->address($address);
        $this->assertInstanceOf(\App\AiRudeDepot\Processors\InstructionProcessor::class, $dataInstance);
    }

    public function test_set_get_session_data()
    {
        // Test with simple value
        $address = 'session:testKey'; // keyPath = ['testKey']
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('testValue'); // Sets session['testKey']

        $this->assertEquals('testValue', $dataInstance->get());
        $this->assertEquals('testValue', LaravelSession::get('testKey'));

        // Test with array data at top level key 'user'
        $address = 'session:user'; // keyPath = ['user']
        $userData = [
            'id' => 1,
            'name' => 'Test User',
            'preferences' => [
                'theme' => 'dark',
                'notifications' => true
            ]
        ];
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set($userData); // Sets session['user']

        $this->assertEquals($userData, $dataInstance->get());
        $this->assertEquals($userData, LaravelSession::get('user'));

        // Test accessing nested data
        $address = 'session:user.preferences.theme'; // keyPath = ['user', 'preferences', 'theme']
        $dataInstance = $this->DataHub->address($address);
        // $dataInstance->get() will use its keyPath ['user', 'preferences', 'theme']
        $this->assertEquals('dark', $dataInstance->get());

        // Test setting nested data
        $address = 'session:user.preferences.language'; // keyPath = ['user', 'preferences', 'language']
        $dataInstance = $this->DataHub->address($address);
        // $dataInstance->set('ua') will use its keyPath to set session['user.preferences.language']
        $dataInstance->set('ua');
        $this->assertEquals('ua', $dataInstance->get());

        // Verify the whole user structure in the real session
        $expectedUserData = $userData; // Base user data
        Arr::set($expectedUserData, 'preferences.language', 'ua'); // Add language
        // Check the real session directly using the base key
        $this->assertEquals($expectedUserData, LaravelSession::get('user'));

        // Test setting data using only value (uses path from constructor)
        $address = 'session:user.preferences.notifications'; // keyPath = ['user', 'preferences', 'notifications']
        $dataInstance = $this->DataHub->address($address);
        // $dataInstance->set(false) uses its keyPath
        $dataInstance->set(false);
        $this->assertEquals(false, $dataInstance->get());
        Arr::set($expectedUserData, 'preferences.notifications', false); // Update expected
        $this->assertEquals($expectedUserData, LaravelSession::get('user')); // Check real session

        // Test setting the base key itself (now just sets 'user')
        $address = 'session:user'; // keyPath = ['user']
        $dataInstance = $this->DataHub->address($address);
        $newBaseData = ['name' => 'Updated User'];
        $dataInstance->set($newBaseData); // Sets session['user']
        $this->assertEquals($newBaseData, $dataInstance->get());
        $this->assertEquals($newBaseData, LaravelSession::get('user'));

        // Test setting data with NO base key (now path is just the key)
        $address = 'session:directKeyOnly'; // keyPath = ['directKeyOnly']
        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set('directValue'); // Sets session['directKeyOnly']
        $this->assertEquals('directValue', $dataInstance->get());
        $this->assertEquals('directValue', LaravelSession::get('directKeyOnly'));
    }

    public function test_remove_session_data()
    {
        // Set up session data directly
        LaravelSession::put('toBeRemoved', 'testValue');
        LaravelSession::put('userToRemove', ['id' => 2, 'prefs' => ['lang' => 'en']]);
        LaravelSession::put('userToRemoveNested', ['id' => 3, 'prefs' => ['lang' => 'fr', 'theme' => 'light']]);

        // Test removing direct key
        $address = 'session:toBeRemoved'; // keyPath = ['toBeRemoved']
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('testValue', $dataInstance->get());
        $dataInstance->remove(); // Removes session['toBeRemoved']
        $this->assertNull($dataInstance->get());
        $this->assertNull(LaravelSession::get('toBeRemoved'));

        // Test removing another direct key
        $address = 'session:userToRemove'; // keyPath = ['userToRemove']
        $dataInstance = $this->DataHub->address($address);
        $this->assertNotNull($dataInstance->get());
        $dataInstance->remove(); // Removes session['userToRemove']
        $this->assertNull($dataInstance->get());
        $this->assertNull(LaravelSession::get('userToRemove'));

        // Test removing nested key
        $address = 'session:userToRemoveNested.prefs.theme'; // keyPath = ['userToRemoveNested', 'prefs', 'theme']
        $dataInstance = $this->DataHub->address($address);
        $this->assertEquals('light', $dataInstance->get());
        $dataInstance->remove(); // Removes session['userToRemoveNested.prefs.theme']
        $this->assertNull($dataInstance->get()); // Getting the removed nested key should be null

        // Check the real session for the remaining data
        $expectedRemaining = ['id' => 3, 'prefs' => ['lang' => 'fr']];
        $this->assertEquals($expectedRemaining, LaravelSession::get('userToRemoveNested'));
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->DataHub = new DataHub(); // Default disk is usually fine for session
        LaravelSession::flush(); // Clear session before each test

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

    protected function tearDown(): void
    {
        // Flush Laravel session AFTER each test
        if (LaravelSession::isStarted()) {
            LaravelSession::flush();
            Log::debug("[SessionStorageTest::tearDown] Session flushed.");
        }

        parent::tearDown();
    }
}
