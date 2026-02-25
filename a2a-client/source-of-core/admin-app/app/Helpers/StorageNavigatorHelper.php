<?php

namespace App\Helpers;

class StorageNavigatorHelper
{
    /**
     * Validate a storage path.
     *
     * @param string|null $path
     * @return bool
     */
    public static function validatePath(?string $path): bool
    {
        // Empty path is valid for root directory
        if ($path === null || $path === '') {
            return true;
        }

        // Check for invalid characters
        if (preg_match('/[<>:"|?*]/', $path)) {
            return false;
        }

        // Check for path traversal attempts
        if (strpos($path, '..') !== false) {
            return false;
        }

        return true;
    }

    /**
     * Format an item for response.
     *
     * @param array $item Item data
     * @return array Formatted item
     */
    public static function formatItem(array $item): array
    {
        return [
            'label' => $item['label'] ?? basename($item['path'] ?? ''),
            'path' => $item['path'] ?? '',
            'itemType' => $item['itemType'] ?? 'unknown',
            'size' => $item['size'] ?? 0,
            'modified' => $item['modified'] ?? 0,
            'isDirectory' => $item['isDirectory'] ?? false,
        ];
    }

    /**
     * Format a directory item.
     *
     * @param string $path Directory path
     * @param string $label Directory label
     * @return array Formatted directory item
     */
    public static function formatDirectory(string $path, string $label = null): array
    {
        return self::formatItem([
            'label' => $label ?? basename($path),
            'path' => $path,
            'itemType' => 'directory',
            'isDirectory' => true,
        ]);
    }

    /**
     * Format a file item.
     *
     * @param string $path File path
     * @param string $label File label
     * @param int $size File size
     * @param int $modified Last modified timestamp
     * @return array Formatted file item
     */
    public static function formatFile(string $path, string $label = null, int $size = 0, int $modified = 0): array
    {
        return self::formatItem([
            'label' => $label ?? basename($path),
            'path' => $path,
            'itemType' => 'file',
            'size' => $size,
            'modified' => $modified,
            'isDirectory' => false,
        ]);
    }

    /**
     * Get file extension.
     *
     * @param string $path File path
     * @return string File extension
     */
    public static function getExtension(string $path): string
    {
        return strtolower(pathinfo($path, PATHINFO_EXTENSION));
    }

    /**
     * Check if path is a directory.
     *
     * @param string $path Path to check
     * @return bool True if path is a directory
     */
    public static function isDirectory(string $path): bool
    {
        return is_dir($path);
    }

    /**
     * Check if path is a file.
     *
     * @param string $path Path to check
     * @return bool True if path is a file
     */
    public static function isFile(string $path): bool
    {
        return is_file($path);
    }

    /**
     * Get file size.
     *
     * @param string $path File path
     * @return int File size in bytes
     */
    public static function getFileSize(string $path): int
    {
        return is_file($path) ? filesize($path) : 0;
    }

    /**
     * Get last modified time.
     *
     * @param string $path Path to check
     * @return int Last modified timestamp
     */
    public static function getLastModified(string $path): int
    {
        return file_exists($path) ? filemtime($path) : 0;
    }
}
