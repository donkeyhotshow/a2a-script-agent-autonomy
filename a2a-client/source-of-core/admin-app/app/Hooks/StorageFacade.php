<?php

namespace App\Hooks;

use Exception;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage as BaseStorageFacade;
use Illuminate\Support\Str;

class StorageFacade extends BaseStorageFacade
{
    public static function get($path)
    {
        $isDebugTextArea = Str::endsWith($path, 'TextArea.json');

        if ($isDebugTextArea) {
            Log::info('[TextArea Debug] Attempting to read: ' . $path);
        }

        try {
            $rawContent = parent::disk(static::getDefaultDriver())->get($path);
        } catch (FileNotFoundException $e) {
            Log::warning('[StorageFacade Warning] File not found: ' . $path);
            return null;
        } catch (Exception $e) {
            Log::error('[StorageFacade Error] Failed to read file: ' . $path . ' - ' . $e->getMessage());
            return null;
        }

        // Only attempt to strip comments from JSON files
        if (Str::endsWith(strtolower($path), '.json')) {
            if ($isDebugTextArea) {
                Log::info('[TextArea Debug] Raw content length: ' . strlen($rawContent));
                Log::info('[TextArea Debug] Raw content start: ' . substr(bin2hex($rawContent), 0, 20));
            }

            $cleanedContent = preg_replace(
                '#(\/\/.*$|\/\*[\s\S]*?\*\/)\s*#m',
                '',
                $rawContent
            );

            if (preg_last_error() !== PREG_NO_ERROR) {
                Log::error('[StorageFacade Error] preg_replace error: ' . preg_last_error_msg() . ' on file: ' . $path);
                return $rawContent;
            }

            if ($isDebugTextArea) {
                Log::info('[TextArea Debug] Cleaned content length: ' . strlen($cleanedContent));
            }

            $trimmedContent = trim($cleanedContent);

            if ($isDebugTextArea && empty($trimmedContent)) {
                Log::warning('[TextArea Debug] Content became empty after cleaning and trimming.');
            }

            json_decode($trimmedContent);
            $jsonError = json_last_error();

            if ($jsonError !== JSON_ERROR_NONE) {
                Log::warning('[StorageFacade JSON Decode Error] File: ' . $path . ' | Error: ' . json_last_error_msg());
                if ($isDebugTextArea) {
                    Log::info('-------------------------------- [TextArea RAW]');
                    Log::info($rawContent);
                    Log::info('-------------------------------- [TextArea CLEANED - FAILED]');
                    Log::info($trimmedContent);
                    Log::info('--------------------------------');
                }
                return $rawContent;
            } else {
                if ($isDebugTextArea) {
                    Log::info('[TextArea Debug] JSON decoded successfully.');
                }
            }

            return $trimmedContent;
        } else {
            return $rawContent;
        }
    }

    public static function disk($name = null)
    {
        return parent::disk($name ?? static::getDefaultDriver());
    }

    public static function exists($path)
    {
        return parent::disk(static::getDefaultDriver())->exists($path);
    }

    public static function put($path, $contents)
    {
        return parent::disk(static::getDefaultDriver())->put($path, $contents);
    }

    public static function delete($path)
    {
        return parent::disk(static::getDefaultDriver())->delete($path);
    }

    public static function path($path)
    {
        return parent::disk(static::getDefaultDriver())->path($path);
    }
}
