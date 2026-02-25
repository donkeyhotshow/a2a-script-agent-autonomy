<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;
use Illuminate\Support\Facades\Artisan;
use App\Hooks\FileFacade as File;
use Inertia\Response as InertiaResponse;
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Monolog\Formatter\JsonFormatter;

abstract class TestCase extends BaseTestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    // public function createApplication()
    // {
    //     $app = require __DIR__ . '/../bootstrap/app.php';
    //     $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    //     return $app;
    // }
    public function createApplication()
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        // // Clear the log file before running tests
        // $logPath = storage_path('logs/laravel.log');
        // if (File::exists($logPath)) {
        //     File::put($logPath, '');
        //     // Optionally log that it was cleared (might clutter test logs)
        //     // echo "Cleared log file: {$logPath}\n";
        // }

        return $app;
    }

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        // dd(config('view.compiled')); // <<< DEBUG: Removed
        parent::setUp();

        // *** NEW DYNAMIC LOGGING CONFIGURATION ***
        // Generate a unique log path based on the test class and method name
        $className = str_replace('\\', '_', get_class($this)); // Sanitize class name for path
        $methodName = $this->name(false); // <<< CORRECTED: Use name() instead of getName()
        $logDir = storage_path('logs/tests/' . $className);
        $logFile = $logDir . '/' . $methodName . '.log';

        // Ensure the specific log directory exists
        if (!File::isDirectory($logDir)) {
            File::makeDirectory($logDir, 0777, true, true);
        }
        // Clear the specific log file for this test
        File::put($logFile, '');

        // Configure the 'testing' channel dynamically FOR JSON OUTPUT
        Config::set('logging.channels.testing', [
            'driver' => 'single',
            'path' => $logFile,
            'level' => env('LOG_LEVEL', 'debug'),
            'formatter' => JsonFormatter::class,
            'formatter_with' => [
                'includeStacktraces' => true,
            ]
        ]);
        // Set the default log channel for the testing environment
        Config::set('logging.default', 'testing');

        // Announce the log file being used (optional, but helpful)
        $logMessage = "[TEST SETUP] Logging for {$className}::{$methodName} to: {$logFile} (JSON Format)";
        echo $logMessage . "\n"; // Output to console
        Log::channel('testing')->info($logMessage); // Write to the specific test log
        // *** END DYNAMIC LOGGING CONFIGURATION ***

        // Ensure a known temporary view cache path exists and configure it
        $testViewPath = storage_path('framework/views_test');
        if (!File::isDirectory($testViewPath)) {
            File::makeDirectory($testViewPath, 0777, true, true);
        }
        config(['view.compiled' => $testViewPath]);

        // Explicitly bootstrap providers AFTER parent setup - REMOVED as it didn't fix cache path issue
        // $this->app->bootstrapWith([
        //     \Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables::class,
        //     \Illuminate\Foundation\Bootstrap\LoadConfiguration::class,
        //     \Illuminate\Foundation\Bootstrap\HandleExceptions::class,
        //     \Illuminate\Foundation\Bootstrap\RegisterFacades::class,
        //     \Illuminate\Foundation\Bootstrap\RegisterProviders::class,
        //     \Illuminate\Foundation\Bootstrap\BootProviders::class,
        // ]);

        // Force the test database connection configuration
        config(['database.default' => 'sqlite']);
        config(['database.connections.sqlite.database' => ':memory:']);

        // --- CONFIGURE aiTest DISK GLOBALLY FOR TEST LIFECYCLE ---
        $testDiskName = 'aiTest';
        config(["filesystems.disks.{$testDiskName}" => [
            'driver' => 'local',
            'root' => storage_path("app/public/{$testDiskName}"), // Consistent with binding
            'url' => env('APP_URL') . "/storage/{$testDiskName}",
            'visibility' => 'public',
            'throw' => false,
        ]]);
        // Ensure the test disk directory exists AFTER configuring it globally
        try {
            Storage::disk($testDiskName)->makeDirectory('.');
            Log::debug("[TestCase::setUp] Ensured directory exists for globally configured disk '{$testDiskName}'.");
        } catch (\Exception $e) {
            Log::error("[TestCase::setUp] Failed to ensure directory for disk '{$testDiskName}': " . $e->getMessage());
            // Decide if we should throw or just log
        }
        // --- END GLOBAL DISK CONFIG ---

        // Bind DataHub to resolve the $diskName dependency during tests
        $this->app->singleton(DataHub::class, function ($app) use ($testDiskName) { // Pass $testDiskName into closure
            // Configuration is now done globally above
            // Log::debug("[TestCase::setUp] Binding DataHub, ensuring disk '{$testDiskName}' config exists and directory created."); // OLD Log
            Log::debug("[TestCase::setUp] Binding DataHub (singleton) to use pre-configured disk: '{$testDiskName}'.");
            return new DataHub($testDiskName);
        });

        $directoriesToConvert = [
            'app',
            'resources',
            'storage/ai',
            'storage/aiCore',
            'storage/aiInstaller',
            'storage/aiStored',
            'tests',
        ];
        //  echo "Processing directories: " . implode(', ', $directoriesToConvert) . "\n";

        // $this->convertFilesToUtf8WithoutBom($directoriesToConvert);
        // $this->registerTestMocks(); // COMMENT OUT - Use real modules for these tests
        // $this->loadTestsFromJson(); // <<< COMMENTED OUT - Suspected cause of class re-declaration error

        // If using in-memory SQLite, run migrations
        // REMOVE the explicit migrate:fresh call - RefreshDatabase trait handles this
        // if (config('database.default') === 'sqlite' && config('database.connections.sqlite.database') === ':memory:') {
        // Ensure the testing connection is used for migrations
        // Artisan::call('migrate:fresh', ['--database' => 'sqlite']);
        // Artisan::call('db:seed'); // Optionally seed if needed
        // }
    }

    /**
     * Регистрируем моки классов для тестов
     */
    // protected function registerTestMocks()
    // {
    //     // Загружаем моки только если они существуют
    //     if (!class_exists('Tests\\Mocks\\BufferMock')) {
    //         // Если тесты запускаются не из StorageTests, моки могут не понадобиться
    //         return;
    //     }

    //     // Биндим конкретные реализации
    //     $this->app->bind('App\\AiRudeDepot\\StorageDataModules\\Buffer', function () {
    //         return new Mocks\BufferMock();
    //     });

    //     $this->app->bind('App\\AiRudeDepot\\StorageDataModules\\Directory', function () {
    //         return new Mocks\DirectoryMock();
    //     });

    //     $this->app->bind('App\\AiRudeDepot\\StorageDataModules\\Model', function () {
    //         return new Mocks\ModelMock();
    //     });

    //     $this->app->bind('App\\AiRudeDepot\\StorageDataModules\\Mysql', function () {
    //         return new Mocks\MysqlMock();
    //     });

    //     $this->app->bind('App\\AiRudeDepot\\StorageDataModules\\Session', function () {
    //         return new Mocks\SessionMock();
    //     });
    // }

    /**
     * Load tests from JSON files in specified directories.
     */
    // protected function loadTestsFromJson()
    // {
    //     $baseDir = __DIR__ . '/../../storage/aiSandbox/page/'; // Base directory to search for tests.json
    //     $directories = ['page', 'other_directory']; // Add other directories as needed

    //     foreach ($directories as $directory) {
    //         $path = $baseDir . $directory;
    //         if (is_dir($path)) {
    //             $this->includeTestJsonFiles($path);
    //         }
    //     }
    // }

    /**
     * Include test files listed in the tests.json file.
     *
     * @param string $directory
     */
    // protected function includeTestJsonFiles($directory)
    // {
    //     $jsonFiles = glob($directory . '/*.json'); // Find all JSON files in the directory

    //     foreach ($jsonFiles as $jsonFile) {
    //         $jsonContent = json_decode(file_get_contents($jsonFile), true);
    //         if (isset($jsonContent['tests'])) {
    //             foreach ($jsonContent['tests'] as $test) {
    //                 $testPath = $directory . '/' . $test['path'];
    //                 if (file_exists($testPath)) {
    //                     require_once $testPath; // Include the test file
    //                 } else {
    //                     print "Test file not found: $testPath\n"; // Output an error message
    //                 }
    //             }
    //         }
    //     }
    // }

    /**
     * Print a colored message to the console.
     *
     * @param string $message The message to print.
     * @param string $color The color code (e.g., '32' for green, '31' for red).
     */
    protected function printColoredMessage(string $message, string $color): void
    {
        print "\033[" . $color . "m" . $message . "\033[0m\n";
    }

    /**
     * Print a colored message with data for debugging, respecting debug and verbosity flags.
     *
     * @param bool $allowVerbosity Whether to allow verbose output for this specific call
     * @param string $name The name of the data being printed
     * @param mixed $actual The actual data to print
     * @param mixed $expected The expected data to compare against (optional)
     * @param int $nestLevel The level of nesting to display (0 = full depth)
     * @param bool $minify Whether to minify the output for large data structures
     */
    protected function printColoredData(bool $allowVerbosity, string $name, mixed $actual, mixed $expected = null, int $nestLevel = 0, bool $minify = true): void
    {
        // Skip if debug is disabled globally
        if (!$this->allowDebug) {
            return;
        }

        // Respect the verbosity flag - if global verbosity is off, or this specific call has it disabled
        $isVerbose = $this->allowVerbosity && $allowVerbosity;

        $this->printColoredMessage("➤ " . $name, '36'); // Print the name in cyan

        if ($expected !== null) {
            $this->printColoredMessage("Expected:", '32'); // Print "Expected:" in green
            $this->printData($expected, $nestLevel, $minify, $isVerbose); // Print expected data

            $this->printColoredMessage("Actual:", '33'); // Print "Actual:" in yellow
            $this->printData($actual, $nestLevel, $minify, $isVerbose); // Print actual data

            // Show difference when both values are arrays
            if (is_array($actual) && is_array($expected)) {
                $this->printDifference($actual, $expected);
            }
        } else {
            // Just print the actual data if no expected value provided
            $this->printData($actual, $nestLevel, $minify, $isVerbose);
        }
    }

    /**
     * Print the difference between actual and expected arrays.
     *
     * @param array $actual The actual data array
     * @param array $expected The expected data array
     */
    protected function printDifference(array $actual, array $expected): void
    {
        $this->printColoredMessage("Difference:", '35'); // Print "Difference:" in magenta

        // Find missing keys in actual
        $missingKeys = array_diff_key($expected, $actual);
        if (!empty($missingKeys)) {
            $this->printColoredMessage("Missing keys in actual:", '31'); // Red
            $this->printData($missingKeys, 0, false);
        }

        // Find extra keys in actual
        $extraKeys = array_diff_key($actual, $expected);
        if (!empty($extraKeys)) {
            $this->printColoredMessage("Extra keys in actual:", '33'); // Yellow
            $this->printData($extraKeys, 0, false);
        }

        // Find differences in values for common keys
        $diffValues = [];
        foreach (array_intersect_key($expected, $actual) as $key => $value) {
            if ($actual[$key] !== $expected[$key]) {
                $diffValues[$key] = [
                    'expected' => $expected[$key],
                    'actual' => $actual[$key]
                ];
            }
        }

        if (!empty($diffValues)) {
            $this->printColoredMessage("Different values:", '31'); // Red
            $this->printData($diffValues, 0, false);
        }
    }

    /**
     * Print data with control over nesting and formatting.
     *
     * @param mixed $data The data to print
     * @param int $nestLevel The level of nesting to display (0 = full depth)
     * @param bool $minify Whether to minify the output for large data
     * @param bool $verbose Whether to show verbose output
     */
    protected function printData(mixed $data, int $nestLevel = 0, bool $minify = true, bool $verbose = true): void
    {
        if (!$verbose) {
            print "Output suppressed (verbosity disabled)\n";
            return;
        }

        if (is_array($data) || is_object($data)) {
            if ($nestLevel > 0) {
                // Limit the depth of the output based on nest level
                $jsonFlags = JSON_PRETTY_PRINT;
                if (is_object($data)) {
                    $jsonFlags |= JSON_FORCE_OBJECT;
                }
                $data = json_encode($data, $jsonFlags);
                if ($minify && strlen($data) > 1000) {
                    $data = $this->minifyData($data);
                }
            } else {
                // Print the entire data structure
                $jsonFlags = JSON_PRETTY_PRINT;
                if (is_object($data)) {
                    $jsonFlags |= JSON_FORCE_OBJECT;
                }
                $data = json_encode($data, $jsonFlags);
            }
        } else {
            $data = (string)$data; // Convert to string if not an array or object
        }

        print $data . "\n"; // Print the data
    }

    /**
     * Minify the data by truncating the middle of large arrays or objects.
     *
     * @param string $data The JSON encoded data.
     * @return string The minified data.
     */
    protected function minifyData(string $data): string
    {
        $decodedData = json_decode($data, true);
        if (is_array($decodedData)) {
            $count = count($decodedData);
            if ($count > 5) { // Example threshold for minification
                $start = array_slice($decodedData, 0, 2); // Keep first 2 items
                $end = array_slice($decodedData, -2); // Keep last 2 items
                $minified = array_merge($start, ['...'], $end); // Add ellipsis in the middle
                return json_encode($minified, JSON_PRETTY_PRINT);
            }
        }
        return $data; // Return original data if not minified
    }

    /**
     * Helper to get component and props from InertiaResponse object using reflection.
     * MOVED from ModuleControllerTest to be accessible globally.
     */
    protected function getInertiaData(InertiaResponse $response): array
    {
        $reflection = new \ReflectionClass($response);

        $componentProperty = $reflection->getProperty('component');
        $componentProperty->setAccessible(true);
        $component = $componentProperty->getValue($response);

        $propsProperty = $reflection->getProperty('props');
        $propsProperty->setAccessible(true);
        $props = $propsProperty->getValue($response);

        return [
            'component' => $component,
            'props' => $props
        ];
    }
}
