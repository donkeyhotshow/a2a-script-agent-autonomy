<?php

namespace App\Http\Controllers\Backend\Helpers;

use App\Hooks\FileFacade;
use Exception;
use Illuminate\Support\Facades\Log;

class AssetProcessor
{
    protected $jsonHelper;
    protected $fileHelper;

    public function __construct()
    {
        $this->jsonHelper = new JsonHelper(); // Assuming JsonHelper is available
        $this->fileHelper = new FileHelper(); // Assuming FileHelper is available
    }

    /**
     * Process assets for all modules based on _i/assets.json.
     *
     * @return array Log messages.
     */
    public function processAllModuleAssets(): array
    {
        $log = [];
        $installerBaseDir = base_path('install-modules/aiInstaller'); // Source is installer dir
        $publicBaseDir = storage_path('app/public/assets');

        if (!FileFacade::exists($publicBaseDir)) {
            FileFacade::makeDirectory($publicBaseDir, 0777, true);
            $log[] = "Created public assets directory: {$publicBaseDir}";
        }

        $moduleDirs = array_filter(scandir($installerBaseDir), function ($item) use ($installerBaseDir) {
            $modulePath = $installerBaseDir . DIRECTORY_SEPARATOR . $item;
            return $item !== '.' && $item !== '..' && is_dir($modulePath) && is_dir($modulePath . DIRECTORY_SEPARATOR . '_i');
        });

        foreach ($moduleDirs as $moduleName) {
            $moduleLog = $this->copyModuleAssets($moduleName, $installerBaseDir, $publicBaseDir);
            $log = array_merge($log, $moduleLog);
        }

        return $log;
    }

    /**
     * Copy assets for a single module based on _i/assets.json.
     *
     * @param string $moduleName
     * @param string $installerBaseDir
     * @param string $publicBaseDir
     * @return array Log messages for this module.
     */
    protected function copyModuleAssets(string $moduleName, string $installerBaseDir, string $publicBaseDir): array
    {
        $log = [];
        $moduleInstallerPath = $installerBaseDir . DIRECTORY_SEPARATOR . $moduleName;
        $assetsConfigPath = $moduleInstallerPath . DIRECTORY_SEPARATOR . '_i' . DIRECTORY_SEPARATOR . 'assets.json';
        $moduleAssetsSourceDir = $moduleInstallerPath . DIRECTORY_SEPARATOR . 'assets';
        $moduleAssetsPublicDir = $publicBaseDir . DIRECTORY_SEPARATOR . $moduleName;

        if (!FileFacade::exists($assetsConfigPath)) {
            $log[] = "No assets.json found for module {$moduleName}, skipping asset copy.";
            return [];
        }

        if (!FileFacade::exists($moduleAssetsSourceDir) || !FileFacade::isDirectory($moduleAssetsSourceDir)) {
            $log[] = "Assets source directory not found for module {$moduleName}: {$moduleAssetsSourceDir}";
            return [];
        }

        try {
            $assetsConfig = json_decode(FileFacade::get($assetsConfigPath), true);
            if (!$assetsConfig || !is_array($assetsConfig)) {
                $log[] = "Warning: Invalid or empty assets.json for module {$moduleName}.";
                return $log;
            }

            $extractResult = $this->jsonHelper->extractFilePaths($assetsConfig);
            $filesToCopy = $extractResult['files'];
            $errors = $extractResult['errors'];

            if (!empty($errors)) {
                $log[] = "Warning: Errors found while parsing assets.json for {$moduleName}: " . implode(', ', $errors);
            }

            if (empty($filesToCopy)) {
                $log[] = "No assets listed in assets.json for module {$moduleName}.";
                return $log;
            }

            if (!FileFacade::exists($moduleAssetsPublicDir)) {
                FileFacade::makeDirectory($moduleAssetsPublicDir, 0777, true);
            }

            $log[] = "Copying assets for module {$moduleName}...";
            foreach ($filesToCopy as $assetPath) {
                $sourceAssetPath = $moduleAssetsSourceDir . DIRECTORY_SEPARATOR . $assetPath;
                $destAssetPath = $moduleAssetsPublicDir . DIRECTORY_SEPARATOR . $assetPath;

                if (FileFacade::exists($sourceAssetPath)) {
                    FileFacade::ensureDirectoryExists(dirname($destAssetPath));
                    if (FileFacade::isDirectory($sourceAssetPath)) {
                        $this->fileHelper->copyDirectoryRecursive($sourceAssetPath, $destAssetPath, $log); // Use helper for recursive copy
                        // $log[] implicitly added by helper
                    } else {
                        if (FileFacade::copy($sourceAssetPath, $destAssetPath)) {
                            $log[] = "  Copied asset file: {$assetPath}";
                        } else {
                            $log[] = "  Error copying asset file: {$assetPath}";
                        }
                    }
                } else {
                    $log[] = "  Warning: Asset source not found: {$assetPath} in module {$moduleName}";
                }
            }
            $log[] = "Finished copying assets for module {$moduleName}.";

        } catch (Exception $e) {
            $log[] = "Error processing assets for module {$moduleName}: " . $e->getMessage();
            Log::error("Error processing module assets", ['module' => $moduleName, 'exception' => $e]);
        }

        return $log;
    }

    private function processSingleFile(string $relativePath, string $moduleName): ?string
    {
        // MODIFIED: Changed storage_path to base_path and updated the path
        $installerBaseDir = base_path('install-modules/aiInstaller'); // Source is installer dir
        $sourcePath = $installerBaseDir . '/' . $moduleName . '/' . $relativePath;

        // ... existing code ...
    }
}
