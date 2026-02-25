<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Managers\StoragePathParser;
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\StringHelper;
use Exception;
use InvalidArgumentException;

// Remove use statement for non-existent interface again
// use App\AiRudeDepot\Interfaces\DataControllerInterface;

// Remove the unused ValidateHelper use statement if it exists
// use App\AiRudeDepot\Helpers\ValidateHelper;

// Remove implementation of non-existent interface again
class Buffer
{
    protected array $data = [];
    protected bool $loaded = true;
    protected ?array $keyPath = null;

    /**
     * Initialize the buffer controller.
     *
     * @param string|null $path Optional path to initialize with
     */
    public function __construct(?string $path = null)
    {
        if ($path) {
            try {
                $pathInfo = StoragePathParser::parse($path);
                if (!empty($pathInfo['keyPath'])) {
                    $this->keyPath = $pathInfo['keyPath'];
                }
            } catch (Exception $e) {
                LogHelper::warning('Buffer::__construct', 'Failed to parse path', [
                    'path' => $path,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Get data from the buffer.
     *
     * @param string|array|null $keyPath Path to get data from
     * @return mixed The data or null if not found
     */
    public function get($keyPath = null)
    {
        if (empty($keyPath) && !empty($this->keyPath)) {
            return ArrayHelper::get($this->data, $this->keyPath);
        }

        if ($keyPath) {
            return ArrayHelper::get($this->data, $keyPath);
        }

        return $this->data;
    }

    /**
     * Set data in the buffer.
     *
     * @param string|array $keyPath Path to set data at
     * @param mixed $value Value to set
     * @return self
     */
    public function set($keyPath, $value = null): self
    {
        LogHelper::debug('Buffer::set', 'Setting value', [
            'keyPath' => $keyPath,
            'value' => $value,
            'numArgs' => func_num_args()
        ]);

        if (func_num_args() === 1 && !is_null($this->keyPath)) {
            $value = $keyPath;
            $keyPath = $this->keyPath;
            LogHelper::debug('Buffer::set', 'Using pre-defined keyPath', [
                'keyPath' => $keyPath,
                'value' => $value
            ]);
        }

        if (is_string($keyPath) && !StringHelper::contains($keyPath, '.')) {
            LogHelper::debug('Buffer::set', 'Direct set for simple key', [
                'key' => $keyPath,
                'value' => $value
            ]);
            $this->data[$keyPath] = $value;
        } elseif ($keyPath) {
            $actualKeyPath = is_string($keyPath) ? explode('.', $keyPath) : $keyPath;
            if (!is_array($actualKeyPath)) {
                LogHelper::error('Buffer::set', 'Invalid keyPath', [
                    'keyPath' => $keyPath
                ]);
                return $this;
            }
            LogHelper::debug('Buffer::set', 'Setting nested value', [
                'keyPath' => $actualKeyPath,
                'value' => $value
            ]);
            $this->data = ArrayHelper::set($this->data, $actualKeyPath, $value);
        } else {
            if (is_array($value)) {
                LogHelper::debug('Buffer::set', 'Replacing entire data', [
                    'value' => $value
                ]);
                $this->data = $value;
            } else {
                LogHelper::warning('Buffer::set', 'Attempted to set non-array value without keyPath');
            }
        }

        LogHelper::debug('Buffer::set', 'Data after set', [
            'data' => $this->data
        ]);

        return $this;
    }

    /**
     * Remove data from the buffer.
     *
     * @param string|array|null $keyPath Path to remove data from
     * @return self
     * @throws InvalidArgumentException If keyPath is invalid
     */
    public function remove($keyPath = null): self
    {
        if (is_null($keyPath) && !empty($this->keyPath)) {
            $keyPath = $this->keyPath;
        }

        if (is_null($keyPath)) {
            $this->data = [];
            return $this;
        }

        if (is_string($keyPath)) {
            $keyPath = explode('.', $keyPath);
        }

        if (!is_array($keyPath)) {
            throw new InvalidArgumentException('Invalid key path for removal');
        }

        if (empty($keyPath)) {
            $this->data = [];
        } else {
            $this->data = ArrayHelper::forget($this->data, $keyPath);
        }

        return $this;
    }

    /**
     * Load data into the buffer.
     *
     * @param array|null $data Optional data to load
     * @return self
     */
    public function load(?array $data = null): self
    {
        if ($data !== null) {
            $this->data = $data;
        }
        $this->loaded = true;
        return $this;
    }

    /**
     * Reload data in the buffer.
     *
     * @param array|null $data Optional data to load
     * @return self
     */
    public function reload(?array $data = null): self
    {
        $this->loaded = true;
        $this->data = [];

        if ($data !== null) {
            $this->data = $data;
        }

        return $this;
    }

    /**
     * Get all data from the buffer.
     *
     * @return array The buffer data
     */
    public function getData(): array
    {
        return $this->data;
    }

    /**
     * Save the buffer.
     *
     * @return self
     */
    public function save(): self
    {
        return $this;
    }
}
