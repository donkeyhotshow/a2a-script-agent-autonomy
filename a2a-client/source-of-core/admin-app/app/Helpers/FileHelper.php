<?php

namespace App\Helpers;

use Exception;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

class FileHelper
{
    private static $logger = null;

    public static function isAccessible(string $path): bool
    {
        return is_readable($path) && is_writable($path);
    }
    public static function setLogger(callable $logger): void
    {
        self::$logger = $logger;
    }

    private static function log(string $level, string $message, array $context = []): void
    {
        if (self::$logger) {
            call_user_func(self::$logger, $level, $message, $context);
        }
    }

    /**
     * Ensure directory exists, create if it doesn't.
     */
    public static function ensureDirectoryExists(string $path, int $mode = 0775): bool
    {
        if (!file_exists($path)) {
            return self::makeDirectory($path, $mode, true);
        }
        return is_dir($path);
    }

    /**
     * Get all files in a directory recursively.
     */
    public static function allFiles(string $directory): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    /**
     * Get all files in a directory.
     */
    public static function files(string $directory): array
    {
        $files = [];
        $iterator = new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS);

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    /**
     * Find files matching patterns.
     */
    public static function findFiles(string $directory, array $patterns): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                foreach ($patterns as $pattern) {
                    if (fnmatch($pattern, $file->getFilename())) {
                        $files[] = $file->getPathname();
                        break;
                    }
                }
            }
        }

        return $files;
    }

    /**
     * Read file content.
     */
    public static function get(string $path): string
    {
        if (!file_exists($path)) {
            throw new Exception("File not found: {$path}");
        }

        $content = file_get_contents($path);
        if ($content === false) {
            throw new Exception("Failed to read file: {$path}");
        }

        return $content;
    }

    /**
     * Write content to file.
     */
    public static function put(string $path, string $content): bool
    {
        $directory = dirname($path);
        if (!self::ensureDirectoryExists($directory)) {
            self::log('error', "[FileHelper::put] Failed to create directory: {$directory}");
            return false;
        }

        return file_put_contents($path, $content) !== false;
    }

    /**
     * Read JSON file.
     */
    public static function getJson(string $path): array
    {
        return JsonHelper::decode(self::get($path));
    }

    /**
     * Write JSON to file.
     */
    public static function putJson(string $path, $data): bool
    {
        return self::put($path, JsonHelper::encode($data));
    }

    /**
     * Recursively copy a directory.
     */
    public static function copyDirectory(string $source, string $destination, bool $overwrite = false): bool
    {
        if (!is_dir($source)) {
            self::log('error', "[FileHelper::copyDirectory] Source directory does not exist or is not a directory: {$source}");
            return false;
        }

        if (!self::ensureDirectoryExists($destination)) {
            self::log('error', "[FileHelper::copyDirectory] Failed to create destination directory: {$destination}");
            return false;
        }

        if (!$overwrite && is_dir($destination) && count(self::getAllFiles($destination)) > 0) {
            self::log('warning', "[FileHelper::copyDirectory] Destination directory {$destination} exists and is not empty. Overwrite is false.");
            return false;
        }

        try {
            if ($overwrite && is_dir($destination)) {
                if (!self::deleteDirectory($destination)) {
                    self::log('error', "[FileHelper::copyDirectory] Failed to delete destination directory for overwrite: {$destination}");
                    return false;
                }
                if (!self::ensureDirectoryExists($destination)) {
                    self::log('error', "[FileHelper::copyDirectory] Failed to re-create destination directory after delete: {$destination}");
                    return false;
                }
            }

            $items = self::getAllFiles($source);
            foreach ($items as $item) {
                $sourcePath = $item;
                $relativePath = substr($sourcePath, strlen($source) + 1);
                $destinationPath = rtrim($destination, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;

                $destinationDir = dirname($destinationPath);
                if (!self::ensureDirectoryExists($destinationDir)) {
                    self::log('error', "[FileHelper::copyDirectory] Manual copy: Failed to create directory {$destinationDir}");
                    return false;
                }

                if ($overwrite || !file_exists($destinationPath)) {
                    if (!copy($sourcePath, $destinationPath)) {
                        self::log('error', "[FileHelper::copyDirectory] Manual copy: Failed to copy {$sourcePath} to {$destinationPath}");
                        return false;
                    }
                }
            }

            $directories = self::getAllDirectories($source);
            foreach ($directories as $directory) {
                $relativePath = substr($directory, strlen($source) + 1);
                $destinationPath = rtrim($destination, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;
                if (!self::ensureDirectoryExists($destinationPath)) {
                    self::log('error', "[FileHelper::copyDirectory] Manual copy: Failed to create directory {$destinationPath} for empty dir");
                    return false;
                }
            }

        } catch (\Exception $e) {
            self::log('error', "[FileHelper::copyDirectory] Exception during directory copy: " . $e->getMessage(), ['source' => $source, 'destination' => $destination]);
            return false;
        }
        return true;
    }

    /**
     * Recursively delete a directory.
     */
    public static function deleteDirectory(string $directory): bool
    {
        if (!file_exists($directory)) {
            return true;
        }

        if (!is_dir($directory)) {
            self::log('error', "[FileHelper::deleteDirectory] Path is not a directory: {$directory}");
            return false;
        }

        try {
            $items = new \FilesystemIterator($directory);
            foreach ($items as $item) {
                if ($item->isDir() && !$item->isLink()) {
                    self::deleteDirectory($item->getPathname());
                } else {
                    unlink($item->getPathname());
                }
            }
            return rmdir($directory);
        } catch (\Exception $e) {
            self::log('error', "[FileHelper::deleteDirectory] Exception during directory deletion: " . $e->getMessage(), ['directory' => $directory]);
            return false;
        }
    }

    /**
     * Copy a list of files and directories from a source to a destination.
     */
    public static function copyItems(string $sourceDir, string $destinationDir, array $items, bool $overwrite = false): bool
    {
        $sourceDir = rtrim($sourceDir, DIRECTORY_SEPARATOR);
        $destinationDir = rtrim($destinationDir, DIRECTORY_SEPARATOR);

        if (!is_dir($sourceDir)) {
            self::log('error', "[FileHelper::copyItems] Source directory is not valid: {$sourceDir}");
            return false;
        }

        if (!self::ensureDirectoryExists($destinationDir)) {
            self::log('error', "[FileHelper::copyItems] Failed to create destination directory: {$destinationDir}");
            return false;
        }
        
        foreach ($items as $itemPath) {
            $itemPath = ltrim($itemPath, DIRECTORY_SEPARATOR);
            $fullSourcePath = $sourceDir . DIRECTORY_SEPARATOR . $itemPath;
            $fullDestinationPath = $destinationDir . DIRECTORY_SEPARATOR . $itemPath;

            if (!file_exists($fullSourcePath)) {
                self::log('warning', "[FileHelper::copyItems] Source item does not exist: {$fullSourcePath}");
                continue;
            }

            $itemDestDir = dirname($fullDestinationPath);
            if (!self::ensureDirectoryExists($itemDestDir)) {
                self::log('error', "[FileHelper::copyItems] Failed to create item destination directory: {$itemDestDir}");
                return false;
            }

            if (is_dir($fullSourcePath)) {
                if (!self::copyDirectory($fullSourcePath, $fullDestinationPath, $overwrite)) {
                    self::log('error', "[FileHelper::copyItems] Failed to copy directory item: {$itemPath}");
                    return false;
                }
            } else {
                if ($overwrite || !file_exists($fullDestinationPath)) {
                    if (!copy($fullSourcePath, $fullDestinationPath)) {
                        self::log('error', "[FileHelper::copyItems] Failed to copy file item: {$itemPath}");
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Delete a list of files and directories from a base directory.
     */
    public static function deleteItems(string $baseDir, array $items): bool
    {
        $baseDir = rtrim($baseDir, DIRECTORY_SEPARATOR);
        foreach ($items as $itemPath) {
            $itemPath = ltrim($itemPath, DIRECTORY_SEPARATOR);
            $fullPath = $baseDir . DIRECTORY_SEPARATOR . $itemPath;

            if (!file_exists($fullPath)) {
                continue;
            }

            if (is_dir($fullPath)) {
                if (!self::deleteDirectory($fullPath)) {
                    self::log('error', "[FileHelper::deleteItems] Failed to delete directory item: {$itemPath}");
                    return false;
                }
            } else {
                if (!unlink($fullPath)) {
                    self::log('error', "[FileHelper::deleteItems] Failed to delete file item: {$itemPath}");
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Get all files in a directory recursively.
     */
    public static function getAllFiles(string $directory): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    /**
     * Get all directories in a directory recursively.
     */
    public static function getAllDirectories(string $directory): array
    {
        $directories = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                $directories[] = $file->getPathname();
            }
        }

        return $directories;
    }

    /**
     * Check if file exists.
     */
    public static function exists(string $path): bool
    {
        return file_exists($path);
    }

    /**
     * Check if path is a directory.
     */
    public static function isDirectory(string $path): bool
    {
        return is_dir($path);
    }

    /**
     * Create a directory.
     */
    public static function makeDirectory(string $path, int $mode = 0775, bool $recursive = true): bool
    {
        return mkdir($path, $mode, $recursive);
    }

    /**
     * Delete a file.
     */
    public static function delete(string $path): bool
    {
        return unlink($path);
    }

    /**
     * Copy a file.
     */
    public static function copy(string $source, string $destination): bool
    {
        return copy($source, $destination);
    }

    /**
     * Move a file.
     */
    public static function move(string $source, string $destination): bool
    {
        return rename($source, $destination);
    }

    /**
     * Get file size.
     */
    public static function size(string $path): int
    {
        return filesize($path);
    }

    /**
     * Get file last modified time.
     */
    public static function lastModified(string $path): int
    {
        return filemtime($path);
    }

    /**
     * Get file permissions.
     */
    public static function permissions(string $path): int
    {
        return fileperms($path);
    }

    /**
     * Change file permissions.
     */
    public static function chmod(string $path, int $mode): bool
    {
        return chmod($path, $mode);
    }

    /**
     * Get file owner.
     */
    public static function owner(string $path): int
    {
        return fileowner($path);
    }

    /**
     * Get file group.
     */
    public static function group(string $path): int
    {
        return filegroup($path);
    }

    /**
     * Change file owner.
     */
    public static function chown(string $path, int $user): bool
    {
        return chown($path, $user);
    }

    /**
     * Change file group.
     */
    public static function chgrp(string $path, int $group): bool
    {
        return chgrp($path, $group);
    }
} 