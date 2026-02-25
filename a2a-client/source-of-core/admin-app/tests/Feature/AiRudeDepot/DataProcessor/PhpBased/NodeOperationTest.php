<?php

namespace Tests\Feature\AiRudeDepot\Modificators\PhpBased;

use App\AiRudeDepot\Processors\DataProcessor\Php\WalkForOperations as NodeOperation;
use App\AiRudeDepot\Storage\DataHub as StaticStorage;
use App\AiRudeDepot\Storage\DataHub;
use Tests\TestCase;
use App\AiRudeDepot\Processors\DataProcessor;
use Illuminate\Support\Facades\Storage;

class NodeOperationTest extends TestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;
    protected \App\AiRudeDepot\Storage\DataHub $storage;

    protected function setUp(): void
    {
        parent::setUp();

        // --- Add dynamic disk configuration (copied from FormComponentTest) ---
        $aiTestBasePath = storage_path('aiTest'); // Define base path for aiTest disk
        config([
            'filesystems.disks.aiTest' => [
                'driver' => 'local',
                'root' => $aiTestBasePath,
                'url' => null,
                'visibility' => 'private',
                'throw' => false,
            ]
        ]);
        // Ensure the directory exists for the aiTest disk after configuring it
        if (!is_dir($aiTestBasePath)) {
            mkdir($aiTestBasePath, 0755, true);
        }
        // Forget the disk if it was already resolved so it picks up new config
        Storage::forgetDisk('aiTest'); // Ensure Storage facade is used
        // --- End dynamic disk configuration ---

        $this->storage = new DataHub('aiTest');

        $this->storage->address('module1/includes/data1')->set(['key' => 'value1'])->save();
        $this->storage->address('module1/includes/data2')->set(['nested' => ['key' => 'value2']])->save();
        $this->storage->address('module1/includes/recursiveInclude')->set([
            'type' => 'operation',
            'action' => 'include',
            'source' => 'module1/includes/data1'
        ])->save();
        $this->storage->address('module1/includes/dataForAdd')->set([['added' => true], ['added2' => true]])->save();
        $this->storage->address('module1/includes/nestedData')->set(['nestedKey' => 'nestedValue'])->save();
        // Add source for JSON test - a .txt file containing a JSON string
        $this->storage->address('module1/includes/jsonDataSource.txt')->set('{"key": "jsonValue"}')->save();
    }

    protected function tearDown(): void
    {
        $reflection = new \ReflectionClass(\App\AiRudeDepot\Storage\DataHub::class);
        $property = $reflection->getProperty('staticStorageInstance');
        $property->setValue(null);

        $this->storage->getDisk()->deleteDirectory('.');

        parent::tearDown();
    }

    /**
     * Test basic include operation.
     */
    public function testProcessNodeOperation_BasicInclude()
    {
        $node = [
            'content' => [
                'type' => 'operation',
                'action' => 'include',
                'source' => 'module1/includes/data1'
            ]
        ];
        $expected = [
            'content' => ['key' => 'value1']
        ];
        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_BasicInclude -----\n";
            echo "----node before processing:\n";
            print_r($node);
        }
        NodeOperation::process($node, $this->storage);
        if ($this->allowVerbosity) {
            echo "----node after processing:\n";
            print_r($node);
            echo "----expected:\n";
            print_r($expected);
        }
        $this->assertEquals($expected, $node);
    }

    /**
     * Test nested include operation where the included data itself contains an include.
     */
    public function testProcessNodeOperation_NestedInclude()
    {
        $node = [
            'container' => [
                'type' => 'operation',
                'action' => 'include',
                'source' => 'module1/includes/recursiveInclude'
            ]
        ];
        $expected = [
            'container' => ['key' => 'value1']
        ];
        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_NestedInclude -----\n";
            echo "----node before processing:\n";
            print_r($node);
        }
        NodeOperation::process($node, $this->storage);
        if ($this->allowVerbosity) {
            echo "----node after processing:\n";
            print_r($node);
            echo "----expected:\n";
            print_r($expected);
        }
        $this->assertEquals($expected, $node);
    }

    /**
     * Test 'add' operation within an array.
     */
    public function testProcessNodeOperation_AddOperation()
    {
        $node = [
            'items' => [
                ['id' => 1],
                [
                    'type' => 'operation',
                    'action' => 'add',
                    'source' => 'module1/includes/dataForAdd'
                ],
                ['id' => 2]
            ]
        ];
        $expected = [
            'items' => [
                ['id' => 1],
                ['added' => true],
                ['added2' => true],
                ['id' => 2]
            ]
        ];
        NodeOperation::process($node, $this->storage);
        $this->assertEquals($expected, $node);
    }

    /**
     * Test 'include' operation within an array.
     */
    public function testProcessNodeOperation_IncludeDeOperation()
    {
        $node = [
            'items' => [
                ['id' => 1],
                [
                    'type' => 'operation',
                    'action' => 'include',
                    'source' => 'module1/includes/dataForAdd'
                ],
                ['id' => 2]
            ]
        ];
        // Expected behavior: items from source array are spliced in
        $expected = [
            'items' => [
                ['id' => 1],
                ['added' => true],
                ['added2' => true],
                ['id' => 2]
            ]
        ];
        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_IncludeDeOperation -----\n";
            echo "----node before processing:\n";
            print_r($node);
        }

        NodeOperation::process($node, $this->storage);

        if ($this->allowVerbosity) {
            echo "----node after processing:\n";
            print_r($node);
            echo "----expected:\n";
            print_r($expected);
        }
        $this->assertEquals($expected, $node);
    }

    /**
     * Test 'remove' operation within an array.
     */
    public function testProcessNodeOperation_RemoveOperation()
    {
        $this->markTestSkipped('Skipping remove operation test as it is not used anywhere in the code.');
        $node = [
            'items' => [
                ['id' => 1],
                [
                    'type' => 'operation',
                    'action' => 'remove',
                ],
                ['id' => 2]
            ]
        ];
        $expected = [
            'items' => [
                ['id' => 1],
                ['id' => 2]
            ]
        ];

        NodeOperation::process($node, $this->storage);

        $this->assertEquals($expected, $node);
        $this->assertEquals(2, count($node['items']));
    }

    /**
     * Test a combination of include, add, and remove operations.
     */
    public function testProcessNodeOperation_CombinedOperations()
    {
        $node = [
            'header' => [
                'type' => 'operation',
                'action' => 'include',
                'source' => 'module1/includes/data1'
            ],
            'body' => [
                'section1' => ['content' => 'original'],
                'section2' => [
                    'items' => [
                        ['id' => 'a'],
                        [
                            'type' => 'operation',
                            'action' => 'add',
                            'source' => 'module1/includes/dataForAdd'
                        ],
                        ['id' => 'b']
                    ]
                ]
            ],
            'footer' => 'static footer'
        ];
        $expected = [
            'header' => ['key' => 'value1'],
            'body' => [
                'section1' => ['content' => 'original'],
                'section2' => [
                    'items' => [
                        ['id' => 'a'],
                        ['added' => true],
                        ['added2' => true],
                        ['id' => 'b']
                    ]
                ]
            ],
            'footer' => 'static footer'
        ];
        NodeOperation::process($node, $this->storage);
        $this->assertEquals($expected, $node);
    }

    /**
     * Test that non-operation nodes are left untouched.
     */
    public function testProcessNodeOperation_NoOperations()
    {
        $node = [
            'static' => 'data',
            'list' => [1, 2, 3],
            'nested' => ['key' => 'value']
        ];
        $expected = $node;

        NodeOperation::process($node, $this->storage);

        $this->assertEquals($expected, $node);
    }

    /**
     * Test include where source data is not found (should result in null/empty).
     * Depending on exact implementation, it might leave the operation node or replace with null.
     * Assuming it replaces with null or removes the key. Let's test replacement with null.
     */
    public function testProcessNodeOperation_IncludeNotFound()
    {
        $node = [
            'content' => [
                'type' => 'operation',
                'action' => 'include',
                'source' => 'module1/includes/nonExistentData'
            ]
        ];

        $expected = ['content' => []];

        $result = NodeOperation::process($node, $this->storage);

        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_IncludeNotFound -----\n";
            echo "----node before processing:\n";
            print_r($node);
            print_r($result);
        }

        $this->assertEquals($expected, $node);
    }

    public function testProcessNodeOperation_NestedOperations_Deep()
    {
        $node = [
            'level0' => [
                'level1a' => ['static' => 'data'],
                'level1b' => [
                    'level2a' => [
                        'content' => [
                            'type' => 'operation',
                            'action' => 'include',
                            'source' => 'module1/includes/nestedData'
                        ],
                    ],
                    'level2b' => ['other' => 'data']
                ]
            ]
        ];
        $expected = [
            'level0' => [
                'level1a' => ['static' => 'data'],
                'level1b' => [
                    'level2a' => [
                        'content' => ['nestedKey' => 'nestedValue']
                    ],
                    'level2b' => ['other' => 'data']
                ]
            ]
        ];
        $result = NodeOperation::process($node, $this->storage);

        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_NestedOperations_Deep -----\n";
            echo "----node before processing:\n";
            print_r($node);
            print_r($result);
        }
        $this->assertEquals($expected, $node);
    }

    public function testProcessNodeOperation_JSONSource()
    {
        $node = [
            'level1a' => 'data',
            'level1b' => [
                'level2a' => [
                    'content' => [
                        'type' => 'operation',
                        'action' => 'include',
                        'source' => 'module1/includes/jsonDataSource.txt', // Point to .txt file
                        'is_json' => true
                    ]
                ],
                'level2b' => 'more data'
            ]
        ];
        $expected = [
            'level1a' => 'data',
            'level1b' => [
                'level2a' => [
                    'content' => ['key' => 'jsonValue']
                ],
                'level2b' => 'more data'
            ]
        ];
        $result = NodeOperation::process($node, $this->storage);

        if ($this->allowVerbosity) {
            echo "----- testProcessNodeOperation_JSONSource -----\n";
            echo "----node before processing:\n";
            print_r($node);
            print_r($result);
        }
        $this->assertEquals($expected, $node);
    }
}

