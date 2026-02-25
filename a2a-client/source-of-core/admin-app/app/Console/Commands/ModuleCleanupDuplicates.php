<?php

namespace App\Console\Commands;

use App\Hooks\FileFacade as File;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Symfony\Component\Finder\SplFileInfo;
use Throwable;

class ModuleCleanupDuplicates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // MODIFIED: Made module argument mandatory
    protected $signature = 'module:cleanup-duplicates {module : Name of the module to check for duplicates (kebab-case)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find identical files across versions in implement-modulesles and generate a cleanup script.';

    /**
     * The source base path relative to the workspace root.
     *
     * @var string
     */
    protected string $sourceBasePath = 'implement-modules';

    /**
     * Path to the module configuration file.
     * @var string
     */
    protected string $configFile = 'install-modules/aiCore/module-versions.json';

    /**
     * Holds the loaded module configuration.
     * @var array<string, array<int, string>>
     */
    protected array $moduleConfig = [];

    /**
     * Path to the output PowerShell script.
     * @var string
     */
    protected string $outputScriptPath = 'docs/__ps1/cleanup_duplicates_in_versions.ps1';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $moduleName = $this->argument('module');

        // Validate module name format (moved validation here)
        if (!is_string($moduleName) || !Str::is($moduleName, Str::kebab($moduleName))) {
            $this->error('Invalid module name format. Please provide a kebab-case module name.');
            return Command::FAILURE;
        }

        if (!$this->loadModuleConfiguration($moduleName)) {
            return Command::FAILURE;
        }

        $versions = $this->moduleConfig[$moduleName] ?? null;
        if (empty($versions) || count($versions) < 2) {
            $this->info("Module '{$moduleName}' has less than two versions defined. No duplicates possible within this module.");
            return Command::SUCCESS;
        }

        $this->info("Analyzing module '{$moduleName}' for duplicate files across versions: " . implode(', ', $versions));

        // 1. Index files and hashes for the specified module
        $fileIndex = $this->indexModuleFiles($moduleName, $versions);
        if ($fileIndex === false) {
            $this->error("Failed to index files for module '{$moduleName}'.");
            return Command::FAILURE;
        }

        // 2. Identify duplicates and files to remove
        $filesToRemove = $this->findFilesToRemove($fileIndex, $versions);

        if (empty($filesToRemove)) {
            $this->info("No duplicate files found needing cleanup in module '{$moduleName}'.");
            return Command::SUCCESS;
        }

        // 3. Generate the cleanup script
        if ($this->generateCleanupScript($filesToRemove, $moduleName)) {
            $this->info("Successfully generated cleanup script: {$this->outputScriptPath}");
            $this->warn("IMPORTANT: Review the generated script '{$this->outputScriptPath}' carefully before executing it!");
            return Command::SUCCESS;
        } else {
            $this->error("Failed to generate cleanup script.");
            return Command::FAILURE;
        }
    }

    /**
     * Load and validate the module configuration from the JSON file for a specific module.
     *
     * @param string $moduleName The module to load config for.
     * @return bool True on success, false on failure.
     */
    protected function loadModuleConfiguration(string $moduleName): bool
    {
        $configPath = base_path($this->configFile);
        if (!File::exists($configPath)) {
            $this->error("Configuration file not found: {$configPath}");
            return false;
        }

        try {
            $configContent = File::get($configPath);
            $configData = json_decode($configContent, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($configData) || !isset($configData['modules']) || !is_array($configData['modules'])) {
                $this->error("Invalid configuration format in {$configPath}. Expecting 'modules' key.");
                return false;
            }

            if (!isset($configData['modules'][$moduleName])) {
                $this->error("Module '{$moduleName}' not found in the configuration file ({$configPath}).");
                return false;
            }

            if (!is_array($configData['modules'][$moduleName])) {
                $this->error("Invalid versions format for module '{$moduleName}'. Expecting an array.");
                return false;
            }
            // Further validation of version strings could be added here if needed

            // Store only the requested module's config
            $this->moduleConfig = [$moduleName => $configData['modules'][$moduleName]];
            $this->info("Successfully loaded configuration for module '{$moduleName}' from {$configPath}");
            return true;

        } catch (Throwable $e) {
            $this->error("Failed to read or parse configuration file {$configPath}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Index files for a specific module across its defined versions.
     *
     * @param string $moduleName
     * @param array<string> $versions
     * @return array<string, array<int, array{version: string, hash: string, absolutePath: string}>>|false Indexed files or false on error.
     */
    protected function indexModuleFiles(string $moduleName, array $versions): array|false
    {
        $fileIndex = [];
        $hasErrors = false;

        foreach ($versions as $version) {
            $sourceVersionDir = $this->getSourcePath($moduleName, $version);

            if (!File::isDirectory($sourceVersionDir)) {
                $this->comment("Source directory for version {$version} not found: {$sourceVersionDir}. Skipping version.");
                continue; // Skip this version if source dir doesn't exist
            }

            $files = File::allFiles($sourceVersionDir);

            /** @var SplFileInfo $file */
            foreach ($files as $file) {
                $absolutePath = $file->getRealPath();
                $relativePath = $file->getRelativePathname();
                $normalizedPath = str_replace('\\', '/', $relativePath);

                if ($absolutePath === false) {
                    $this->error("Could not get real path for file: {$file->getPathname()}. Skipping hash generation.");
                    $hash = 'error_getting_path';
                    $hasErrors = true; // Mark error but continue indexing others
                } else {
                    try {
                        $content = File::get($absolutePath);
                        $hash = md5($content);
                    } catch (Throwable $e) {
                        $this->error("Error reading file {$absolutePath} for hashing: " . $e->getMessage());
                        $hash = 'error_reading_file';
                        $hasErrors = true; // Mark error but continue indexing others
                    }
                }

                if (!isset($fileIndex[$normalizedPath])) {
                    $fileIndex[$normalizedPath] = [];
                }

                $fileIndex[$normalizedPath][] = [
                    'version' => $version,
                    'hash' => $hash,
                    'absolutePath' => $absolutePath ?: 'error_getting_path' // Store path for deletion
                ];
            }
        }
        return $hasErrors ? false : $fileIndex; // Return false if any error occurred during indexing
    }

    /**
     * Get the full source path for a specific module version.
     *
     * @param string $moduleName
     * @param string|null $version
     * @return string
     */
    protected function getSourcePath(string $moduleName, ?string $version = null): string
    {
        $path = base_path($this->sourceBasePath . '/' . $moduleName);
        if ($version) {
            $path .= '/' . $version;
        }
        return $path;
    }

    /**
     * Identifies files in the LATEST version that have identical content to their counterparts in ANY earlier version.
     *
     * @param array $fileIndex Output of indexModuleFiles.
     * @param array $versions Ordered list of versions for the module.
     * @return array<string> List of absolute paths to files in the latest version recommended for removal.
     */
    protected function findFilesToRemove(array $fileIndex, array $versions): array
    {
        $filesToRemove = [];
        $versionOrder = array_flip($versions); // Map version name to its order index
        $latestVersionName = end($versions); // Get the name of the latest version

        foreach ($fileIndex as $relativePath => $entries) {
            if (count($entries) <= 1) {
                continue; // Need at least two versions of the file
            }

            // Group entries by hash
            $hashes = [];
            foreach ($entries as $entry) {
                if ($entry['hash'] === 'error_getting_path' || $entry['hash'] === 'error_reading_file') {
                    continue; // Skip files with hashing errors
                }
                if (!isset($hashes[$entry['hash']])) {
                    $hashes[$entry['hash']] = [];
                }
                $hashes[$entry['hash']][] = $entry; // Store the whole entry (version, path, hash)
            }

            // Process each group of identical files (same hash)
            foreach ($hashes as $hash => $identicalEntries) {
                if (count($identicalEntries) <= 1) {
                    continue; // Need duplicates for cleanup
                }

                // Find the entry corresponding to the LATEST version among these duplicates
                $latestEntry = null;
                foreach ($identicalEntries as $entry) {
                    if ($entry['version'] === $latestVersionName) {
                        $latestEntry = $entry;
                        break;
                    }
                }

                // If the latest version is not among the duplicates for this hash, skip
                if (!$latestEntry) {
                    continue;
                }

                // Check if there's any EARLIER version with the same hash
                $foundEarlierDuplicate = false;
                $earliestDuplicateVersion = $latestVersionName; // Keep track of the version to keep
                foreach ($identicalEntries as $entry) {
                    if ($entry['version'] !== $latestVersionName) { // If it's an earlier version
                        $foundEarlierDuplicate = true;
                        // Optional: find the earliest version to mention in the log
                        if (($versionOrder[$entry['version']] ?? PHP_INT_MAX) < ($versionOrder[$earliestDuplicateVersion] ?? PHP_INT_MAX)) {
                            $earliestDuplicateVersion = $entry['version'];
                        }
                        // No need to check further, we found one earlier duplicate
                        // break; // Can break if we only need existence, but finding earliest might be useful log info
                    }
                }

                // If an earlier version with the same hash exists, mark the LATEST version file for removal
                if ($foundEarlierDuplicate && $latestEntry['absolutePath'] !== 'error_getting_path') {
                    $filesToRemove[$latestEntry['absolutePath']] = true; // Use path as key for uniqueness
                    $this->line("  - Found duplicate: {$relativePath} (Keep identical version from: {$earliestDuplicateVersion}, Remove latest version: {$latestEntry['version']})");
                }
            } // End hash group loop
        } // End file loop

        return array_keys($filesToRemove);
    }

    /**
     * Generates the PowerShell cleanup script.
     *
     * @param array<string> $filesToRemove List of absolute paths.
     * @param string $moduleName
     * @return bool Success or failure.
     */
    protected function generateCleanupScript(array $filesToRemove, string $moduleName): bool
    {
        $scriptContent = "# PowerShell Cleanup Script for Module: {$moduleName}\n";
        $scriptContent .= "# Generated on: " . date('Y-m-d H:i:s') . "\n";
        $scriptContent .= "# IMPORTANT: Review this script carefully before execution!\n\n";
        $scriptContent .= "Write-Host \"Starting cleanup for module: {$moduleName}\" -ForegroundColor Yellow\n\n";

        foreach ($filesToRemove as $filePath) {
            // Escape path for PowerShell command
            $escapedPath = '\`\'\'' . str_replace('\'', '\'\'\'\'', $filePath) . '\`\'\''; // Enclose in `''`, escape internal `'` with `''''`
            $scriptContent .= "# Remove duplicate file: {$filePath}\n";
            $scriptContent .= "if (Test-Path -Path {$escapedPath} -PathType Leaf) {\n";
            $scriptContent .= "    Write-Host \"Removing: {$filePath}\"\n";
            $scriptContent .= "    Remove-Item -Path {$escapedPath} -Force -ErrorAction SilentlyContinue\n"; // Use -Force to delete read-only if needed
            $scriptContent .= "} else {\n";
            $scriptContent .= "    Write-Host \"Skipping (Not Found or Not a File): {$filePath}\" -ForegroundColor Gray\n";
            $scriptContent .= "}\n\n";
        }

        $scriptContent .= "Write-Host \"Cleanup script finished for module: {$moduleName}\" -ForegroundColor Green\n";

        $outputFullPath = base_path($this->outputScriptPath);

        try {
            File::ensureDirectoryExists(dirname($outputFullPath));
            File::put($outputFullPath, $scriptContent);
            return true;
        } catch (Throwable $e) {
            $this->error("Failed to write cleanup script to {$outputFullPath}: " . $e->getMessage());
            return false;
        }
    }
}
