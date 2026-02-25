<?php

namespace App\Hooks;

use Exception;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Support\Facades\File as BaseFileFacade;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FileFacade extends BaseFileFacade
{
    public static function get($path, $lock = false)
    {
        $isDebugTextArea = Str::endsWith($path, 'TextArea.json');

        if ($isDebugTextArea) {
            Log::info('[TextArea Debug] Attempting to read: ' . $path);
        }

        try {
            $rawContent = parent::get($path, $lock);
        } catch (FileNotFoundException $e) {
            Log::warning('[FileFacade Warning] File not found: ' . $path);
            return null;
        } catch (Exception $e) {
            Log::error('[FileFacade Error] Failed to read file: ' . $path . ' - ' . $e->getMessage());
            return null;
        }

        // Only attempt to strip comments from JSON files
        if (Str::endsWith(strtolower($path), '.json')) {
            if ($isDebugTextArea) {
                Log::info('[TextArea Debug] Raw content length: ' . strlen($rawContent));
                // Log first few characters to check for BOM or weird starting bytes
                Log::info('[TextArea Debug] Raw content start: ' . substr(bin2hex($rawContent), 0, 20));
            }

            // More robust regex to remove both // and /* */ comments
            $cleanedContent = preg_replace(
                '#(\/\/.*$|\/\*[\s\S]*?\*\/)|\s*(\/\/.*$|\/\*[\s\S]*?\*\/)#m',
                '',
                $rawContent
            );

            if (preg_last_error() !== PREG_NO_ERROR) {
                Log::error('[FileFacade Error] preg_replace error: ' . preg_last_error_msg() . ' on file: ' . $path);
                // Return raw content if regex fails, might allow different error reporting
                return $rawContent;
            }

            if ($isDebugTextArea) {
                Log::info('[TextArea Debug] Cleaned content length: ' . strlen($cleanedContent));
            }

            // Trim whitespace which might interfere with json_decode
            $trimmedContent = trim($cleanedContent);

            if ($isDebugTextArea && empty($trimmedContent)) {
                Log::warning('[TextArea Debug] Content became empty after cleaning and trimming.');
            }

            // Check for JSON decoding errors after cleaning
            json_decode($trimmedContent); // Decode the trimmed content
            $jsonError = json_last_error();

            if ($jsonError !== JSON_ERROR_NONE) {
                Log::warning('[FileFacade JSON Decode Error] File: ' . $path . ' | Error: ' . json_last_error_msg());
                if ($isDebugTextArea) {
                    Log::info('-------------------------------- [TextArea RAW]');
                    Log::info($rawContent);
                    Log::info('-------------------------------- [TextArea CLEANED - FAILED]');
                    Log::info($trimmedContent);
                    Log::info('--------------------------------');
                }
                // Return raw content to potentially let the caller handle the specific JSON error
                return $rawContent;
            } else {
                if ($isDebugTextArea) {
                    Log::info('[TextArea Debug] JSON decoded successfully.');
                }
            }

            return $trimmedContent; // Return the successfully decoded (and trimmed) content

        } else {
            // Log::info('-------------------------------- [NON-JSON]');
            // Log::info('FileFacade result (raw): ' . $rawContent);
            // Log::info('--------------------------------');
            return $rawContent;
        }
    }

    // Override other methods if needed, ensuring they use the custom 'get' or replicate logic
    public static function exists($path)
    {
        return parent::exists($path);
    }

    public static function put($path, $contents, $lock = false)
    {
        // Consider if comment stripping is needed before PUT operations if relevant
        return parent::put($path, $contents, $lock);
    }

    public static function isDirectory($directory)
    {
        return parent::isDirectory($directory);
    }

    public static function files($directory, $hidden = false)
    {
        return parent::files($directory, $hidden);
    }
}
