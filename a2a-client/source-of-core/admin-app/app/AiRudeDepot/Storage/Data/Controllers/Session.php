<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\AiRudeDepot\Support\StoragePathParser;
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\StringHelper;
use Exception;
use Illuminate\Session\Store;
use InvalidArgumentException;

class Session
{
    protected bool $loaded = true;
    protected array $keyPath = [];
    protected Store $sessionStore;

    /**
     * Initialize the session controller.
     *
     * @param Store $sessionStore The session store instance
     * @param string|null $path Optional path to initialize with
     * @throws InvalidArgumentException If path is invalid
     */
    public function __construct(Store $sessionStore, ?string $path = null)
    {
        $this->sessionStore = $sessionStore;

        if ($path) {
            try {
                $pathInfo = StoragePathParser::parse($path);
                $this->keyPath = $pathInfo['keyPath'];
                
                LogHelper::debug('Session::__construct', 'Parsed path', [
                    'path' => $path,
                    'keyPath' => $this->keyPath
                ]);
            } catch (Exception $e) {
                LogHelper::error('Session::__construct', 'Failed to parse path', [
                    'path' => $path,
                    'error' => $e->getMessage()
                ]);
                $this->keyPath = [];
            }
        } else {
            LogHelper::debug('Session::__construct', 'Called with no path');
            $this->keyPath = [];
        }
    }

    /**
     * Get data from the session.
     *
     * @param string|array|null $keyPath Path to get data from
     * @return mixed The session data
     */
    public function get($keyPath = null)
    {
        $pathToUse = $keyPath ?? $this->keyPath;
        
        if (empty($pathToUse)) {
            LogHelper::warning('Session::get', 'Attempting get without key path');
            return $this->sessionStore->all();
        }

        $dotPath = is_array($pathToUse) ? implode('.', $pathToUse) : $pathToUse;
        
        LogHelper::debug('Session::get', 'Getting value', [
            'instanceKeyPath' => $this->keyPath,
            'argKeyPath' => $keyPath,
            'resolvedDotPath' => $dotPath
        ]);

        $value = $this->sessionStore->get($dotPath);
        
        LogHelper::debug('Session::get', 'Retrieved value', [
            'dotPath' => $dotPath,
            'valueType' => gettype($value)
        ]);
        
        return $value;
    }

    /**
     * Set data in the session.
     *
     * @param string|array $keyPath Path to set data at
     * @param mixed $value Value to set
     * @return self
     * @throws InvalidArgumentException If key path is empty
     */
    public function set($keyPath, $value = null): self
    {
        if ($value === null && func_num_args() === 1) {
            $value = $keyPath;
            $pathToUse = $this->keyPath;
        } else {
            $pathToUse = $keyPath;
        }

        if (empty($pathToUse)) {
            LogHelper::error('Session::set', 'Cannot set session data without key path');
            throw new InvalidArgumentException('Cannot set session data without key path');
        }

        $dotPath = is_array($pathToUse) ? implode('.', $pathToUse) : $pathToUse;
        
        LogHelper::debug('Session::set', 'Setting value', [
            'instanceKeyPath' => $this->keyPath,
            'argKeyPath' => $keyPath,
            'resolvedDotPath' => $dotPath,
            'valueType' => gettype($value)
        ]);

        $this->sessionStore->put($dotPath, $value);
        
        LogHelper::debug('Session::set', 'Value set', [
            'dotPath' => $dotPath
        ]);

        $this->sessionStore->save();
        
        LogHelper::debug('Session::set', 'Session saved');

        return $this;
    }

    /**
     * Save the session.
     *
     * @return self
     */
    public function save(): self
    {
        $this->sessionStore->save();
        LogHelper::debug('Session::save', 'Session saved');
        return $this;
    }

    /**
     * Remove data from the session.
     *
     * @param string|array|null $keyPath Path to remove data from
     * @return self
     * @throws InvalidArgumentException If key path is empty
     */
    public function remove($keyPath = null): self
    {
        $pathToUse = $keyPath ?? $this->keyPath;
        
        if (empty($pathToUse)) {
            LogHelper::error('Session::remove', 'Cannot remove session data without key path');
            throw new InvalidArgumentException('Cannot remove session data without key path');
        }

        $dotPath = is_array($pathToUse) ? implode('.', $pathToUse) : $pathToUse;
        
        LogHelper::debug('Session::remove', 'Removing value', [
            'instanceKeyPath' => $this->keyPath,
            'argKeyPath' => $keyPath,
            'resolvedDotPath' => $dotPath
        ]);

        $this->sessionStore->forget($dotPath);
        
        LogHelper::debug('Session::remove', 'Value removed', [
            'dotPath' => $dotPath
        ]);

        $this->sessionStore->save();
        
        LogHelper::debug('Session::remove', 'Session saved');

        return $this;
    }
}
