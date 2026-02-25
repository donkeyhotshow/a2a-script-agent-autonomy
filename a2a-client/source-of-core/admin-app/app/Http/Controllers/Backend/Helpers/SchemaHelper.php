<?php

namespace App\Http\Controllers\Backend\Helpers;

use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Hooks\FileFacade;
use InvalidArgumentException;

class SchemaHelper
{
    /**
     * Dynamically generate the form schema based on the directory structure.
     *
     * @param string $installerDir The directory where modules are stored
     * @return array Form schema
     * @throws InvalidArgumentException
     */
    public static function getFormSchema(string $installerDir): array
    {
        // Validate installer directory
        if (!PathHelper::isValid($installerDir)) {
            throw new InvalidArgumentException('Invalid installer directory path');
        }

        $baseDir = PathHelper::join(base_path('install-modules'), $installerDir);

        // Check if base directory exists and is accessible
        if (!FileHelper::isAccessible($baseDir)) {
            LogHelper::warning('SchemaHelper::getFormSchema', 'Base directory not found or not accessible', [
                'baseDir' => $baseDir
            ]);
            throw new InvalidArgumentException('Base directory not found or not accessible');
        }

        $formSchema = [
            'title' => 'Инсталлятор модулей',
            'description' => 'Выберите компоненты для установки:',
            'sections' => []
        ];

        try {
            // Scan the aiInstaller directory for modules
            $moduleDirs = array_filter(scandir($baseDir), function ($item) use ($baseDir) {
                $iDir = PathHelper::join($baseDir, $item, '_i');
                return $item !== '.' && $item !== '..' && 
                       FileHelper::isDirectory(PathHelper::join($baseDir, $item)) && 
                       FileHelper::isDirectory($iDir);
            });

            // Process each module
            foreach ($moduleDirs as $moduleDir) {
                $iDir = PathHelper::join($baseDir, $moduleDir, '_i');
                $metaFile = PathHelper::join($iDir, 'meta.json');

                // Get the module label from meta.json
                $moduleLabel = $moduleDir;
                if (FileHelper::isAccessible($metaFile)) {
                    $metaContent = JsonHelper::decode(FileFacade::get($metaFile));
                    $moduleLabel = ArrayHelper::get($metaContent, 'name', $moduleDir);
                }

                $sectionInfo = [
                    'name' => $moduleDir,
                    'label' => $moduleLabel,
                    'items' => [],
                    'commonFiles' => []
                ];

                // Check for common files from common.json
                $commonFile = PathHelper::join($iDir, 'common.json');
                if (FileHelper::isAccessible($commonFile)) {
                    $commonContent = JsonHelper::decode(FileFacade::get($commonFile));
                    if (ArrayHelper::isAssociative($commonContent)) {
                        $extractResult = JsonHelper::extractFilePaths($commonContent);
                        $sectionInfo['commonFiles'] = ArrayHelper::get($extractResult, 'files', []);
                        $errors = ArrayHelper::get($extractResult, 'errors', []);
                        if (!empty($errors)) {
                            $sectionInfo['commonValidationErrors'] = $errors;
                        }
                    }
                }

                // Check for files-by-block.json
                $installFile = PathHelper::join($iDir, 'files-by-block.json');
                if (FileHelper::isAccessible($installFile)) {
                    $jsonContent = JsonHelper::decode(FileFacade::get($installFile));
                    if (ArrayHelper::isAssociative($jsonContent)) {
                        foreach ($jsonContent as $sectionKey => $sectionValue) {
                            $extractResult = JsonHelper::extractFilePaths($sectionValue);
                            $fileList = ArrayHelper::get($extractResult, 'files', []);
                            $errors = ArrayHelper::get($extractResult, 'errors', []);

                            $item = [
                                'name' => $moduleDir . '-' . $sectionKey,
                                'label' => $sectionKey,
                                'type' => 'checkbox',
                                'files' => $fileList
                            ];

                            if (!empty($errors)) {
                                $item['validationErrors'] = $errors;
                            }

                            $sectionInfo['items'][] = $item;
                        }
                    }
                }

                // Add the section only if it's not empty
                if (!empty($sectionInfo['items']) || !empty($sectionInfo['commonFiles'])) {
                    $formSchema['sections'][] = $sectionInfo;
                }
            }

            LogHelper::debug('SchemaHelper::getFormSchema', 'Successfully generated form schema', [
                'sectionsCount' => count($formSchema['sections'])
            ]);

            return $formSchema;

        } catch (\Exception $e) {
            LogHelper::error('SchemaHelper::getFormSchema', 'Failed to generate form schema', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}
