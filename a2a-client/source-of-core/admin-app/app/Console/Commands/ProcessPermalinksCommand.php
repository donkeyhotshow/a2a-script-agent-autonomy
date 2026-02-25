<?php

namespace App\Console\Commands;

use App\Hooks\FileFacade as File;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Finder\Finder;
use Throwable;

class ProcessPermalinksCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'process:permalinks
                            {path : Path to permalinks config directory or file}
                            {--module=* : Filter by specific modules (if path is directory)}
                            {--validate : Validate links without making changes}
                            {--method=generate : Processing method (internal use, e.g., generate|validate)}
                            {--data=null : JSON data for processing (internal use)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process permanent links configuration from JSON file';

    public function handle()
    {
        $inputPath = $this->argument('path'); // Can be dir or file
        $modulesToProcess = $this->option('module'); // Array of specific modules or empty
        $isValidation = $this->option('validate');

        $baseStoragePath = storage_path('ai/permalinks'); // Base path for permalinks

        // Determine if input path is a directory or a specific file pattern
        $isInputDirectory = is_dir($inputPath);

        if ($isInputDirectory) {
            $filesToProcess = $this->findPermalinkConfigFiles($inputPath, $modulesToProcess);
        } elseif (file_exists($inputPath) && Str::endsWith($inputPath, '.json')) {
            // Handle case where a single config file is provided
            $filesToProcess = [$inputPath];
            $this->warn("Processing a single file. --module option will be ignored if set.");
            $modulesToProcess = []; // Clear modules if processing single file
        } else {
            $this->error("Invalid path provided: {$inputPath}. Must be a directory containing permalink configs or a specific .json config file.");
            return 1;
        }

        if (empty($filesToProcess)) {
            $this->info("No permalink configuration files found to process for the specified criteria.");
            return 0;
        }

        $overallSuccess = true;
        foreach ($filesToProcess as $filePath) {
            $moduleName = pathinfo($filePath, PATHINFO_FILENAME); // Extract module name from filename
            $this->info("Processing module: {$moduleName} from file: {$filePath}");

            try {
                $content = File::get($filePath);
                $config = json_decode($content, true, 512, JSON_THROW_ON_ERROR);

                // Validate the config structure (ensure it has 'routes')
                if (!isset($config['routes']) || !is_array($config['routes'])) {
                    $this->error("Invalid config structure in {$filePath}. Missing or invalid 'routes' key.");
                    $overallSuccess = false;
                    continue;
                }

                if ($isValidation) {
                    if (!$this->validateModuleConfig($moduleName, $config)) {
                        $overallSuccess = false;
                    }
                } else {
                    // Generate links file
                    if (!$this->generateModuleLinks($config, $moduleName)) {
                        $overallSuccess = false;
                    }
                }

            } catch (Throwable $e) {
                $this->error("Error processing file {$filePath}: " . $e->getMessage());
                Log::error("Permalinks command error", ['file' => $filePath, 'error' => $e->getMessage()]);
                $overallSuccess = false;
            }
        }

        return $overallSuccess ? 0 : 1;
    }

    /**
     * Finds permalink JSON configuration files in a directory.
     */
    private function findPermalinkConfigFiles(string $directory, array $specificModules): array
    {
        $finder = new Finder();
        $finder->files()->in($directory)->name('*.json');

        $files = [];
        foreach ($finder as $file) {
            $moduleName = $file->getBasename('.json');
            // If specific modules are requested, only include those
            if (empty($specificModules) || in_array($moduleName, $specificModules)) {
                $files[] = $file->getRealPath();
            }
        }
        return $files;
    }

    /**
     * Validates a single module's configuration.
     */
    private function validateModuleConfig(string $moduleName, array $config): bool
    {
        $this->info("Validating config for module: {$moduleName}");
        // Add specific validation logic here (e.g., check route structure)
        $isValid = true; // Placeholder
        foreach ($config['routes'] ?? [] as $index => $route) {
            if (!isset($route['path']) || !isset($route['component'])) {
                $this->error(" - Route #{$index} for module '{$moduleName}' is missing 'path' or 'component'.");
                $isValid = false;
            }
            // Add more route validation checks if needed
        }
        if ($isValid) {
            $this->info(" - Validation passed for module: {$moduleName}");
        }
        return $isValid;
    }

    /**
     * Generates and saves the links file for a single module.
     * Returns true on success, false on failure.
     */
    private function generateModuleLinks(array $moduleConfig, string $moduleName): bool
    {
        $links = [];
        $baseUrl = rtrim(config('app.url', 'http://localhost'), '/'); // Ensure baseUrl exists

        foreach ($moduleConfig['routes'] as $route) {
            // Basic validation for required keys in route
            if (!isset($route['path']) || !isset($route['component'])) {
                $this->error("Skipping route in '{$moduleName}' due to missing 'path' or 'component'. Data: " . json_encode($route));
                continue; // Skip this invalid route
            }

            $path = ltrim($route['path'], '/');
            $fullPath = $baseUrl . '/' . $path;

            $links[] = [
                'url' => $fullPath,
                'path' => $path,
                'component' => $route['component'],
                'params' => $this->extractRouteParams($path),
                'cache_key' => $this->generateCacheKey($path),
                'meta' => [
                    'hash' => md5($fullPath),
                    'generated_at' => now()->toISOString()
                ],
                // Include props if they exist in the config
                'props' => $route['props'] ?? []
            ];
        }

        if (empty($links) && !empty($moduleConfig['routes'])) {
            $this->warn("No valid routes found to generate links for module: {$moduleName}");
            return false; // Indicate potential issue, though not strictly a failure if routes were invalid
        }

        $count = count($links);
        if ($this->saveLinks($moduleName, $links)) {
            $this->info("Generated {$moduleName} permalinks: {$count} links");
            return true;
        } else {
            $this->error("Failed to save links file for module: {$moduleName}");
            return false;
        }
    }

    private function extractRouteParams(string $path): array
    {
        preg_match_all('/\{(\w+)\}/', $path, $matches);
        return $matches[1] ?? [];
    }

    private function generateCacheKey(string $path): string
    {
        return 'route:' . str_replace(['/', '{', '}'], ['_', '', ''], $path);
    }

    /**
     * Saves the generated links to a file.
     * Returns true on success, false on failure.
     */
    private function saveLinks(string $moduleName, array $links): bool
    {
        // Define path relative to the storage disk root
        $relativePath = "ai/permalinks/{$moduleName}/links_" . md5($moduleName) . ".json";
        $outputDir = dirname($relativePath);
        $diskName = config('filesystems.default'); // Use the default disk

        try {
            // Use Laravel's Storage facade
            if (!Storage::disk($diskName)->exists($outputDir)) {
                Storage::disk($diskName)->makeDirectory($outputDir); // Recursive directory creation
            }

            $jsonData = json_encode([
                'data' => $links,
                'meta' => [
                    'count' => count($links),
                    'generated_at' => now()->toISOString()
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            // Put the file using the Storage facade
            if (!Storage::disk($diskName)->put($relativePath, $jsonData)) {
                throw new Exception("Storage::put failed to write to disk '{$diskName}' at {$relativePath}");
            }

            // Symbolic link creation is usually done once, not during every command run.
            // It relates the public disk to the storage directory.
            // This logic might be better placed elsewhere (e.g., deployment script or service provider).
            // If using Storage::fake(), the symbolic link is irrelevant for the test itself.
            // if (!File::exists(public_path('storage'))) {
            //     Artisan::call('storage:link');
            //     $this->info('Created storage symbolic link.');
            // }
            return true;
        } catch (Throwable $e) {
            Log::error("Error saving links file for module {$moduleName} using disk '{$diskName}' at {$relativePath}: " . $e->getMessage());
            return false;
        }
    }
}
