<?php

namespace Tests\Feature\AiRudeDepot\StorageDataModules;

use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\StoragePathParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;

class MysqlStorageTest extends TestCase
{
    use RefreshDatabase;

    protected $DataHub;
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    /**
     * Test the parsing of various MySQL address formats using the new query string syntax.
     */
    public function test_parse_mysql_address(): void
    {
        $parser = new StoragePathParser();
        $addresses = [

            'mysql!users' => [
                'moduleName' => 'Mysql',
                'storagePath' => 'users',
                'keyPath' => [],
                'label' => 'users',
                'parameters' => [],
                'pathName' => 'mysql!users',
                'original_path' => 'mysql!users'
            ],

            'mysql!items/find/5' => [
                'moduleName' => 'Mysql',
                'storagePath' => 'items',
                'keyPath' => [],
                'label' => '5',
                'parameters' => ['operation' => 'find', 'id' => '5'],
                'pathName' => 'mysql!items/find/5',
                'original_path' => 'mysql!items/find/5'
            ],

            'mysql!orders/where/status/pending' => [
                'moduleName' => 'Mysql',
                'storagePath' => 'orders',
                'keyPath' => [],
                'label' => 'status=pending',
                'parameters' => ['operation' => 'where', 'where' => ['status' => 'pending']],
                'pathName' => 'mysql!orders/where/status/pending',
                'original_path' => 'mysql!orders/where/status/pending'
            ],
        ];

        foreach ($addresses as $address => $expected) {
            $result = $parser->parse($address);

            if (!isset($result['original_path'])) {
                $result['original_path'] = $address;
            }
            $this->assertEquals($expected, $result, "Failed parsing address: {$address}\nExpected: " . json_encode($expected) . "\nActual: " . json_encode($result));
        }
    }

    /**
     * Test if address returns a Data instance
     */
    public function test_address_returns_data_instance(): void
    {
        $dataInstance = $this->DataHub->address('mysql!test_users');
        $this->assertInstanceOf(\App\AiRudeDepot\Processors\InstructionProcessor::class, $dataInstance);
    }

    /**
     * Test SELECT operation with various parameters
     */
    public function test_select_operation(): void
    {

        DB::connection('sqlite')->table('test_users')->insert([
            ['name' => 'Select User 1', 'email' => 'select1@test.com'],
            ['name' => 'Select User 2', 'email' => 'select2@test.com'],
            ['name' => 'Select User 3', 'email' => 'select3@test.com'],
        ]);

        $address = 'mysql!test_users';
        $dataInstance = $this->DataHub->address($address);
        $result = $dataInstance->get();

        $this->assertIsArray($result);
        $this->assertCount(3, $result);
        $this->assertEquals('Select User 1', $result[0]['name']);
    }

    /**
     * Test COUNT operation
     */
    public function test_mysql_count_operation(): void
    {

        DB::connection('sqlite')->table('test_users')->insert([
            ['name' => 'Count User 1', 'email' => 'count1@test.com'],
            ['name' => 'Count User 2', 'email' => 'count2@test.com'],
            ['name' => 'Specific Count', 'email' => 'specific@count.com'],
        ]);


        $addressAllCount = "mysql!test_users/count";
        $countAll = $this->DataHub->address($addressAllCount)->get();
        $this->assertEquals(3, $countAll, 'Count all failed');


        $addressWhere = "mysql!test_users/count/where/name/Specific Count";
        $countWhere = $this->DataHub->address($addressWhere)->get();
        $this->assertEquals(1, $countWhere, 'Count with where failed');
    }

    /**
     * Test INSERT operation with different parameter formats
     */
    public function test_insert_operation(): void
    {
        $dataToInsert = ['name' => 'Insert Test', 'email' => 'insert@test.com'];
        $address = 'mysql!test_users';

        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set($dataToInsert)->save();

        $this->assertDatabaseHas('test_users', $dataToInsert);
    }

    /**
     * Test UPDATE operation with where condition
     */
    public function test_update_operation(): void
    {

        $id = DB::connection('sqlite')->table('test_users')->insertGetId(['name' => 'Before Update', 'email' => 'update_before@test.com']);

        $dataToUpdate = ['name' => 'After Update', 'email' => 'update_after@test.com'];

        $address = "mysql!test_users/find/{$id}";

        $dataInstance = $this->DataHub->address($address);
        $dataInstance->set($dataToUpdate)->save();

        $this->assertDatabaseHas('test_users', ['id' => $id, 'name' => 'After Update']);
        $this->assertDatabaseMissing('test_users', ['id' => $id, 'name' => 'Before Update']);
    }

    /**
     * Test DELETE operation with where condition
     */
    public function test_delete_operation(): void
    {

        $id1 = DB::connection('sqlite')->table('test_users')->insertGetId(['name' => 'To Delete 1', 'email' => 'delete1@test.com']);
        $id2 = DB::connection('sqlite')->table('test_users')->insertGetId(['name' => 'To Delete 2', 'email' => 'delete2@test.com']);


        $address = "mysql!test_users/find/{$id1}";

        $dataInstance = $this->DataHub->address($address);
        $dataInstance->remove();

        $this->assertDatabaseMissing('test_users', ['id' => $id1]);
        $this->assertDatabaseHas('test_users', ['id' => $id2]);
    }

    /**
     * Test find operation results - Success Case
     */
    public function test_find_operation_success(): void
    {
        // Seed a record
        $data = ['name' => 'Find Me', 'email' => 'findme@test.com'];
        $id = DB::connection('sqlite')->table('test_users')->insertGetId($data);
        // Construct expected data including potentially null timestamps if not returned by DB
        $expectedData = ['id' => $id, ...$data, 'created_at' => null, 'updated_at' => null];

        // Test find success
        $addressFind = "mysql!test_users/find/{$id}";
        $resultFound = $this->DataHub->address($addressFind)->get();

        // Assert that the result IS the single associative array
        $this->assertIsArray($resultFound, 'Find result should be an array.');
        $this->assertEquals($expectedData, $resultFound, 'Result data should match expected single object.');

        // Individual checks (optional but good practice)
        $this->assertEquals($id, $resultFound['id'], 'Found element ID should match.');
        $this->assertEquals('Find Me', $resultFound['name'], 'Found element name should match.');
    }

    /**
     * Test find operation results - Not Found Case
     */
    public function test_find_operation_not_found(): void
    {

        $id = DB::connection('sqlite')->table('test_users')->insertGetId(['name' => 'Find Me Other', 'email' => 'findme_other@test.com']);
        $nonExistentId = $id + 100;


        $addressNotFound = "mysql!test_users/find/{$nonExistentId}";
        $resultNotFound = $this->DataHub->address($addressNotFound)->get();
        $this->assertNull($resultNotFound, 'Find result should be null when not found.');
    }

    /**
     * Test where operation results (new test for TDD)
     */
    public function testWhereOperationResults(): void
    {

        DB::connection('sqlite')->table('test_users')->insert([
            ['name' => 'Where Group 1', 'email' => 'where1a@test.com'],
            ['name' => 'Where Group 1', 'email' => 'where1b@test.com'],
            ['name' => 'Where Group 2', 'email' => 'where2@test.com'],
        ]);


        $addressMultiple = "mysql!test_users/where/name/Where Group 1";
        $resultMultiple = $this->DataHub->address($addressMultiple)->get();
        $this->assertIsArray($resultMultiple, 'Where (multiple) result should be an array.');
        $this->assertCount(2, $resultMultiple, 'Where (multiple) result should contain 2 elements.');
        $this->assertEquals('Where Group 1', $resultMultiple[0]['name']);
        $this->assertEquals('Where Group 1', $resultMultiple[1]['name']);


        $addressSingle = "mysql!test_users/where/name/Where Group 2";
        $resultSingle = $this->DataHub->address($addressSingle)->get();
        $this->assertIsArray($resultSingle, 'Where (single) result should be an array.');
        $this->assertCount(1, $resultSingle, 'Where (single) result should contain 1 element.');
        $this->assertEquals('Where Group 2', $resultSingle[0]['name']);


        $addressNone = "mysql!test_users/where/name/Where Group NonExistent";
        $resultNone = $this->DataHub->address($addressNone)->get();
        $this->assertIsArray($resultNone, 'Where (none) result should be an array.');
        $this->assertEmpty($resultNone, 'Where (none) result should be an empty array.');
    }

    /**
     * Set up the test environment
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->DataHub = new DataHub(); // Default disk is usually fine for DB

        // Ensure the test table exists
        if (!Schema::hasTable('test_users')) {
            Schema::create('test_users', function ($table) {
                $table->id();
                $table->string('login')->unique();
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }
        DB::table('test_users')->truncate(); // Clear table before test

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

    /**
     * Clean up after tests
     */
    protected function tearDown(): void
    {
        parent::tearDown();
    }
}
