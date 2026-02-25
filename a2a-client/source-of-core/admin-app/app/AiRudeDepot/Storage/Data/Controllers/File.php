<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StorageHelper;
use App\Hooks\StorageFacade as Storage;
use Exception;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use InvalidArgumentException;

class File
{
    protected bool $loaded = false;
    protected string $filePath;
    protected ?array $data = null;
    protected string $diskName;

    /**
     * Initialize the file controller.
     *
     * @param string $relativePath Relative path to the file
     * @param string $diskName Storage disk name
     * @throws InvalidArgumentException If path is invalid
     */
    public function __construct(string $relativePath, string $diskName = 'local')
    {
        $this->filePath = PathHelper::normalize($relativePath);
        $this->diskName = $diskName;

        if (!StorageHelper::isValidDisk($diskName)) {
            throw new InvalidArgumentException("Invalid disk name: {$diskName}");
        }
    }

    /**
     * Load data into the file controller.
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
     * Reload data from the file.
     *
     * @param array|null $data Optional data to load
     * @return self
     */
    public function reload(?array $data = null): self
    {
        $this->loaded = true;
        LogHelper::debug('File::reload', 'Attempting to reload file', [
            'disk' => $this->diskName,
            'path' => $this->filePath
        ]);

        try {
            $disk = $this->disk();
            $fileExists = StorageHelper::exists($disk, $this->filePath);
            $absolutePath = StorageHelper::getPath($disk, $this->filePath);

            LogHelper::debug('File::reload', 'Storage check result', [
                'disk' => $this->diskName,
                'relative_path' => $this->filePath,
                'absolute_path' => $absolutePath,
                'exists' => $fileExists
            ]);

            if ($fileExists) {
                $content = StorageHelper::get($disk, $this->filePath);
                $this->data = JsonHelper::decode($content);
                
                LogHelper::debug('File::reload', 'Loaded content', [
                    'disk' => $this->diskName,
                    'path' => $this->filePath,
                    'content_length' => strlen($content),
                    'data_type' => gettype($this->data)
                ]);
            } else {
                LogHelper::warning('File::reload', 'File not found', [
                    'disk' => $this->diskName,
                    'path' => $this->filePath,
                    'absolute_path' => $absolutePath
                ]);
                $this->data = null;
            }
        } catch (FileNotFoundException $e) {
            LogHelper::warning('File::reload', 'File not found exception', [
                'disk' => $this->diskName,
                'path' => $this->filePath,
                'message' => $e->getMessage()
            ]);
            $this->data = null;
        } catch (Exception $e) {
            LogHelper::error('File::reload', 'Error during reload', [
                'disk' => $this->diskName,
                'path' => $this->filePath,
                'message' => $e->getMessage()
            ]);
            $this->data = null;
        }

        return $this;
    }

    /**
     * Get the storage disk instance.
     *
     * @return \Illuminate\Contracts\Filesystem\Filesystem
     */
    protected function disk()
    {
        return Storage::disk($this->diskName);
    }

    /**
     * Get data from the file.
     *
     * @param string|array|null $keyPath Path to the data
     * @return mixed The data or null if not found
     */
    public function get($keyPath = null)
    {
        if (!$this->loaded) {
            $this->reload();
        }

        if ($this->data === null) {
            return null;
        }

        if (!empty($keyPath)) {
            return ArrayHelper::get($this->data, $keyPath);
        }

        return $this->data;
    }

    /**
     * Save data to the file.
     *
     * @return bool True if successful, false otherwise
     */
    public function save(): bool
    {
        $dataToSave = $this->data ?? [];

        try {
            $content = JsonHelper::encode($dataToSave);
            $result = StorageHelper::put($this->disk(), $this->filePath, $content);
            
            LogHelper::debug('File::save', 'File saved', [
                'disk' => $this->diskName,
                'path' => $this->filePath,
                'success' => $result
            ]);
            
            return $result;
        } catch (Exception $e) {
            LogHelper::error('File::save', 'Error saving file', [
                'disk' => $this->diskName,
                'path' => $this->filePath,
                'message' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Set data in the file.
     *
     * @param string|array $keyPath Path to set the value
     * @param mixed $value Value to set
     * @return self
     */
    public function set($keyPath, $value = null): self
    {
        if (!$this->loaded) {
            $this->reload();
        }

        if ($this->data === null) {
            $this->data = [];
        }

        if (is_null($value) && func_num_args() === 1) {
            $this->data = $keyPath;
            return $this;
        }

        $keys = is_array($keyPath) ? $keyPath : explode('.', $keyPath);

        if (empty($keys)) {
            $this->data = $value;
        } else {
            $this->data = ArrayHelper::set($this->data, $keys, $value);
        }

        return $this;
    }

    /**
     * Remove data from the file.
     *
     * @param string|array|null $keyPath Path to remove
     * @return self
     */
    public function remove($keyPath = null): self
    {
        if (!$this->loaded) {
            $this->reload();
        }

        if ($this->data === null) {
            return $this;
        }

        if (is_null($keyPath)) {
            $this->data = null;
            return $this;
        }

        $keys = is_array($keyPath) ? $keyPath : explode('.', $keyPath);
        $this->data = ArrayHelper::forget($this->data, $keys);

        return $this;
    }

    /**
     * Delete the file.
     *
     * @return bool True if successful, false otherwise
     */
    public function deleteFile(): bool
    {
        try {
            $result = StorageHelper::delete($this->disk(), $this->filePath);
            
            if ($result) {
                $this->data = null;
                $this->loaded = false;
                
                LogHelper::debug('File::deleteFile', 'File deleted', [
                    'disk' => $this->diskName,
                    'path' => $this->filePath
                ]);
            }
            
            return $result;
        } catch (Exception $e) {
            LogHelper::error('File::deleteFile', 'Error deleting file', [
                'disk' => $this->diskName,
                'path' => $this->filePath,
                'message' => $e->getMessage()
            ]);
            return false;
        }
    }
}
