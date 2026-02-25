<?php

namespace App\Helpers;

use App\AiRudeDepot\Managers\StoragePathParser; // From AiRudeDepot\PathHelper
use InvalidArgumentException; // From AiRudeDepot\PathHelper

class PathHelper
{
    // Properties from AiRudeDepot\PathHelper
    public $storagePath;
    public $filePathList;
    public $itemType;
    public $pathName;
    public $label;
    public $keyPathList = [];
    public $moduleName;
    public $parameters = [];
    public $envPath; // Added for toOldArray method

    private static $basePath;
    private static $storageBasePath;

    /**
     * Конструктор (from AiRudeDepot\PathHelper).
     */
    public function __construct(string $storagePath, string $pathName, string $moduleName, string $itemType = 'directory', string $label = '', array $keyPath = [], array $parameters = [])
    {
        if ($itemType === 'file' && strpos($storagePath, 'file!') === 0) {
            $storagePath = substr($storagePath, 5);
        }
        $this->storagePath = $storagePath;
        $this->pathName = $pathName;
        $this->moduleName = $moduleName;
        $this->itemType = $itemType;
        $this->label = $label;
        $this->keyPathList = $keyPath;
        $this->parameters = $parameters;
    }

    /**
     * Normalize a route path by trimming slashes and defaulting to 'index'.
     *
     * @param string $path
     * @return string
     */
    public static function normalize(string $path): string
    {
        $normalized = trim($path, '/');
        if ($normalized === '') {
            return 'index';
        }
        return $normalized;
    }

    /**
     * Get directory from path.
     */
    public static function getDirectory(string $path): string
    {
        return dirname($path);
    }

    /**
     * Get parent directory from path.
     */
    public static function getParentDirectory(string $path): string
    {
        return dirname(self::getDirectory($path));
    }

    /**
     * Get relative path from base path.
     */
    public static function getRelativePath(string $path, string $base = null): string
    {
        $base = $base ?: self::getBasePath();
        $path = self::normalizePath($path);
        $base = self::normalizePath($base);

        if (strpos($path, $base) === 0) {
            return substr($path, strlen($base) + 1);
        }

        return $path;
    }

    /**
     * Get absolute path from relative path.
     */
    public static function getAbsolutePath(string $path, string $base = null): string
    {
        $base = $base ?: self::getBasePath();
        $path = self::normalizePath($path);
        $base = self::normalizePath($base);

        if (self::isAbsolutePath($path)) {
            return $path;
        }

        return self::joinPaths($base, $path);
    }

    /**
     * Get canonical path (resolves . and ..).
     */
    public static function getCanonicalPath(string $path): string
    {
        $path = self::normalizePath($path);
        $parts = explode('/', $path);
        $result = [];

        foreach ($parts as $part) {
            if ($part === '..') {
                array_pop($result);
            } elseif ($part !== '.' && $part !== '') {
                $result[] = $part;
            }
        }

        return implode('/', $result);
    }

    /**
     * Get real path (resolves symlinks).
     */
    public static function getRealPath(string $path): string
    {
        $realPath = realpath($path);
        return $realPath ?: $path;
    }

    /**
     * Get path info.
     */
    public static function getPathInfo(string $path): array
    {
        return [
            'dirname' => dirname($path),
            'basename' => basename($path),
            'extension' => pathinfo($path, PATHINFO_EXTENSION),
            'filename' => pathinfo($path, PATHINFO_FILENAME)
        ];
    }

    /**
     * Validate a storage path (from App\Helpers\PathHelper).
     */
    public static function validatePath(string $path): bool
    {
        return !empty($path);
    }
    public static function isValid(string $path): bool
    {
        return !empty($path);
    }
    public static function join(string $path, string $subPath): string
    {
        return rtrim($path, '/') . '/' . ltrim($subPath, '/');
    }
    /**
     * Add a subdirectory to a given path (from App\Helpers\PathHelper and used in AiRudeDepot\PathHelper).
     */
    public static function addSubdirectory(string $path, string $subPath): string
    {
        return rtrim($path, '/') . '/' . ltrim($subPath, '/');
    }

    /**
     * Для обратной совместимости с вызовами через buildFilePath (from AiRudeDepot\PathHelper).
     */
    public static function buildFilePath(string $path, $default = false, string $itemType = 'file'): array
    {
        $instance = self::buildPath($path, $default, $itemType);
        return $instance->getOldFormat();
    }

    /**
     * Статический метод построения пути (from AiRudeDepot\PathHelper).
     */
    public static function buildPath(string $path, $default = false, string $itemType = 'file', $envPath = false): self
    {
        $parsed = StoragePathParser::parse($path, $default, $envPath);

        if (in_array($parsed['moduleName'], ['Model', 'Mysql'])) {
            $itemType = strtolower($parsed['moduleName']);
        }

        $label = $parsed['label'] ?? '';
        if ($itemType === 'file' && !empty($parsed['keyPath'])) {
            $label = implode('.', $parsed['keyPath']);
        }

        $instance = new self(
            $parsed['storagePath'] ?? '',
            $parsed['pathName'] ?? '',
            $parsed['moduleName'] ?? '',
            $itemType,
            $label,
            $parsed['keyPath'] ?? [],
            $parsed['parameters'] ?? []
        );

        $instance->envPath = $envPath ?: 'ai';
        return $instance;
    }

    /**
     * Удобный алиас для получения старого формата (from AiRudeDepot\PathHelper).
     */
    public function getOldFormat(): array
    {
        return $this->toOldArray();
    }

    /**
     * Преобразует объект в массив старого формата (from AiRudeDepot\PathHelper).
     */
    public function toOldArray(): array
    {
        if (in_array($this->moduleName, ['Model', 'Mysql'])) {
            return [
                'filePath' => $this->pathName,
                'storagePath' => $this->storagePath,
                'keyPath' => $this->keyPathList,
                'pathName' => $this->pathName,
                'moduleName' => $this->moduleName,
                'parameters' => $this->parameters
            ];
        }

        if ($this->envPath && (strpos($this->envPath, ':\\') === 1 || strpos($this->envPath, '/') === 0)) {
            $base = $this->envPath;
        } else {
            $base = storage_path($this->envPath ?? 'ai');
        }

        $fullPath = $base . '/' . $this->storagePath . '.json';
        return [
            'filePath' => $fullPath,
            'storagePath' => $this->storagePath,
            'keyPath' => $this->keyPathList,
            'pathName' => $this->pathName,
            'moduleName' => $this->moduleName,
            'parameters' => $this->parameters
        ];
    }

    /**
     * Добавляет поддиректорию к текущему пути (from AiRudeDepot\PathHelper).
     */
    public function addToPath(string $subPath): self
    {
        $newStoragePath = self::addSubdirectory($this->storagePath, $subPath);
        return new self($newStoragePath, $this->pathName, $this->moduleName, 'directory', $subPath, $this->keyPathList, $this->parameters);
    }

    /**
     * Добавляет ключ для навигации по JSON (from AiRudeDepot\PathHelper).
     */
    public function addToKey(string $key): self
    {
        $newKeyPath = $this->keyPathList;
        $newKeyPath[] = $key;
        return new self($this->storagePath, $this->pathName, $this->moduleName, 'arrayvariable', $key, $newKeyPath, $this->parameters);
    }

    public function isDir(): bool
    {
        return $this->itemType === 'directory';
    }

    public function isFile(): bool
    {
        return $this->itemType === 'file';
    }

    public function isVarArray(): bool
    {
        return $this->itemType === 'arrayvariable';
    }

    public function isVariable(): bool
    {
        return $this->itemType === 'variable';
    }

    public function getFullPath(): string
    {
        $prefix = $this->itemType === 'directory' ? 'directory!' : 'file!';
        $path = $prefix . $this->storagePath;

        if (!empty($this->keyPathList)) {
            $path .= ':' . implode('.', $this->keyPathList);
        }
        return $path;
    }

    /**
     * Generate a breadcrumb array from a path (from App\Helpers\PathBreadcrumbHelper).
     */
    public static function generateBreadcrumb(string $path, string $separator = '/'): array
    {
        $parts = explode($separator, trim($path, $separator));
        $breadcrumbs = [];
        $currentPath = '';

        if (count($parts) === 1 && empty($parts[0])) {
            return [['label' => 'Root', 'path' => $separator]];
        }

        foreach ($parts as $part) {
            $currentPath .= ($currentPath ? $separator : '') . $part;
            $breadcrumbs[] = [
                'label' => $part,
                'path' => $currentPath
            ];
        }

        return $breadcrumbs;
    }

    /**
     * Format a breadcrumb link.
     */
    public static function formatBreadcrumbLink(array $breadcrumbItem): string
    {
        return sprintf(
            '<a href="%s">%s</a>',
            htmlspecialchars($breadcrumbItem['path']),
            htmlspecialchars($breadcrumbItem['label'])
        );
    }

    /**
     * Generate HTML breadcrumb.
     */
    public static function generateHtmlBreadcrumb(string $path, string $separator = ' > ', string $pathSeparator = '/'): string
    {
        $breadcrumbs = self::generateBreadcrumb($path, $pathSeparator);
        $links = array_map([self::class, 'formatBreadcrumbLink'], $breadcrumbs);
        return implode($separator, $links);
    }

    /**
     * Normalize path.
     */
    public static function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path);
        return rtrim($path, '/');
    }

    /**
     * Set base path.
     */
    public static function setBasePath(string $path): void
    {
        self::$basePath = self::normalizePath($path);
    }

    /**
     * Set storage path.
     */
    public static function setStoragePath(string $path): void
    {
        self::$storageBasePath = self::normalizePath($path);
    }

    /**
     * Get base path.
     */
    public static function getBasePath(): string
    {
        if (!self::$basePath) {
            self::$basePath = self::normalizePath(base_path());
        }
        return self::$basePath;
    }

    /**
     * Get storage path.
     */
    public static function getStoragePath(): string
    {
        if (!self::$storageBasePath) {
            self::$storageBasePath = self::normalizePath(storage_path());
        }
        return self::$storageBasePath;
    }

    /**
     * Get engine path.
     */
    public static function getEnginePath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'script/engine', $path);
    }

    /**
     * Get app path.
     */
    public static function getAppPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'app', $path);
    }

    /**
     * Get config path.
     */
    public static function getConfigPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'config', $path);
    }

    /**
     * Get public path.
     */
    public static function getPublicPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'public', $path);
    }

    /**
     * Get resource path.
     */
    public static function getResourcePath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'resources', $path);
    }

    /**
     * Get database path.
     */
    public static function getDatabasePath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'database', $path);
    }

    /**
     * Get test path.
     */
    public static function getTestPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'tests', $path);
    }

    /**
     * Get vendor path.
     */
    public static function getVendorPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'vendor', $path);
    }

    /**
     * Get bootstrap path.
     */
    public static function getBootstrapPath(string $path = ''): string
    {
        return self::joinPaths(self::getBasePath(), 'bootstrap', $path);
    }

    /**
     * Get log path.
     */
    public static function getLogPath(string $path = ''): string
    {
        return self::joinPaths(self::getStoragePath(), 'logs', $path);
    }

    /**
     * Get cache path.
     */
    public static function getCachePath(string $path = ''): string
    {
        return self::joinPaths(self::getStoragePath(), 'framework/cache', $path);
    }

    /**
     * Get temp path.
     */
    public static function getTempPath(string $path = ''): string
    {
        return self::joinPaths(self::getStoragePath(), 'framework/temp', $path);
    }

    /**
     * Get view path.
     */
    public static function getViewPath(string $path = ''): string
    {
        return self::joinPaths(self::getResourcePath(), 'views', $path);
    }

    /**
     * Get lang path.
     */
    public static function getLangPath(string $path = ''): string
    {
        return self::joinPaths(self::getResourcePath(), 'lang', $path);
    }

    /**
     * Join paths.
     */
    public static function joinPaths(string ...$paths): string
    {
        return self::normalizePath(implode('/', array_filter($paths)));
    }

    /**
     * Check if path is absolute.
     */
    public static function isAbsolutePath(string $path): bool
    {
        return strpos($path, '/') === 0 || strpos($path, ':\\') === 1;
    }

    /**
     * Make path relative to base.
     */
    public static function makeRelativePath(string $path, string $base = null): string
    {
        $base = $base ?: self::getBasePath();
        $path = self::normalizePath($path);
        $base = self::normalizePath($base);

        if (strpos($path, $base) === 0) {
            return substr($path, strlen($base) + 1);
        }

        return $path;
    }

    /**
     * Make path absolute from base.
     */
    public static function makeAbsolutePath(string $path, string $base = null): string
    {
        $base = $base ?: self::getBasePath();
        $path = self::normalizePath($path);
        $base = self::normalizePath($base);

        if (self::isAbsolutePath($path)) {
            return $path;
        }

        return self::joinPaths($base, $path);
    }

    /**
     * Ensure directory exists.
     */
    public static function ensureDirectoryExists(string $path): bool
    {
        return FileHelper::ensureDirectoryExists($path);
    }

    /**
     * Ensure file directory exists.
     */
    public static function ensureFileDirectoryExists(string $path): bool
    {
        return self::ensureDirectoryExists(dirname($path));
    }

    /**
     * Get directory size.
     */
    public static function getDirectorySize(string $path): int
    {
        $size = 0;
        $files = FileHelper::getAllFiles($path);

        foreach ($files as $file) {
            $size += filesize($file);
        }

        return $size;
    }

    /**
     * Format size.
     */
    public static function formatSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    /**
     * Get file extension.
     */
    public static function getFileExtension(string $path): string
    {
        return pathinfo($path, PATHINFO_EXTENSION);
    }

    /**
     * Get file name.
     */
    public static function getFileName(string $path): string
    {
        return pathinfo($path, PATHINFO_FILENAME);
    }

    /**
     * Get base name.
     */
    public static function getBaseName(string $path): string
    {
        return basename($path);
    }

    /**
     * Get directory name.
     */
    public static function getDirectoryName(string $path): string
    {
        return dirname($path);
    }

    /**
     * Check if running in Laravel.
     */
    public static function isLaravel(): bool
    {
        return function_exists('app') && function_exists('base_path');
    }

    /**
     * Get Laravel storage path.
     */
    public static function getLaravelStoragePath(string $path = ''): string
    {
        return self::joinPaths(storage_path(), $path);
    }
}
