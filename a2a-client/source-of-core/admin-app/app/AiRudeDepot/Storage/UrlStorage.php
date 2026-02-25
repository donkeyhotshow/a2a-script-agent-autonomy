<?php

namespace App\AiRudeDepot\Storage;

use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\StorageHelper;
use App\Helpers\StringHelper;
use App\Helpers\UrlHelper;
use Exception;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Throwable;

class UrlStorage
{
    protected FilesystemAdapter $disk;
    protected string $basePath;
    protected array $permalinks = [];
    protected string $cacheKey = 'url_storage_permalinks';

    /**
     * Initialize the URL storage
     */
    public function __construct(string $diskName = 'local', string $relativeBasePath = 'permalinks')
    {
        $this->disk = StorageHelper::initDisk($diskName, $relativeBasePath);
        $this->basePath = $relativeBasePath;
        $this->loadPermalinksFromCache();
    }

    /**
     * Load permalinks from cache
     */
    protected function loadPermalinksFromCache(): void
    {
        $this->permalinks = StorageHelper::getFromCache($this->cacheKey, []);
        LogHelper::debug('UrlStorage::loadPermalinksFromCache', 'Loaded permalinks from cache', [
            'count' => count($this->permalinks)
        ]);
    }

    /**
     * Resolve a module path from a slug
     */
    public function resolvePathFromSlug(string $slug): ?string
    {
        $slug = UrlHelper::normalizeSlug($slug);
        $path = ArrayHelper::get($this->permalinks, $slug);

        if ($path) {
            LogHelper::debug('UrlStorage::resolvePathFromSlug', 'Resolved path from slug', [
                'slug' => $slug,
                'path' => $path
            ]);
            return $path;
        }

        LogHelper::warning('UrlStorage::resolvePathFromSlug', 'Path not found for slug', [
            'slug' => $slug
        ]);
        return null;
    }

    /**
     * Look up path in filesystem
     */
    protected function lookupPathInFileSystem(string $slug): ?array
    {
        $path = StorageHelper::getStoragePath($this->basePath, $slug);
        
        if (!StorageHelper::fileExists($this->disk, $path)) {
            LogHelper::warning('UrlStorage::lookupPathInFileSystem', 'File does not exist', [
                'slug' => $slug,
                'path' => $path
            ]);
            return null;
        }

        $data = StorageHelper::readJsonFile($this->disk, $path);
        
        if (!$data) {
            LogHelper::error('UrlStorage::lookupPathInFileSystem', 'Failed to read JSON file', [
                'slug' => $slug,
                'path' => $path
            ]);
            return null;
        }

        LogHelper::debug('UrlStorage::lookupPathInFileSystem', 'Successfully read file', [
            'slug' => $slug,
            'path' => $path
        ]);

        return $data;
    }

    /**
     * Create a new permalink
     */
    public function createPermalink(string $slug, string $path, array $metadata = []): bool
    {
        $slug = UrlHelper::normalizeSlug($slug);
        $path = StringHelper::normalizePath($path);

        if (empty($slug) || empty($path)) {
            LogHelper::error('UrlStorage::createPermalink', 'Invalid slug or path', [
                'slug' => $slug,
                'path' => $path
            ]);
            return false;
        }

        if (isset($this->permalinks[$slug])) {
            LogHelper::warning('UrlStorage::createPermalink', 'Permalink already exists', [
                'slug' => $slug,
                'path' => $path
            ]);
            return false;
        }

        $data = array_merge($metadata, [
            'path' => $path,
            'created_at' => time(),
            'updated_at' => time()
        ]);

        $storagePath = StorageHelper::getStoragePath($this->basePath, $slug);
        
        if (!StorageHelper::writeJsonFile($this->disk, $storagePath, $data)) {
            LogHelper::error('UrlStorage::createPermalink', 'Failed to write JSON file', [
                'slug' => $slug,
                'path' => $storagePath
            ]);
            return false;
        }

        $this->permalinks[$slug] = $path;
        StorageHelper::saveToCache($this->cacheKey, $this->permalinks);

        LogHelper::info('UrlStorage::createPermalink', 'Successfully created permalink', [
            'slug' => $slug,
            'path' => $path
        ]);

        return true;
    }

    /**
     * Update an existing permalink
     */
    public function updatePermalink(string $slug, string $path, array $metadata = []): bool
    {
        $slug = UrlHelper::normalizeSlug($slug);
        $path = StringHelper::normalizePath($path);

        if (empty($slug) || empty($path)) {
            LogHelper::error('UrlStorage::updatePermalink', 'Invalid slug or path', [
                'slug' => $slug,
                'path' => $path
            ]);
            return false;
        }

        if (!isset($this->permalinks[$slug])) {
            LogHelper::warning('UrlStorage::updatePermalink', 'Permalink does not exist', [
                'slug' => $slug,
                'path' => $path
            ]);
            return false;
        }

        $data = array_merge($metadata, [
            'path' => $path,
            'updated_at' => time()
        ]);

        $storagePath = StorageHelper::getStoragePath($this->basePath, $slug);
        
        if (!StorageHelper::writeJsonFile($this->disk, $storagePath, $data)) {
            LogHelper::error('UrlStorage::updatePermalink', 'Failed to write JSON file', [
                'slug' => $slug,
                'path' => $storagePath
            ]);
            return false;
        }

        $this->permalinks[$slug] = $path;
        StorageHelper::saveToCache($this->cacheKey, $this->permalinks);

        LogHelper::info('UrlStorage::updatePermalink', 'Successfully updated permalink', [
            'slug' => $slug,
            'path' => $path
        ]);

        return true;
    }

    /**
     * Delete a permalink
     */
    public function deletePermalink(string $slug): bool
    {
        $slug = UrlHelper::normalizeSlug($slug);

        if (!isset($this->permalinks[$slug])) {
            LogHelper::warning('UrlStorage::deletePermalink', 'Permalink does not exist', [
                'slug' => $slug
            ]);
            return false;
        }

        $storagePath = StorageHelper::getStoragePath($this->basePath, $slug);
        
        if (!StorageHelper::deleteFile($this->disk, $storagePath)) {
            LogHelper::error('UrlStorage::deletePermalink', 'Failed to delete file', [
                'slug' => $slug,
                'path' => $storagePath
            ]);
            return false;
        }

        unset($this->permalinks[$slug]);
        StorageHelper::saveToCache($this->cacheKey, $this->permalinks);

        LogHelper::info('UrlStorage::deletePermalink', 'Successfully deleted permalink', [
            'slug' => $slug
        ]);

        return true;
    }

    /**
     * Get all permalinks
     */
    public function getAllPermalinks(): array
    {
        LogHelper::debug('UrlStorage::getAllPermalinks', 'Getting all permalinks', [
            'count' => count($this->permalinks)
        ]);
        return $this->permalinks;
    }

    /**
     * Get a specific permalink by slug
     */
    public function getPermalink(string $slug): ?array
    {
        $slug = UrlHelper::normalizeSlug($slug);
        return $this->lookupPathInFileSystem($slug);
    }

    /**
     * Get the storage disk instance
     */
    public function getDisk(): FilesystemAdapter
    {
        return $this->disk;
    }

    /**
     * Get the relative base path
     */
    public function getRelativeBasePath(): string
    {
        return $this->basePath;
    }

    /**
     * Save a permalink with data
     */
    public function savePermalink(array $data): bool
    {
        if (!isset($data['slug']) || !isset($data['path'])) {
            LogHelper::error('UrlStorage::savePermalink', 'Missing required fields', [
                'data' => $data
            ]);
            return false;
        }

        $slug = UrlHelper::normalizeSlug($data['slug']);
        $path = StringHelper::normalizePath($data['path']);

        if (!$this->isValidSlug($slug)) {
            LogHelper::error('UrlStorage::savePermalink', 'Invalid slug format', [
                'slug' => $slug
            ]);
            return false;
        }

        $metadata = array_diff_key($data, array_flip(['slug', 'path']));
        $storagePath = StorageHelper::getStoragePath($this->basePath, $slug);

        $data = array_merge($metadata, [
            'path' => $path,
            'updated_at' => time()
        ]);

        if (!isset($this->permalinks[$slug])) {
            $data['created_at'] = time();
        }

        if (!StorageHelper::writeJsonFile($this->disk, $storagePath, $data)) {
            LogHelper::error('UrlStorage::savePermalink', 'Failed to write JSON file', [
                'slug' => $slug,
                'path' => $storagePath
            ]);
            return false;
        }

        $this->permalinks[$slug] = $path;
        StorageHelper::saveToCache($this->cacheKey, $this->permalinks);

        LogHelper::info('UrlStorage::savePermalink', 'Successfully saved permalink', [
            'slug' => $slug,
            'path' => $path
        ]);

        return true;
    }

    /**
     * Get module by path
     */
    public function getModuleByPath(string $path): ?array
    {
        $path = StringHelper::normalizePath($path);
        $slug = array_search($path, $this->permalinks);

        if ($slug === false) {
            LogHelper::warning('UrlStorage::getModuleByPath', 'Path not found', [
                'path' => $path
            ]);
            return null;
            }

        return $this->getPermalink($slug);
    }

    /**
     * Check if a slug is valid
     */
    protected function isValidSlug(string $slug): bool
    {
        return preg_match('/^[a-z0-9-]+$/', $slug) === 1;
        }
} 