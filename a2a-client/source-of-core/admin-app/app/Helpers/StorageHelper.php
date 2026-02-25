<?php

namespace App\Helpers;

use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StringHelper;
use App\Helpers\UrlHelper;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class StorageHelper
{
    /**
     * Initialize a storage disk.
     *
     * @param string $diskName
     * @param string $relativeBasePath
     * @return FilesystemAdapter
     * @throws InvalidArgumentException
     */
    public static function initDisk(string $diskName, string $relativeBasePath): FilesystemAdapter
    {
        $relativeBasePath = StringHelper::trim($relativeBasePath, '/');

        LogHelper::debug('StorageHelper::initDisk', 'Initializing disk', [
            'disk' => $diskName,
            'path' => $relativeBasePath
        ]);

        try {
            $disk = Storage::disk($diskName);
        } catch (InvalidArgumentException $e) {
            LogHelper::critical('StorageHelper::initDisk', 'Failed to get disk', [
                'disk' => $diskName,
                'error' => $e->getMessage()
            ]);
            throw new InvalidArgumentException("Storage disk '{$diskName}' is not configured.", 0, $e);
        }

        if (!$disk->exists($relativeBasePath)) {
            LogHelper::warning('StorageHelper::initDisk', 'Base path directory does not exist', [
                'disk' => $diskName,
                'path' => $relativeBasePath
            ]);
            try {
                $disk->makeDirectory($relativeBasePath);
                LogHelper::info('StorageHelper::initDisk', 'Successfully created base path directory', [
                    'disk' => $diskName,
                    'path' => $relativeBasePath
                ]);
            } catch (\Exception $e) {
                LogHelper::error('StorageHelper::initDisk', 'Failed to create base path directory', [
                    'disk' => $diskName,
                    'path' => $relativeBasePath,
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        } else {
            LogHelper::debug('StorageHelper::initDisk', 'Base path directory exists', [
                'disk' => $diskName,
                'path' => $relativeBasePath
            ]);
        }

        return $disk;
    }

    /**
     * Get data from cache.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function getFromCache(string $key, $default = null)
    {
        $data = Cache::get($key, $default);
        LogHelper::debug('StorageHelper::getFromCache', 'Loaded data from cache', [
            'key' => $key,
            'count' => is_array($data) ? count($data) : 1
        ]);
        return $data;
    }

    /**
     * Save data to cache.
     *
     * @param string $key
     * @param mixed $data
     * @param int $minutes
     * @return bool
     */
    public static function saveToCache(string $key, $data, int $minutes = 60): bool
    {
        $result = Cache::put($key, $data, now()->addMinutes($minutes));
        LogHelper::debug('StorageHelper::saveToCache', 'Saved data to cache', [
            'key' => $key,
            'count' => is_array($data) ? count($data) : 1,
            'minutes' => $minutes
        ]);
        return $result;
    }

    /**
     * Get storage path for a slug.
     *
     * @param string $basePath
     * @param string $slug
     * @return string
     */
    public static function getStoragePath(string $basePath, string $slug): string
    {
        $slug = UrlHelper::normalizeSlug($slug);
        $path = PathHelper::join($basePath, $slug . '.json');
        $path = StringHelper::normalizePath($path);
        LogHelper::debug('StorageHelper::getStoragePath', 'Generated storage path', [
            'basePath' => $basePath,
            'slug' => $slug,
            'path' => $path
        ]);
        return $path;
    }

    /**
     * Read and decode JSON file.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @return array|null
     */
    public static function readJsonFile(FilesystemAdapter $disk, string $path): ?array
    {
        try {
            if (!$disk->exists($path)) {
                LogHelper::warning('StorageHelper::readJsonFile', 'File does not exist', [
                    'path' => $path
                ]);
                return null;
            }

            $content = $disk->get($path);
            $data = JsonHelper::decode($content);

            if (!ArrayHelper::isAssociative($data)) {
                LogHelper::error('StorageHelper::readJsonFile', 'Invalid JSON data format', [
                    'path' => $path
                ]);
                return null;
            }

            LogHelper::debug('StorageHelper::readJsonFile', 'Successfully read JSON file', [
                'path' => $path
            ]);

            return $data;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::readJsonFile', 'Failed to read JSON file', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Write JSON file.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @param array $data
     * @return bool
     */
    public static function writeJsonFile(FilesystemAdapter $disk, string $path, array $data): bool
    {
        try {
            $content = JsonHelper::encode($data, JSON_PRETTY_PRINT);
            $result = $disk->put($path, $content);

            LogHelper::debug('StorageHelper::writeJsonFile', 'Successfully wrote JSON file', [
                'path' => $path,
                'result' => $result
            ]);

            return $result;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::writeJsonFile', 'Failed to write JSON file', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Delete file.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @return bool
     */
    public static function deleteFile(FilesystemAdapter $disk, string $path): bool
    {
        try {
            if (!$disk->exists($path)) {
                LogHelper::warning('StorageHelper::deleteFile', 'File does not exist', [
                    'path' => $path
                ]);
                return false;
            }

            $result = $disk->delete($path);

            LogHelper::debug('StorageHelper::deleteFile', 'Successfully deleted file', [
                'path' => $path,
                'result' => $result
            ]);

            return $result;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::deleteFile', 'Failed to delete file', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * List files in directory.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @param bool $recursive
     * @return array
     */
    public static function listFiles(FilesystemAdapter $disk, string $path, bool $recursive = false): array
    {
        try {
            $files = $disk->files($path, $recursive);

            LogHelper::debug('StorageHelper::listFiles', 'Successfully listed files', [
                'path' => $path,
                'recursive' => $recursive,
                'count' => count($files)
            ]);

            return $files;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::listFiles', 'Failed to list files', [
                'path' => $path,
                'recursive' => $recursive,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * List directories.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @param bool $recursive
     * @return array
     */
    public static function listDirectories(FilesystemAdapter $disk, string $path, bool $recursive = false): array
    {
        try {
            $directories = $disk->directories($path, $recursive);

            LogHelper::debug('StorageHelper::listDirectories', 'Successfully listed directories', [
                'path' => $path,
                'recursive' => $recursive,
                'count' => count($directories)
            ]);

            return $directories;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::listDirectories', 'Failed to list directories', [
                'path' => $path,
                'recursive' => $recursive,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Check if file exists.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @return bool
     */
    public static function fileExists(FilesystemAdapter $disk, string $path): bool
    {
        try {
            $exists = $disk->exists($path);

            LogHelper::debug('StorageHelper::fileExists', 'Checked file existence', [
                'path' => $path,
                'exists' => $exists
            ]);

            return $exists;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::fileExists', 'Failed to check file existence', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get file size.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @return int|null
     */
    public static function getFileSize(FilesystemAdapter $disk, string $path): ?int
    {
        try {
            if (!$disk->exists($path)) {
                LogHelper::warning('StorageHelper::getFileSize', 'File does not exist', [
                    'path' => $path
                ]);
                return null;
            }

            $size = $disk->size($path);

            LogHelper::debug('StorageHelper::getFileSize', 'Got file size', [
                'path' => $path,
                'size' => $size
            ]);

            return $size;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::getFileSize', 'Failed to get file size', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get file last modified time.
     *
     * @param FilesystemAdapter $disk
     * @param string $path
     * @return int|null
     */
    public static function getLastModified(FilesystemAdapter $disk, string $path): ?int
    {
        try {
            if (!$disk->exists($path)) {
                LogHelper::warning('StorageHelper::getLastModified', 'File does not exist', [
                    'path' => $path
                ]);
                return null;
            }

            $time = $disk->lastModified($path);

            LogHelper::debug('StorageHelper::getLastModified', 'Got last modified time', [
                'path' => $path,
                'time' => $time
            ]);

            return $time;

        } catch (\Exception $e) {
            LogHelper::error('StorageHelper::getLastModified', 'Failed to get last modified time', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
} 