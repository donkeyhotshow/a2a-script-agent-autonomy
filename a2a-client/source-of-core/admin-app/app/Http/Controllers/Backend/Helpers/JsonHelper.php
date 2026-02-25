<?php

namespace App\Http\Controllers\Backend\Helpers;

use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper as CommonJsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Hooks\FileFacade;
use InvalidArgumentException;

class JsonHelper
{
    /**
     * Process a JSON file and execute a callback.
     *
     * @param string $moduleName
     * @param string $sourcePath
     * @param string $destinationPath
     * @param string $primaryFileName
     * @param callable $callback
     * @return void
     * @throws InvalidArgumentException
     */
    public function processJsonFile(
        string $moduleName,
        string $sourcePath,
        string $destinationPath,
        string $primaryFileName,
        callable $callback
    ): void {
        // Validate paths
        if (!PathHelper::isValid($sourcePath) || !PathHelper::isValid($destinationPath)) {
            throw new InvalidArgumentException('Invalid source or destination path');
        }

        // Build paths
        $iDir = PathHelper::join($sourcePath, '_i');
        $primaryFile = PathHelper::join($iDir, $primaryFileName);

        // Check if file exists and is accessible
        if (!FileHelper::isAccessible($primaryFile)) {
            LogHelper::warning('JsonHelper::processJsonFile', 'Primary file not found or not accessible', [
                'module' => $moduleName,
                'file' => $primaryFile
            ]);
            return;
        }

        // Read and decode JSON
        try {
            $jsonContent = FileFacade::get($primaryFile);
            $jsonData = CommonJsonHelper::decode($jsonContent);

            if (!ArrayHelper::isAssociative($jsonData)) {
                LogHelper::warning('JsonHelper::processJsonFile', 'Invalid JSON data format', [
                    'module' => $moduleName,
                    'file' => $primaryFile
                ]);
                return;
            }

            // Extract file paths using common helper
            $extractResult = CommonJsonHelper::extractFilePaths($jsonData);
            $filesToProcess = ArrayHelper::get($extractResult, 'files', []);
            $errors = ArrayHelper::get($extractResult, 'errors', []);

            // Log any errors from extraction
            if (!empty($errors)) {
                LogHelper::warning('JsonHelper::processJsonFile', 'Errors during file path extraction', [
                    'module' => $moduleName,
                    'errors' => $errors
                ]);
            }

            // Execute callback with files to process
            $callback($filesToProcess);

            LogHelper::debug('JsonHelper::processJsonFile', 'Successfully processed JSON file', [
                'module' => $moduleName,
                'file' => $primaryFile,
                'filesCount' => count($filesToProcess)
            ]);

        } catch (\Exception $e) {
            LogHelper::error('JsonHelper::processJsonFile', 'Failed to process JSON file', [
                'module' => $moduleName,
                'file' => $primaryFile,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    // Метод extractFilePaths удален отсюда, так как он перенесен в App\Helpers\JsonHelper
}
