<?php

namespace App\Console\Commands;

use App\AiRudeDepot\Processors\DataProcessor;
use Exception;
use Illuminate\Console\Command;

// use Illuminate\Support\Facades\Log;

class TestAiConfig extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:ai-config';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test AI configuration values';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('AI Configuration Values:');
        $this->line('ai.env_path: ' . config('ai.env_path'));
        $this->line('ai.env_core_path: ' . config('ai.env_core_path'));
        $this->line('ai.test_env_path: ' . config('ai.test_env_path'));
        $this->line('ai.test_core_env_path: ' . config('ai.test_core_env_path'));

        $this->newLine();
        $this->info('Environment Variables:');
        $this->line('AI_ENV_PATH: ' . env('AI_ENV_PATH'));
        $this->line('AI_ENV_CORE_PATH: ' . env('AI_ENV_CORE_PATH'));
        $this->line('AI_TEST_ENV_PATH: ' . env('AI_TEST_ENV_PATH'));
        $this->line('AI_TEST_CORE_ENV_PATH: ' . env('AI_TEST_CORE_ENV_PATH'));

        $this->newLine();
        $this->info('Debug Information:');
        $this->line('App Environment: ' . app()->environment());
        $this->line('Running Unit Tests: ' . (app()->runningUnitTests() ? 'Yes' : 'No'));

        // Test creating a Modificator instance
        try {
            $this->newLine();
            $this->info('Testing Modificator Class:');

            // Enable debug logging temporarily
            //      Log::info('=== Test Modificator initialization ===');

            // Test with default environment
            $defaultMod = new DataProcessor();
            $this->line('Default Modificator created successfully');

            // Test with specified environment
            $aiCoreMod = new DataProcessor(null, config('ai.env_core_path'));
            $this->line('aiCore Modificator created successfully');

            // Test with test environment
            $testMod = new DataProcessor(null, config('ai.test_core_env_path'));
            $this->line('aiCoreTest Modificator created successfully');

            // Test a simple operation using the pageModule if possible
            try {
                // Create files if needed for test
                $modDir = storage_path(config('ai.env_core_path') . '/modificators');
                if (!file_exists($modDir)) {
                    $this->line('Creating test directories: ' . $modDir);
                    mkdir($modDir, 0755, true);
                }

                $pageModFile = $modDir . '/pageModule.json';
                if (!file_exists($pageModFile)) {
                    $this->line('Creating test pageModule.json file');
                    $pageModContent = json_encode([
                        'type' => 'Instructions',
                        'instructions' => [
                            [
                                'action' => 'set',
                                'value' => 'test-result'
                            ]
                        ]
                    ], JSON_PRETTY_PRINT);
                    file_put_contents($pageModFile, $pageModContent);
                }

                // Check if the file exists now
                $this->line('pageModule.json exists: ' . (file_exists($pageModFile) ? 'Yes' : 'No'));
                if (file_exists($pageModFile)) {
                    $this->line('Content: ' . file_get_contents($pageModFile));
                }

                // Try to use the pageModule
                $result = $aiCoreMod->pageModule('test')->result();
                $this->line('PageModule result: ' . (is_string($result) ? $result : json_encode($result)));
            } catch (Exception $e) {
                $this->warn('PageModule test error: ' . $e->getMessage());
            }

            $this->info('All Modificator tests completed!');
        } catch (Exception $e) {
            $this->error('Error testing Modificator: ' . $e->getMessage());
            $this->line($e->getTraceAsString());
        }

        return Command::SUCCESS;
    }
}
