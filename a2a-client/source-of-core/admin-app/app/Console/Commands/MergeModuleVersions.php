<?php

namespace App\Console\Commands;

use App\Hooks\FileFacade as File;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Finder\SplFileInfo;
use Throwable;

// Ensure Log facade is imported

// Add Throwable for exception handling

class MergeModuleVersions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    public $allowDebug = true;
    public $allowVerbose = false;
    protected $signature = 'module:merge {module? : Optional name of the module to merge (kebab-case). Merges all if omitted.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Merges specified module versions sequentially from implement-modules into install-modules/aiInstaller. It cleans the module\'s target directory first, then overlays versions as defined in install-modules/aiCore/module-versions.json, ensuring newer versions overwrite older ones.';

    /**
     * The source base path relative to the workspace root.
     *
     * @var string
     */
    protected string $sourceBasePath = 'implement-modules';

    /**
     * The target base path relative to the workspace root.
     *
     * @var string
     */
    protected string $targetBasePath = 'install-modules/aiInstaller';

    /**
     * Holds the loaded module configuration.
     * Structure: ['module-name' => ['v1', 'v2'], ...]
     * @var array<string, array<int, string>>
     */
    protected array $moduleConfig = [];

    /**
     * Store encountered files, their versions, and MD5 hashes for duplicate checking.
     * Structure is maintained per run for a consolidated duplicate report.
     * @var array<string, array<int, array{version: string, hash: string}>>
     */
    protected array $fileIndex = [];

    /**
     * Path to the module configuration file.
     * @var string
     */
    protected string $configFile = 'install-modules/aiCore/module-versions.json';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        // Load configuration first
        if (!$this->loadModuleConfiguration()) {
            return Command::FAILURE; // Error message handled in load function
        }

        $moduleArgument = $this->argument('module');
        $modulesToProcess = [];

        if ($moduleArgument) {
            // Process only the specified module
            if (!is_string($moduleArgument) || !Str::is($moduleArgument, Str::kebab($moduleArgument))) {
                if ($this->allowDebug)
                    $this->error('Invalid module name format. Please provide a kebab-case module name.');
                return Command::FAILURE;
            }
            if (!isset($this->moduleConfig[$moduleArgument])) {
                if ($this->allowDebug)
                    $this->error("Module '{$moduleArgument}' not found in the configuration file ({$this->configFile}).");
                return Command::FAILURE;
            }
            $modulesToProcess[$moduleArgument] = $this->moduleConfig[$moduleArgument];
            if ($this->allowVerbose)
                $this->info("Processing specified module: {$moduleArgument}");
        } else {
            // Process all modules from config
            $modulesToProcess = $this->moduleConfig;
            if ($this->allowVerbose)
                $this->info("Processing all modules defined in {$this->configFile}");
        }

        if (empty($modulesToProcess)) {
            if ($this->allowVerbose)
                $this->warn('No modules found in configuration or specified to process.');
            return Command::SUCCESS;
        }

        $this->fileIndex = []; // Reset index for the entire run (consolidated duplicate report)
        $overallSuccess = true;

        // Main processing loop
        foreach ($modulesToProcess as $moduleName => $versions) {
            if (empty($versions)) {
                if ($this->allowVerbose)
                    $this->comment("Skipping module '{$moduleName}' as no versions are defined in the configuration.");
                continue;
            }

            if ($this->allowVerbose)
                $this->line("--- Processing Module: {$moduleName} ---");
            $targetDir = $this->getTargetPath($moduleName);
            if ($this->allowVerbose)
                $this->line("Target directory: {$targetDir}");

            // ---- START DEBUG LOGGING ----
            if ($this->allowVerbose)
                Log::info("[MergeModuleVersions] Processing module: {$moduleName}");
            Log::info("[MergeModuleVersions] Target directory path for {$moduleName}: {$targetDir}");

            if (File::isDirectory($targetDir)) {
                if ($this->allowVerbose)
                    Log::info("[MergeModuleVersions] Target directory for {$moduleName} ({$targetDir}) EXISTS before deletion attempt.");
                if ($this->allowVerbose)
                    $this->comment("Cleaning target directory: {$targetDir}");
                $deleteSuccess = File::deleteDirectory($targetDir);
                Log::info("[MergeModuleVersions] File::deleteDirectory({$targetDir}) result: " . ($deleteSuccess ? 'true' : 'false'));

                if (!$deleteSuccess) {
                    if ($this->allowVerbose)
                        $this->error("Failed to clean target directory {$targetDir}. Skipping module {$moduleName}.");
                    if ($this->allowDebug)
                        Log::error("[MergeModuleVersions] FAILED to clean target directory {$targetDir} for module {$moduleName}. Skipping module.");
                    $overallSuccess = false;
                    continue; // Skip this module if cleanup fails
                }

                // Check if directory still exists after "successful" deletion
                if (File::isDirectory($targetDir)) {
                    Log::warning("[MergeModuleVersions] WARNING: Target directory {$targetDir} for module {$moduleName} STILL EXISTS after File::deleteDirectory() reported success.");
                } else {
                    Log::info("[MergeModuleVersions] Target directory {$targetDir} for module {$moduleName} successfully deleted (or did not exist after attempt).");
                }
            } else {
                Log::info("[MergeModuleVersions] Target directory {$targetDir} for module {$moduleName} does NOT EXIST before deletion attempt.");
            }

            File::ensureDirectoryExists($targetDir); // This should recreate the base dir if it was deleted
            if (File::isDirectory($targetDir)) {
                Log::info("[MergeModuleVersions] Target directory {$targetDir} for module {$moduleName} EXISTS after File::ensureDirectoryExists().");
            } else {
                Log::error("[MergeModuleVersions] CRITICAL: Target directory {$targetDir} for module {$moduleName} DOES NOT EXIST after File::ensureDirectoryExists().");
                $overallSuccess = false; // If we can't even create the base dir, something is very wrong
                continue; // Skip this module
            }
            // ---- END DEBUG LOGGING ----

            $versionsFound = false;
            $moduleSuccess = true;

            foreach ($versions as $version) {
                $sourceVersionDir = $this->getSourcePath($moduleName, $version);

                if (!File::isDirectory($sourceVersionDir)) {
                    $this->comment("  > Source directory for version {$version} not found: {$sourceVersionDir}. Skipping version.");
                    continue; // Skip this version if source dir doesn't exist
                }

                $versionsFound = true;
                if ($this->allowVerbose)
                    $this->line("  > Merging version {$version} from: {$sourceVersionDir}");

                // Index files before copying - Append to the global index
                $this->indexFiles($sourceVersionDir, $version, $moduleName); // Pass module name for context

                // Copy directory contents, overwriting existing files within the target
                if (File::copyDirectory($sourceVersionDir, $targetDir)) {
                    if ($this->allowVerbose)
                        $this->line("  > Successfully merged version {$version}.");
                } else {
                    $this->error("  > Failed to merge version {$version} from {$sourceVersionDir}.");
                    $moduleSuccess = false; // Mark module as failed but continue processing others
                    $overallSuccess = false;
                    // break; // Optionally stop processing versions for this module on failure
                }
            } // End version loop

            if (!$versionsFound) {
                $this->warn("No source version directories found for module '{$moduleName}' based on configuration. Target directory might be empty or incomplete.");
                // We don't necessarily fail the whole process if no versions are found for *one* module
            } elseif ($moduleSuccess) {
                if ($this->allowVerbose)
                    $this->info("Module '{$moduleName}' successfully merged into {$targetDir}.");
            } else {
                $this->error("Module '{$moduleName}' merge process encountered errors.");
            }
            if ($this->allowVerbose)
                $this->line("--- Finished Module: {$moduleName} ---");

        } // End module loop

        $this->outputDuplicateList(); // Output consolidated list at the end

        if ($overallSuccess) {
            $this->info("Merge process completed successfully.");
            return Command::SUCCESS;
        } else {
            $this->error("Merge process finished with errors.");
            return Command::FAILURE;
        }
    }

    /**
     * Load and validate the module configuration from the JSON file.
     *
     * @return bool True on success, false on failure.
     */
    protected function loadModuleConfiguration(): bool
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
                $this->error("Invalid configuration format in {$configPath}. Expecting a JSON object with a 'modules' key containing an object of module version arrays.");
                return false;
            }

            // Basic validation of module structure
            foreach ($configData['modules'] as $module => $versions) {
                if (!is_string($module) || !Str::is($module, Str::kebab($module))) {
                    $this->error("Invalid module name '{$module}' in configuration. Module names must be kebab-case strings.");
                    return false;
                }
                if (!is_array($versions)) {
                    $this->error("Invalid versions format for module '{$module}'. Expecting an array of version strings.");
                    return false;
                }
                foreach ($versions as $version) {
                    if (!is_string($version) || empty($version)) {
                        $this->error("Invalid version format found in module '{$module}'. Versions must be non-empty strings.");
                        return false;
                    }
                }
            }

            $this->moduleConfig = $configData['modules'];
            if ($this->allowVerbose)
                $this->info("Successfully loaded module configuration from {$configPath}");
            return true;

        } catch (Throwable $e) {
            $this->error("Failed to read or parse configuration file {$configPath}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get the full target path for the merged module.
     *
     * @param string $moduleName
     * @return string
     */
    protected function getTargetPath(string $moduleName): string
    {
        return base_path($this->targetBasePath . '/' . $moduleName);
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
     * Index files found in a specific version directory, including their MD5 hash.
     * Added module context to the file index.
     *
     * @param string $sourceDirectory
     * @param string $version
     * @param string $moduleName // Added module context
     * @return void
     */
    protected function indexFiles(string $sourceDirectory, string $version, string $moduleName): void
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $finder = File::isDirectory($sourceDirectory) ?
            iterator_to_array(File::allFiles($sourceDirectory, true)) :
            [];

        if (empty($finder)) {
            Log::channel($logChannel)->debug("[IndexFiles] No files found in directory: {$sourceDirectory}");
            return;
        }

        foreach ($finder as $file) {
            // Make sure $file is an SplFileInfo object
            if (!$file instanceof SplFileInfo) {
                // Attempt to create SplFileInfo if it's a string path (basic fallback)
                if (is_string($file) && File::exists($file)) {
                    $file = new SplFileInfo($file, '', basename($file)); // Relative path and name might be incorrect here
                } else {
                    Log::channel($logChannel)->warning("[IndexFiles] Encountered non-SplFileInfo object in finder results for {$sourceDirectory}, and could not convert. Type: " . (is_object($file) ? get_class($file) : gettype($file)));
                    continue;
                }
            }

            $moduleRelativePath = $file->getRelativePathname();
            $fileHash = md5_file($file->getRealPath());

            // Initialize if not exists
            if (!isset($this->fileIndex[$moduleRelativePath])) {
                $this->fileIndex[$moduleRelativePath] = [];
            }
            $this->fileIndex[$moduleRelativePath][] = [
                'version' => $version,
                'hash' => $fileHash,
                'module' => $moduleName,
                'full_source_path' => $file->getRealPath() // Store full path for reference
            ];
        }
    }

    /**
     * Output the list of files found with identical content (MD5 hash) in multiple versions ACROSS ALL processed modules.
     *
     * @return void
     */
    protected function outputDuplicateList(): void
    {
        $logChannel = $this->logChannelName ?? 'stack';
        $duplicatesByModule = []; // Group by module for clearer output

        foreach ($this->fileIndex as $moduleRelativePath => $versionsData) {
            if (count($versionsData) > 1) { // File exists in more than one version
                $moduleName = $versionsData[0]['module'] ?? 'unknown_module';

                $hashes = array_column($versionsData, 'hash');
                $uniqueHashes = array_unique($hashes);
                $versionsPresent = array_column($versionsData, 'version');

                $isContentDifferent = count($uniqueHashes) > 1;

                // Store all version entries for this path to later sort and find previous
                $duplicatesByModule[$moduleName][$moduleRelativePath] = [
                    'versions_data' => $versionsData, // Store the full data
                    'content_different' => $isContentDifferent,
                    'hashes' => $uniqueHashes
                ];
            }
        }

        if (!empty($duplicatesByModule)) {
            $this->comment("\n--- Source File Consistency Report ---");
            $this->comment("The following files were found in multiple source versions within '{$this->sourceBasePath}'. Review these for consistency:");

            foreach ($duplicatesByModule as $moduleName => $files) {
                $this->line("\nModule: {$moduleName}");
                $definedModuleVersions = $this->moduleConfig[$moduleName] ?? [];

                natsort($definedModuleVersions);
                $definedModuleVersions = array_values($definedModuleVersions);

                foreach ($files as $filePath => $info) {
                    // Extract all versions where this specific file path exists for this module
                    $versionsPresent = array_unique(array_column($info['versions_data'], 'version'));
                    natsort($versionsPresent); // Sort them chronologically based on simple sort for now
                    $versionsPresent = array_values(array_intersect($definedModuleVersions, $versionsPresent)); // Ensure correct module-defined order


                    $latestVersionForFile = $this->findLatestVersion($versionsPresent, $definedModuleVersions);
                    $sourcePathLatest = $this->getSourcePath($moduleName, $latestVersionForFile) . DIRECTORY_SEPARATOR . $filePath;
                    $versionsString = implode(', ', $versionsPresent);

                    if ($info['content_different']) {
                        $this->warn("  - File: {$filePath}");
                        $this->line("    The merge uses content from the latest version processed ('{$latestVersionForFile}').");
                        $this->line("    Review and consolidate differing content into the source file: {$sourcePathLatest}");
                    } else {
                        $this->info("  - File: {$filePath} (Identical content)");
                        $this->line("    Present in source versions: {$versionsString}.");
                        $this->line("    The merge uses content from the latest of these, '{$latestVersionForFile}' (at {$sourcePathLatest}).");

                        $previousVersionWithSameContent = null;
                        if (count($versionsPresent) > 1) {
                            $latestIndex = array_search($latestVersionForFile, $versionsPresent);
                            if ($latestIndex !== false && $latestIndex > 0) {
                                $previousVersionWithSameContent = $versionsPresent[$latestIndex - 1];
                            }
                        }

                        if ($previousVersionWithSameContent) {
                            $this->line("    If you remove this file from the '{$latestVersionForFile}' source directory, the merge will automatically use the file");
                            $this->line("    from '{$previousVersionWithSameContent}', resulting in no change to the merged outcome.");
                            $this->line("    To simplify sources, consider removing this file from '{$latestVersionForFile}' as long as an identical copy exists in '{$previousVersionWithSameContent}'.");
                        } else {
                            $this->line("    This is the only version (or the earliest) with this content among those listed, so removing it would change the merge outcome or remove the file if no other versions exist.");
                        }
                    }
                }
            }
            $this->comment("\nNote: The merge process overlays versions in sequence. The content from the latest specified version of a file will be the one present in '{$this->targetBasePath}'.");
        } else {
            if ($this->allowVerbose)
                $this->info("\nNo duplicate file paths across different source versions were detected that require manual review for consolidation.");
        }

        $missingInNewerByModule = [];
        foreach ($this->moduleConfig as $moduleName => $definedVersions) {
            if (count($definedVersions) < 2) continue;

            natsort($definedVersions);
            $definedVersions = array_values($definedVersions); // Ensure it's sorted for proper old/new comparison

            $allModuleFiles = [];
            foreach ($this->fileIndex as $path => $entries) {
                if (!empty($entries) && ($entries[0]['module'] ?? null) === $moduleName) {
                    $allModuleFiles[$path] = true;
                }
            }
            $allModuleFiles = array_keys($allModuleFiles);

            for ($i = 0; $i < count($definedVersions) - 1; $i++) {
                $olderVersion = $definedVersions[$i];
                $newerVersion = $definedVersions[$i + 1];

                foreach ($allModuleFiles as $filePath) {
                    $inOlder = false;
                    $inNewer = false;
                    if (isset($this->fileIndex[$filePath])) {
                        foreach ($this->fileIndex[$filePath] as $fileEntry) {
                            if ($fileEntry['module'] === $moduleName) {
                                if ($fileEntry['version'] === $olderVersion) $inOlder = true;
                                if ($fileEntry['version'] === $newerVersion) $inNewer = true;
                            }
                        }
                    }

                    if ($inOlder && !$inNewer) {
                        $missingInNewerByModule[$moduleName][] = [
                            'file' => $filePath,
                            'older_version' => $olderVersion,
                            'newer_version' => $newerVersion,
                            'older_path' => $this->getSourcePath($moduleName, $olderVersion) . DIRECTORY_SEPARATOR . $filePath,
                            'newer_expected_path' => $this->getSourcePath($moduleName, $newerVersion) . DIRECTORY_SEPARATOR . $filePath,
                        ];
                    }
                }
            }
        }

        if (!empty($missingInNewerByModule)) {
            $this->comment("\n--- Source File Progression Report ---");

            if ($this->output->isVerbose()) { // Check for -v, -vv, -vvv
                $this->comment("The following files exist in older source versions but appear to be missing from newer source versions for their module. This might be intentional (deprecation) or an oversight:");
                foreach ($missingInNewerByModule as $moduleName => $missingFiles) {
                    $this->line("\nModule: {$moduleName}");
                    foreach ($missingFiles as $missing) {
                        $this->warn("  - File: {$missing['file']}");
                        $this->line("    Present in source: {$missing['older_version']} (at {$missing['older_path']})");
                        $this->line("    Missing in source: {$missing['newer_version']} (expected at {$missing['newer_expected_path']})");
                        $this->line("    Action: If this file (and its changes) should be part of '{$missing['newer_version']}', ensure it's copied and updated in that source directory.");
                        $this->line("            If it's intentionally deprecated and removed in '{$missing['newer_version']}', no action needed for merge (older version will be used unless a subsequent version explicitly deletes/overwrites its path).");
                        $this->line("            For cleaner sources, you might remove it from '{$missing['older_version']}' if truly deprecated.");
                    }
                }
            } else {
                $this->comment("Summarizing files in older source versions that appear missing from newer ones.");
                $this->comment("This might be intentional (deprecation) or an oversight.");
                foreach ($missingInNewerByModule as $moduleName => $filesList) {
                    $this->line("\nModule: {$moduleName}");
                    $summaryByTransition = [];
                    foreach ($filesList as $fileInfo) {
                        $transitionKey = "version {$fileInfo['older_version']} to version {$fileInfo['newer_version']}";
                        if (!isset($summaryByTransition[$transitionKey])) {
                            $summaryByTransition[$transitionKey] = 0;
                        }
                        $summaryByTransition[$transitionKey]++;
                    }
                    foreach ($summaryByTransition as $transition => $count) {
                        $this->line("  - {$count} file(s) from {$transition} appear missing in the newer version.");
                    }
                }
            }
        }
    }

    protected function findLatestVersion(array $versionsPresent, array $definedOrder): ?string
    {
        $latest = null;
        // Iterate definedOrder in reverse to find the latest present version first
        foreach (array_reverse($definedOrder) as $definedVer) {
            if (in_array($definedVer, $versionsPresent)) {
                return $definedVer; // Return the first one found from reversed (latest) order
            }
        }
        // Fallback if none of the versionsPresent were in definedOrder (should not happen if data is consistent)
        // or if versionsPresent is empty. Or return first of versionsPresent if $definedOrder is empty.
        return !empty($versionsPresent) ? $versionsPresent[count($versionsPresent) - 1] : null;
    }
}
