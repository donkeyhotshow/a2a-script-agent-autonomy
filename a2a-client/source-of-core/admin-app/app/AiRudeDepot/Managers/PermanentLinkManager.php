<?php

namespace App\AiRudeDepot\Managers;

use App\Helpers\UrlHelper;
use App\AiRudeDepot\Storage\UrlStorage;
use App\Hooks\FileFacade;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PermanentLinkManager
{
    protected $permalinks = [];
    protected UrlStorage $urlStorage;
    protected $cacheDuration = 60; // minutes
    protected $cacheKey = 'permanent_links';
    protected array $originalPermalinks = []; // For restoring after override
    protected bool $isOverridden = false; // Flag to check override state

    /**
     * Initialize the permanent link manager
     * Accepts UrlStorage via dependency injection.
     */
    public function __construct(UrlStorage $urlStorage)
    {
        $this->urlStorage = $urlStorage;
        $this->loadPermalinks();
    }

    /**
     * Load permalinks from cache or json-ui
     *
     * @return void
     */
    protected function loadPermalinks()
    {
        // Always load directly from UrlStorage, which handles its own caching/reloading
        Log::debug("[PermanentLinkManager::loadPermalinks] Loading directly from UrlStorage->getAllPermalinks()");
        $this->permalinks = $this->urlStorage->getAllPermalinks();
        // No need to save back to Laravel application cache here, rely on UrlStorage/reload logic
        // $this->saveToCache();
        Log::debug("[PermanentLinkManager::loadPermalinks] Loaded " . count($this->permalinks) . " permalinks into memory.");
    }

    /**
     * Get all registered permalinks
     *
     * @return array The permalinks
     */
    public function getAllPermalinks()
    {
        return $this->permalinks;
    }

    /**
     * Delete a permalink
     *
     * @param string $path The URL path
     * @return bool Success status
     */
    public function deletePermalink($path)
    {
        // Normalize path
        $path = UrlHelper::normalizeSlug($path);

        // Check if permalink exists
        if (!isset($this->permalinks[$path]) && !$this->urlStorage->slugExists($path)) {
            return false;
        }

        // Remove from memory cache
        if (isset($this->permalinks[$path])) {
            unset($this->permalinks[$path]);
        }

        // Remove from persistent storage
        $success = $this->urlStorage->deletePermalink($path);

        // Update application cache
        if ($success) {
            $this->saveToCache();
        }

        return $success;
    }

    /**
     * Save permalinks to cache
     *
     * @return void
     */
    protected function saveToCache()
    {
        Cache::put($this->cacheKey, $this->permalinks, $this->cacheDuration);
    }

    /**
     * Resolve a URL path to a module
     *
     * @param string $path The URL path
     * @return string|null The target module or null if not found
     */
    public function resolvePathToModule($path)
    {
        // Normalize path
        $path = UrlHelper::normalizeSlug($path);

        // First, try exact match in memory cache
        if (isset($this->permalinks[$path])) {
            return $this->permalinks[$path]['module'];
        }

        // If not found, check for hierarchical path handling
        $parts = explode('/', $path);
        $currentPath = '';

        for ($i = 0; $i < count($parts); $i++) {
            if ($i > 0) {
                $currentPath .= '/';
            }
            $currentPath .= $parts[$i];

            if (isset($this->permalinks[$currentPath])) {
                if ($currentPath === $path) {
                    return $this->permalinks[$currentPath]['module'];
                }

                if ($this->permalinks[$currentPath]['handles_subpaths']) {
                    return $this->permalinks[$currentPath]['module'];
                }
            }
        }

        // If not found in memory, ask storage
        return $this->urlStorage->resolvePathFromSlug($path);
    }

    /**
     * Reload all permalinks from storage
     *
     * @return void
     */
    public function reloadPermalinks()
    {
        $this->urlStorage->reloadPermalinksFromFileSystem();
        $this->permalinks = $this->urlStorage->getAllPermalinks();
        $this->saveToCache();
    }

    /**
     * Get metadata for a specific permalink
     *
     * @param string $path The URL path
     * @return array|null The permalink metadata or null if not found
     */
    public function getMetadata($path)
    {
        // Normalize path
        $path = UrlHelper::normalizeSlug($path);

        if (isset($this->permalinks[$path])) {
            return $this->permalinks[$path]['metadata'] ?? [];
        }

        $permalink = $this->urlStorage->getPermalink($path);
        return $permalink ? ($permalink['metadata'] ?? []) : null;
    }

    /**
     * Get a specific permalink by path
     *
     * @param string $path The URL path
     * @return array|null The permalink data or null if not found
     */
    public function getPermalink(string $path)
    {
        Log::debug("[PermanentLinkManager::getPermalink] Attempting to get permalink for path: '{$path}'");
        $normalizedPath = UrlHelper::normalizeSlug($path);
        Log::debug("[PermanentLinkManager::getPermalink] Normalized path: '{$normalizedPath}'");

        // Ensure permalinks are loaded
        if (empty($this->permalinks)) {
            $this->loadPermalinks();
            Log::debug("[PermanentLinkManager::getPermalink] Permalinks were empty, loaded now.", ['count' => count($this->permalinks)]);
        }

        // FIX: Iterate through loaded permalinks to find a match based on the 'path' value
        foreach ($this->permalinks as $key => $permalinkData) {
            // Normalize the path stored in the permalink data for comparison
            $storedPathNormalized = isset($permalinkData['path']) ? UrlHelper::normalizeSlug($permalinkData['path']) : null;

            if ($storedPathNormalized === $normalizedPath) {
                Log::debug("[PermanentLinkManager::getPermalink] Found match for '{$normalizedPath}' by checking 'path' value in key '{$key}'.", $permalinkData);
                return $permalinkData;
            }
        }

        Log::debug("[PermanentLinkManager::getPermalink] No exact match found for '{$normalizedPath}' by checking 'path' values. Checking parent paths.");

        // If no direct match, check for parent handlers (this logic might need review with the iteration change)
        // This parent check might ALSO need to compare against the 'path' value, not the key.
        $parentPath = UrlHelper::findParentPath($normalizedPath);
        while ($parentPath) {
            Log::debug("[PermanentLinkManager::getPermalink] Checking parent path: '{$parentPath}'");
            // FIX: Iterate to check parent paths based on 'path' value too
            $foundParent = null;
            foreach ($this->permalinks as $key => $permalinkData) {
                $storedPathNormalized = isset($permalinkData['path']) ? UrlHelper::normalizeSlug($permalinkData['path']) : null;
                if ($storedPathNormalized === $parentPath) {
                    $foundParent = $permalinkData;
                    Log::debug("[PermanentLinkManager::getPermalink] Found potential parent match for '{$parentPath}' in key '{$key}'", $foundParent);
                    break;
                }
            }

            if ($foundParent) {
                $parentData = $foundParent;
                if (!empty($parentData['handles_subpaths'])) {
                    Log::debug("[PermanentLinkManager::getPermalink] Found parent '{$parentPath}' that handles subpaths.", $parentData);
                    return $parentData;
                }
            }
            $parentPath = UrlHelper::findParentPath($parentPath);
        }

        Log::warning("[PermanentLinkManager::getPermalink] Permalink not found for path: '{$path}' (normalized: '{$normalizedPath}') after checking parents.");
        return null;
    }

    /**
     * Find parent path for a given path
     *
     * @param string $path The URL path
     * @return string|null The parent path or null if not found
     */
    public function findParentPath($path)
    {
        return UrlHelper::findParentPath($path);
    }

    /**
     * Get the module class for a permalink
     *
     * @param string $path The URL path
     * @return string|null The module class or null if not found
     */
    public function getModuleClass($path)
    {
        $permalink = $this->getPermalink($path);
        return $permalink['metadata']['module_class'] ?? null;
    }

    /**
     * Get the required access level for a permalink
     *
     * @param string $path The URL path
     * @return string The required access level (default: 'public')
     */
    public function getRequiredAccess($path)
    {
        $permalink = $this->getPermalink($path);
        return $permalink['metadata']['required_access'] ?? 'public';
    }

    /**
     * Register a module class for a permalink
     *
     * @param string $path The URL path
     * @param string $moduleClass The module class name
     * @param string $requiredAccess The required access level (default: 'public')
     * @return bool Success status
     */
    public function registerModuleClass($path, $moduleClass, $requiredAccess = 'public')
    {
        $permalink = $this->getPermalink($path);

        if (!$permalink) {
            return false;
        }

        // Update metadata
        $metadata = $permalink['metadata'] ?? [];
        $metadata['module_class'] = $moduleClass;
        $metadata['required_access'] = $requiredAccess;

        return $this->updatePermalink($path, ['metadata' => $metadata]);
    }

    /**
     * Update an existing permalink
     *
     * @param string $path The URL path
     * @param array $data Updated data
     * @return bool Success status
     */
    public function updatePermalink($path, $data)
    {
        // Normalize path
        $path = UrlHelper::normalizeSlug($path);

        // Check if permalink exists
        if (!isset($this->permalinks[$path]) && !$this->urlStorage->slugExists($path)) {
            return false;
        }

        // Update in memory cache
        if (isset($this->permalinks[$path])) {
            $this->permalinks[$path] = array_merge($this->permalinks[$path], $data);
        } else {
            $permalink = $this->urlStorage->getPermalink($path);
            if ($permalink) {
                $this->permalinks[$path] = array_merge($permalink, $data);
            }
        }

        // Update in persistent storage
        $success = $this->urlStorage->updatePermalink($path, $data);

        // Update application cache
        if ($success) {
            $this->saveToCache();
        }

        return $success;
    }

    /**
     * Register a new module with permalink
     *
     * @param string $path The URL path
     * @param string $moduleName The module name
     * @param string $moduleClass The module class name
     * @param array $additionalMetadata Additional metadata
     * @param bool $handlesSubpaths Whether this permalink handles subpaths
     * @param string $requiredAccess The required access level (default: 'public')
     * @return bool Success status
     */
    public function registerModule($path, $moduleName, $moduleClass, $additionalMetadata = [], $handlesSubpaths = false, $requiredAccess = 'public')
    {
        // Prepare metadata
        $metadata = array_merge($additionalMetadata, [
            'module_class' => $moduleClass,
            'required_access' => $requiredAccess
        ]);

        // Register permalink
        return $this->registerPermalink($path, $moduleName, $metadata, $handlesSubpaths);
    }

    /**
     * Register a new permalink
     *
     * @param string $path The URL path
     * @param string $module The target module
     * @param array $metadata Additional metadata
     * @param bool $handlesSubpaths Whether this permalink handles subpaths
     * @return bool Success status
     */
    public function registerPermalink($path, $module, $metadata = [], $handlesSubpaths = false)
    {
        // Normalize path
        $path = UrlHelper::normalizeSlug($path);

        // Validate path
        if (empty($path) || !UrlHelper::isValidSlug($path)) {
            return false;
        }

        // Standardize module name
        $module = UrlHelper::standardizeModuleName($module);

        // Store in memory cache first
        $this->permalinks[$path] = [
            'module' => $module,
            'metadata' => $metadata,
            'handles_subpaths' => $handlesSubpaths,
            'registered_at' => date('Y-m-d H:i:s')
        ];

        // Save to persistent storage
        $success = $this->urlStorage->createPermalink($path, $module, $metadata, $handlesSubpaths);

        // Update application cache
        if ($success) {
            $this->saveToCache();
        }

        return $success;
    }

    public function savePermalink(array $permalink): bool
    {
        // Сформировать путь для сохранения пермалинка,
        // используя значение 'path' из $permalink и сохраняя формат JSON.
        $slug = trim($permalink['path'], '/');
        $storagePath = storage_path("ai/permalinks/{$slug}.json");

        // Убедимся, что директория существует
        $dir = dirname($storagePath);
        if (!FileFacade::exists($dir)) {
            FileFacade::makeDirectory($dir, 0777, true);
        }

        try {
            FileFacade::put($storagePath, json_encode($permalink, JSON_PRETTY_PRINT));
            return true;
        } catch (Exception $e) {

            // Log::error("Ошибка при сохранении пермалинка: " . $e->getMessage(), ['permalink' => $permalink]);
            throw $e;
            return false;
        }
    }

    /**
     * Overrides the loaded permalinks with a provided array for testing.
     *
     * @param array $testPermalinks An associative array ['path' => data] of permalinks.
     */
    public function overridePermalinks(array $testPermalinks): void
    {
        if (!$this->isOverridden) {
            $this->originalPermalinks = $this->permalinks; // Store original links
        }
        $this->permalinks = $testPermalinks;
        $this->isOverridden = true;
        Log::warning('[PermanentLinkManager] Permalinks OVERRIDDEN for testing. Count: ' . count($this->permalinks));
    }

    /**
     * Restores the original permalinks if they were overridden for testing.
     */
    public function resetPermalinks(): void
    {
        if ($this->isOverridden) {
            $this->permalinks = $this->originalPermalinks;
            $this->originalPermalinks = [];
            $this->isOverridden = false;
            Log::warning('[PermanentLinkManager] Test permalink override RESET.');
        }
    }
}
