<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    protected $mockFiles = [
        'documents/doc1.md' => [
            'title' => 'Laravel Framework',
            'content' => 'Laravel is a web application framework with expressive, elegant syntax.',
            'metadata' => ['category' => 'framework']
        ],
        'documents/doc2.md' => [
            'title' => 'Vue.js Framework',
            'content' => 'Vue.js is a progressive JavaScript framework.',
            'metadata' => ['category' => 'framework']
        ],
        'documents/doc3.md' => [
            'title' => 'PHP Programming',
            'content' => 'PHP is a popular general-purpose scripting language.',
            'metadata' => ['category' => 'language']
        ]
    ];

    protected function setUp(): void
    {
        parent::setUp();
        
        Log::info('Starting test setup');
        
        // Clear cache before each test
        Cache::flush();
        Log::info('Cache cleared');
        
        // Mock storage
        Storage::fake('documents');
        Log::info('Storage mocked');
        
        // Create mock files
        foreach ($this->mockFiles as $path => $content) {
            try {
                Storage::disk('documents')->put($path, json_encode($content));
                Log::info("Created mock file: {$path}");
            } catch (\Exception $e) {
                Log::error("Failed to create mock file {$path}: " . $e->getMessage());
                throw $e;
            }
        }
        
        // Create test data with transaction
        try {
            Log::info('Starting database transaction');
            
            // First check if table exists
            if (!Schema::hasTable('search_index')) {
                Log::error('search_index table does not exist');
                throw new \Exception('search_index table does not exist');
            }
            
            // Clear the table first
            DB::table('search_index')->truncate();
            Log::info('Table truncated');
            
            DB::table('search_index')->insert([
                [
                    'document_id' => 1,
                    'title' => $this->mockFiles['documents/doc1.md']['title'],
                    'content' => $this->mockFiles['documents/doc1.md']['content'],
                    'metadata' => json_encode($this->mockFiles['documents/doc1.md']['metadata']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'document_id' => 2,
                    'title' => $this->mockFiles['documents/doc2.md']['title'],
                    'content' => $this->mockFiles['documents/doc2.md']['content'],
                    'metadata' => json_encode($this->mockFiles['documents/doc2.md']['metadata']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'document_id' => 3,
                    'title' => $this->mockFiles['documents/doc3.md']['title'],
                    'content' => $this->mockFiles['documents/doc3.md']['content'],
                    'metadata' => json_encode($this->mockFiles['documents/doc3.md']['metadata']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ]);
            
            Log::info('Database transaction committed');
        } catch (\Exception $e) {
            Log::error('Failed to setup test data: ' . $e->getMessage());
            throw $e;
        }
        
        Log::info('Test setup completed');
    }

    protected function tearDown(): void
    {
        Log::info('Starting test teardown');
        
        // Clean up with transaction
        try {
            DB::table('search_index')->truncate();
            Log::info('Database cleanup completed');
        } catch (\Exception $e) {
            Log::error('Failed to cleanup test data: ' . $e->getMessage());
        }
        
        // Clear cache after each test
        Cache::flush();
        Log::info('Cache cleared');
        
        // Clean up mock files
        try {
            Storage::disk('documents')->deleteDirectory('');
            Log::info('Mock files cleaned up');
        } catch (\Exception $e) {
            Log::error('Failed to cleanup mock files: ' . $e->getMessage());
        }
        
        parent::tearDown();
        Log::info('Test teardown completed');
    }

    private function compressLogOutput($text, $maxLength = 2000)
    {
        // Replace repeated long substrings with placeholders
        $patterns = [
            '/(Laravel is a web application framework with expressive, elegant syntax\\.){2,}/' => '[REPEATED_LARAVEL]',
            '/(Vue\\.js is a progressive JavaScript framework\\.){2,}/' => '[REPEATED_VUE]',
            // Add more patterns as needed
        ];
        foreach ($patterns as $pattern => $placeholder) {
            $text = preg_replace($pattern, $placeholder, $text);
        }

        // Limit output length
        if (strlen($text) > $maxLength) {
            return substr($text, 0, $maxLength) . "\n[OUTPUT TRUNCATED]";
        }
        return $text;
    }

    private function debugResponse($response, $testName)
    {
        Log::info("Starting test: {$testName}");
        
        $content = $response->json();
        $output = print_r($content, true);
        $output = $this->compressLogOutput($output);

        echo "\n=== Test: {$testName} ===";
        echo "\nStatus: " . $response->status();
        echo "\n" . $output;
        
        Log::info("Test completed: {$testName}", [
            'status' => $response->status(),
            'content_length' => strlen($output)
        ]);
    }

    public function test_can_search_documents()
    {
        Log::info('Starting test_can_search_documents');
        
        $this->withoutMiddleware();
        
        // Verify storage is ready
        $this->assertTrue(Storage::disk('documents')->exists('documents/doc1.md'), 'Mock file doc1.md not found');
        $this->assertTrue(Storage::disk('documents')->exists('documents/doc2.md'), 'Mock file doc2.md not found');
        $this->assertTrue(Storage::disk('documents')->exists('documents/doc3.md'), 'Mock file doc3.md not found');
        
        $response = $this->getJson('/api/v1/search?query=laravel', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Basic Search');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'pagination' => [
                    'total',
                    'per_page',
                    'current_page',
                    'last_page',
                    'from',
                    'to'
                ]
            ]);

        Log::info('test_can_search_documents completed');
    }

    public function test_can_use_fuzzy_search()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search?query=larvel&use_fuzzy=true', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Fuzzy Search');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'pagination'
            ]);
    }

    public function test_can_filter_by_metadata()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search?query=web&filters[category]=framework', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Metadata Filter');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'pagination'
            ]);
    }

    public function test_can_sort_results()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search?query=web&sort_by=title&sort_direction=asc', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Sort Results');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'pagination'
            ]);
    }

    public function test_can_handle_pagination()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search?query=web&page=1&per_page=2', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Pagination');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'pagination' => [
                    'total',
                    'per_page',
                    'current_page',
                    'last_page',
                    'from',
                    'to'
                ]
            ]);
    }

    public function test_returns_error_for_empty_query()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Empty Query Error');
        
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Search query is required'
            ]);
    }

    public function test_returns_error_for_invalid_sort_field()
    {
        $this->withoutMiddleware();
        
        $response = $this->getJson('/api/v1/search?query=web&sort_by=invalid_field', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ])->timeout(5);
        
        $this->debugResponse($response, 'Invalid Sort Field Error');
        
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Invalid sort field. Allowed fields: relevance, created_at, updated_at, title'
            ]);
    }
} 