<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StorageHelper;
use Exception;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;

class Directory
{
    protected bool $loaded = false;
    protected string $directoryPath;
    protected array $data = [];
    protected string $diskName;
    protected FilesystemAdapter $diskInstance;

    /**
     * Initialize the directory controller.
     *
     * @param string $directoryPath Path to the directory
     * @param FilesystemAdapter|string $disk Disk instance or name
     * @throws InvalidArgumentException If disk is invalid
     */
    public function __construct(string $directoryPath, $disk)
    {
        $this->directoryPath = PathHelper::normalize($directoryPath);

        if ($disk instanceof FilesystemAdapter) {
            $this->diskInstance = $disk;
            $this->diskName = 'unknown (instance passed)';
        } elseif (is_string($disk)) {
            $this->diskName = $disk;
            try {
                $this->diskInstance = StorageHelper::initDisk($this->diskName);
            } catch (InvalidArgumentException $e) {
                LogHelper::error('Directory::__construct', 'Failed to get disk', [
                    'disk' => $this->diskName,
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        } else {
            throw new InvalidArgumentException('Invalid disk provided to Directory module constructor');
        }

        LogHelper::debug('Directory::__construct', 'Initialized', [
            'path' => $this->directoryPath,
            'diskName' => $this->diskName,
            'hash' => spl_object_hash($this)
        ]);
    }

    /**
     * Load data into the directory controller.
     *
     * @param array|null $data Optional data to load
     * @return self
     */
    public function load(?array $data = null): self
    {
        if ($data !== null) {
            $this->data = $data;
            $this->loaded = true;
        } elseif (!$this->loaded) {
            $this->reload();
        }
        return $this;
    }

    /**
     * Reload data from the directory.
     *
     * @param array|null $data Optional data to load
     * @return self
     */
    public function reload(?array $data = null): self
    {
        $this->loaded = true;
        $this->data = $this->loadDataFromDirectory($this->directoryPath);
        return $this;
    }

    /**
     * Load data from a directory.
     *
     * @param string $directoryPath Path to load data from
     * @return array The loaded data
     */
    protected function loadDataFromDirectory(string $directoryPath): array
    {
        $data = [];
        $disk = $this->diskInstance;

        if (!StorageHelper::directoryExists($disk, $directoryPath)) {
            LogHelper::warning('Directory::loadDataFromDirectory', 'Directory not found', [
                'disk' => $this->diskName,
                'path' => $directoryPath
            ]);
            return $data;
        }

        $files = StorageHelper::listFiles($disk, $directoryPath);
        foreach ($files as $fileRelativePath) {
            if (FileHelper::isJsonFile($fileRelativePath)) {
                $key = FileHelper::getFileName($fileRelativePath);
                try {
                    $content = StorageHelper::get($disk, $fileRelativePath);
                    $data[$key] = JsonHelper::decode($content);
                } catch (Exception $e) {
                    LogHelper::error('Directory::loadDataFromDirectory', 'Error reading file', [
                        'disk' => $this->diskName,
                        'path' => $fileRelativePath,
                        'error' => $e->getMessage()
                    ]);
                    $data[$key] = null;
                }
            }
        }

        $directories = StorageHelper::listDirectories($disk, $directoryPath);
        foreach ($directories as $subDirRelativePath) {
            $dirName = PathHelper::getBaseName($subDirRelativePath);
            $subDirectory = new self($subDirRelativePath, $this->diskInstance);
            $data[$dirName] = $subDirectory->get();
        }

        return $data;
    }

    /**
     * Get data from the directory.
     *
     * @param string|array|null $keyPath Path to get data from
     * @return mixed The data or null if not found
     */
    public function get($keyPath = null)
    {
        if (!$this->loaded) {
            $this->reload();
        }

        if (!empty($keyPath)) {
            return ArrayHelper::get($this->data, $keyPath);
        }

        return $this->data;
    }

    /**
     * Save data to the directory.
     *
     * @throws RuntimeException Directory storage is read-only
     */
    public function save(): void
    {
        throw new RuntimeException('Directory storage is read-only');
    }

    /**
     * Set data in the directory.
     *
     * @param string|array $keyPath Path to set data at
     * @param mixed $value Value to set
     * @throws RuntimeException Directory storage is read-only
     */
    public function set($keyPath, $value = null): void
    {
        throw new RuntimeException('Directory storage is read-only');
    }

    protected function getRelativePath($path, $basePath)
    {
        return trim(str_replace($basePath, '', $path), '/');
    }

    protected function setNestedValue(&$array, $path, $value)
    {
        $current = &$array;
        foreach ($path as $key) {
            if (!isset($current[$key])) {
                $current[$key] = [];
            }
            $current = &$current[$key];
        }
        if (is_array($value) && isset($current) && is_array($current)) {
            $current = array_merge($current, $value);
        } else {
            $current = $value;
        }
    }
}
