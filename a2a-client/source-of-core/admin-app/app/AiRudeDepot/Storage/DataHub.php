<?php

namespace App\AiRudeDepot\Storage;

use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\StorageHelper;
use App\Helpers\StringHelper;
use App\AiRudeDepot\Processors\InstructionProcessor;
use BadMethodCallException;
use Error;
use Illuminate\Contracts\Session\Session as SessionContract;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use ReflectionClass;
use ReflectionException;
use RuntimeException;
use Throwable;

//  бывший StorageSession смешаный с StaticStorage
class DataHub
{
    public static $session = null;
    protected static $staticStorageInstance = null;
    protected string $diskName;
    protected array $modules = [];
    protected array $states = [];
    protected bool $allowDebug = true;
    protected bool $allowVerbosity = false;
    protected FilesystemAdapter $storage;
    protected $currentPath = null;
    protected FilesystemAdapter $disk;
    protected string $basePath;
    protected array $data = [];
    protected string $cacheKey = 'data_hub_cache';

    public function __construct(string $diskName = 'local', string $relativeBasePath = 'data')
    {
        $this->diskName = $diskName;
        try {
            $this->storage = Storage::disk($this->diskName);
        } catch (InvalidArgumentException $e) {
            Log::critical("[DataHub::__construct] Failed to get disk '{$this->diskName}'. Check filesystems.php configuration.", ['error' => $e->getMessage()]);
            throw new RuntimeException("Storage disk '{$this->diskName}' is not configured.", 0, $e);
        }
        $this->disk = StorageHelper::initDisk($this->diskName, $relativeBasePath);
        $this->basePath = $relativeBasePath;
        $this->loadDataFromCache();
        Log::debug("[DataHub::__construct] Instance created", ['diskName' => $this->diskName, 'object_hash' => spl_object_hash($this)]);
    }

    protected function loadDataFromCache(): void
    {
        $this->data = StorageHelper::getFromCache($this->cacheKey, []);
        LogHelper::debug('DataHub::loadDataFromCache', 'Loaded data from cache', [
            'count' => count($this->data)
        ]);
    }

    public static function processResolveInstruction(&$data, DataHub $storageInstance = null)
    {
        $storage = $storageInstance ?? self::getDefaultStorage();

        if (is_array($data)) {
            array_walk_recursive($data, function (&$item) use ($storage) {
                if (is_string($item)) {
                    $item = self::resolveAddress($item, $storage);
                }
            });
        } elseif (is_string($data)) {
            $data = self::resolveAddress($data, $storage);
        }
        return $data;
    }

    protected static function getDefaultStorage(): self
    {
        if (self::$staticStorageInstance === null) {
            $defaultDisk = config('filesystems.default', 'ai');
            Log::debug('[DataHub::getDefaultStorage] Initializing default static storage instance', ['disk' => $defaultDisk]);
            self::$staticStorageInstance = new self($defaultDisk);
        }
        return self::$staticStorageInstance;
    }

    public static function resolveAddress($address, DataHub $storageInstance = null): string
    {
        $storage = $storageInstance ?? self::getDefaultStorage();

        if (!is_string($address)) {
            Log::warning("[DataHub::resolveAddress] Address is not a string, returning as is.", ['type' => gettype($address)]);
            return $address;
        }

        $originalAddress = $address;
        $resolved = false;
        $depth = 0;
        $maxDepth = 10;

        try {
            while (preg_match('/\{([^{}]+)\}/U', $address, $matches) && $depth < $maxDepth) {
                $depth++;
                $key = trim($matches[1]);
                Log::debug("[DataHub::resolveAddress] Found key to resolve: '{$key}' in address '{$address}'", ['depth' => $depth]);

                $value = $storage->address($key)->get();

                if ($value === null) {
                    Log::warning("[DataHub::resolveAddress] Resolved key '{$key}' resulted in null value.");
                    $value = '';
                }
                if (is_array($value) || is_object($value)) {
                    Log::error("[DataHub::resolveAddress] Cannot insert array/object value from key '{$key}' into address string.");
                    $value = '[INVALID_TYPE]';
                }

                $address = str_replace($matches[0], (string)$value, $address);
                $resolved = true;
                Log::debug("[DataHub::resolveAddress] Address after replacing '{$key}': '{$address}'");
            }
            if ($depth >= $maxDepth) {
                Log::error("[DataHub::resolveAddress] Max resolution depth reached for address", ['original' => $originalAddress]);
            }
        } catch (Throwable $e) {
            Log::error("Error resolving address: " . $e->getMessage() . " in address string: " . $originalAddress, ['exception' => $e]);
            return $originalAddress;
        }

        if ($resolved) {
            Log::debug("[DataHub::resolveAddress] Final resolved address", ['original' => $originalAddress, 'final' => $address]);
        }

        return $address;
    }

    public static function get($address, $storageInstance = null, $default = null)
    {
        $storage = $storageInstance ?? self::getDefaultStorage();

        $ret = $storage->address($address)->get($default);
        return $ret;
    }

    public function address($address): InstructionProcessor
    {
        if ($this->allowDebug) Log::debug("[DataHub::address] Input address: " . $address . ", diskName: " . $this->diskName);
        $originalAddress = $address;
        $resolvedAddress = self::resolveAddress($address, $this);
        if ($this->allowDebug) Log::debug("[DataHub::address] Calling PathHelper::buildPath with resolved address: " . $resolvedAddress . " on disk: " . $this->diskName);

        if (!class_exists(PathHelper::class) || !method_exists(PathHelper::class, 'buildPath')) {
            throw new RuntimeException("PathHelper class or buildPath method not found.");
        }
        $pathInfo = PathHelper::buildPath($resolvedAddress, [], 'file', $this->diskName)->getOldFormat();

        Log::debug("[DataHub::address] PathInfo received from buildPath", ['input_address' => $resolvedAddress, 'diskName' => $this->diskName, 'pathInfo' => $pathInfo]);
        if ($this->allowDebug) Log::debug("[DataHub::address] PathInfo returned from PathHelper::buildPath:", $pathInfo);

        $pathName = $pathInfo['pathName'] ?? null;
        if (!$pathName) {
            throw new RuntimeException("Could not determine pathName from parsed path for address: " . $originalAddress);
        }

        $moduleInstance = $this->getModuleInstance($pathName, $pathInfo);
        $stateInstance = $this->getStateInstance($originalAddress, $pathInfo, $moduleInstance);
        return $stateInstance;
    }

    public function getModuleInstance($pathName, $pathInfo)
    {
        $parametersHash = md5(json_encode($pathInfo['parameters'] ?? []));
        $cacheKey = $pathName . '::' . $parametersHash;

        if ($this->allowDebug) Log::debug('[DataHub::getModuleInstance] Requesting module', [
            'pathName' => $pathName,
            'parameters' => $pathInfo['parameters'] ?? [],
            'diskName' => $this->diskName,
            'cacheKey' => $cacheKey,
            'cacheExists' => isset($this->modules[$cacheKey])
        ]);

        if (!isset($this->modules[$cacheKey])) {
            $moduleName = $pathInfo['moduleName'] ?? '';

            if ($this->allowDebug) Log::debug("[DataHub] Creating REAL module instance for: " . $moduleName . " with cacheKey: " . $cacheKey . " on disk: " . $this->diskName);

            $className = 'App\\AiRudeDepot\\Storage\\Data\\Controllers\\' . ucfirst($moduleName);

            if (!class_exists($className)) {
                throw new RuntimeException("Storage Data Module class not found: " . $className);
            }

            try {
                switch ($moduleName) {
                    case 'Buffer':
                        $this->modules[$cacheKey] = new $className($pathInfo['storagePath']);
                        break;
                    case 'File':
                        $relativePath = ($pathInfo['storagePath'] ?? null);
                        if (!$relativePath) {
                            Log::error("[DataHub] Missing storagePath in pathInfo for File module", ['pathInfo' => $pathInfo]);
                            throw new RuntimeException("Missing storagePath in pathInfo for File module: " . json_encode($pathInfo));
                        }
                        $relativePath .= '.json';
                        $diskToUse = $this->diskName;
                        Log::debug("[DataHub] Preparing File module instantiation", [
                            'diskName' => $diskToUse,
                            'relativePath' => $relativePath,
                            'pathInfo_storagePath' => $pathInfo['storagePath'] ?? 'N/A'
                        ]);
                        $this->modules[$cacheKey] = new $className($relativePath, $diskToUse);
                        break;
                    case 'Directory':
                        Log::warning("[DataHub] Directory module instantiation may need review with diskName change.");
                        $this->modules[$cacheKey] = new $className(
                            $pathInfo['storagePath'] ?? '',
                            $this->getDisk()
                        );
                        break;
                    case 'Session':
                        $sessionStore = app(SessionContract::class);
                        if ($this->allowDebug) Log::debug("[DataHub] Instantiating REAL Session with Session Store");
                        $this->modules[$cacheKey] = new $className($sessionStore);
                        break;
                    case 'Model':
                    case 'Mysql':
                        $connectionToUse = (app()->runningUnitTests() || config('database.default') === 'sqlite') ? 'sqlite' : null;
                        $this->modules[$cacheKey] = new $className(
                            $pathInfo['storagePath'] ?? $pathName,
                            $pathInfo['parameters'] ?? [],
                            $connectionToUse
                        );
                        break;
                    default:
                        throw new RuntimeException("Cannot instantiate unknown module type: $moduleName");
                }
                if ($this->allowDebug) Log::debug("[DataHub] Module instance created successfully.");
            } catch (Throwable $e) {
                if ($this->allowDebug) Log::error("[DataHub] Error instantiating module $moduleName: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                throw $e;
            }
            if ($this->allowDebug) Log::debug('DataHub created module instance', ['cacheKey' => $cacheKey, 'className' => $className]);

        } else {
            if ($this->allowDebug) Log::debug('DataHub reusing module instance', ['cacheKey' => $cacheKey]);
            if (method_exists($this->modules[$cacheKey], 'updatePathInfo')) {
                if ($this->allowDebug) Log::debug('[DataHub] Passing pathInfo to updatePathInfo', ['pathInfo' => $pathInfo, 'moduleClass' => get_class($this->modules[$cacheKey]), 'hash' => spl_object_hash($this->modules[$cacheKey])]);
                $this->modules[$cacheKey]->updatePathInfo($pathInfo);
            } else {
                if ($this->allowDebug) Log::warning('[DataHub] Module does not have updatePathInfo method', ['moduleClass' => get_class($this->modules[$cacheKey])]);
            }
        }
        return $this->modules[$cacheKey];
    }

    public function getDisk(): FilesystemAdapter
    {
        return $this->disk;
    }

    public function getStateInstance($address, $pathInfo, $moduleInstance): InstructionProcessor
    {
        if (!isset($this->states[$address])) {
            if ($this->allowDebug) Log::debug('[DataHub::getStateInstance] Creating NEW InstructionProcessor instance', ['address' => $address, 'moduleClass' => get_class($moduleInstance), 'moduleOperation' => $this->getModuleOperation($moduleInstance)]);
            $this->states[$address] = new InstructionProcessor($this, $address, $pathInfo, $moduleInstance);
        } else {
            $existingState = $this->states[$address];

            if (!($existingState instanceof InstructionProcessor)) {
                Log::error("[DataHub::getStateInstance] Cached state for address '{$address}' is not an InstructionProcessor instance!", ['type' => get_class($existingState)]);
                $this->states[$address] = new InstructionProcessor($this, $address, $pathInfo, $moduleInstance);
                return $this->states[$address];
            }

            $existingModuleHash = $existingState->module ? spl_object_hash($existingState->module) : 'null';
            $newModuleHash = $moduleInstance ? spl_object_hash($moduleInstance) : 'null';

            if ($this->allowDebug) Log::debug('[DataHub::getStateInstance] Reusing EXISTING InstructionProcessor instance', [
                'address' => $address,
                'existingModuleHash' => $existingModuleHash,
                'newModuleHash' => $newModuleHash,
                'existingOperation' => $this->getModuleOperation($existingState->module),
                'newModuleOperation' => $this->getModuleOperation($moduleInstance)
            ]);

            $existingState->pathInfo($pathInfo);
            $existingState->setModule($moduleInstance);

            if ($this->allowDebug) Log::debug('[DataHub::getStateInstance] Updated existing InstructionProcessor instance', ['address' => $address, 'finalOperation' => $this->getModuleOperation($existingState->module)]);
        }
        return $this->states[$address];
    }

    protected function getModuleOperation($moduleInstance)
    {
        if (!$moduleInstance) return 'N/A';
        try {
            if (property_exists($moduleInstance, 'operation')) {
                $reflection = new ReflectionClass($moduleInstance);
                $property = $reflection->getProperty('operation');
                return $property->getValue($moduleInstance);
            }
            return 'PropNotFound';
        } catch (ReflectionException $e) {
            return 'ErrorReflection';
        } catch (Error $e) {
            Log::warning("[DataHub::getModuleOperation] Error accessing operation property", ['error' => $e->getMessage()]);
            return 'ErrorAccessing';
        }
    }

    /**
     * Get the disk name associated with this session.
     *
     * @return string
     */
    public function getDiskName(): string
    {
        return $this->diskName;
    }

    public function saveAll()
    {
        foreach ($this->modules as $module) {
            if (method_exists($module, 'save')) {
                try {
                    $module->save();
                } catch (Throwable $e) {
                    Log::error("[DataHub::saveAll] Error saving module", ['moduleClass' => get_class($module), 'error' => $e->getMessage()]);
                }
            }
        }
    }

    public static function save($address, $data, $diskName = null)
    {
        if ($diskName !== null) {
            Log::debug('[DataHub::save (static)] Using specified disk', ['disk' => $diskName]);
            $storage = new self($diskName);
        } else {
            Log::debug('[DataHub::save (static)] Using default static disk');
            $storage = self::getDefaultStorage();
        }

        return $storage->address($address)->set($data)->save();
    }

    public function clear()
    {
        $this->states = [];
        $this->modules = [];
        Log::debug("[DataHub::clear] Cleared states and modules.");
    }

    public function __call($name, $arguments)
    {
        Log::warning("[DataHub::__call] Direct call to DataHub::{$name}() is likely deprecated. Use address() method.");
        throw new BadMethodCallException("Direct calls like {$name}() are not supported on DataHub. Use ->address('...')->{$name}() instead.");
    }

    public function getCurrentPath(): string
    {
        return $this->get('current_path', '/');
    }

    public function get(string $key, $default = null)
    {
        $key = StringHelper::normalizeKey($key);
        $value = ArrayHelper::get($this->data, $key, $default);

        LogHelper::debug('DataHub::get', 'Got value for key', [
            'key' => $key,
            'exists' => $value !== $default
        ]);

        return $value;
    }

    public function set(string $key, $value): bool
    {
        $key = StringHelper::normalizeKey($key);
        $path = StorageHelper::getStoragePath($this->basePath, $key);

        $data = [
            'value' => $value,
            'updated_at' => time()
        ];

        if (!StorageHelper::writeJsonFile($this->disk, $path, $data)) {
            LogHelper::error('DataHub::set', 'Failed to write JSON file', [
                'key' => $key,
                'path' => $path
            ]);
            return false;
        }

        ArrayHelper::set($this->data, $key, $value);
        StorageHelper::saveToCache($this->cacheKey, $this->data);

        LogHelper::info('DataHub::set', 'Successfully set value', [
            'key' => $key
        ]);

        return true;
    }

    public function delete(string $key): bool
    {
        $key = StringHelper::normalizeKey($key);
        $path = StorageHelper::getStoragePath($this->basePath, $key);

        if (!StorageHelper::deleteFile($this->disk, $path)) {
            LogHelper::error('DataHub::delete', 'Failed to delete file', [
                'key' => $key,
                'path' => $path
            ]);
            return false;
        }

        ArrayHelper::forget($this->data, $key);
        StorageHelper::saveToCache($this->cacheKey, $this->data);

        LogHelper::info('DataHub::delete', 'Successfully deleted key', [
            'key' => $key
        ]);

        return true;
    }

    public function has(string $key): bool
    {
        $key = StringHelper::normalizeKey($key);
        $exists = ArrayHelper::has($this->data, $key);

        LogHelper::debug('DataHub::has', 'Checked key existence', [
            'key' => $key,
            'exists' => $exists
        ]);

        return $exists;
    }

    public function all(): array
    {
        LogHelper::debug('DataHub::all', 'Getting all data', [
            'count' => count($this->data)
        ]);
        return $this->data;
    }

    public function getMultiple(array $keys, $default = null): array
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $this->get($key, $default);
        }

        LogHelper::debug('DataHub::getMultiple', 'Got multiple values', [
            'keys' => $keys,
            'count' => count($result)
        ]);

        return $result;
    }

    public function setMultiple(array $values): bool
    {
        $success = true;
        foreach ($values as $key => $value) {
            if (!$this->set($key, $value)) {
                $success = false;
            }
        }

        LogHelper::debug('DataHub::setMultiple', 'Set multiple values', [
            'keys' => array_keys($values),
            'success' => $success
        ]);

        return $success;
    }

    public function deleteMultiple(array $keys): bool
    {
        $success = true;
        foreach ($keys as $key) {
            if (!$this->delete($key)) {
                $success = false;
            }
        }

        LogHelper::debug('DataHub::deleteMultiple', 'Deleted multiple keys', [
            'keys' => $keys,
            'success' => $success
        ]);

        return $success;
    }

    public function getBasePath(): string
    {
        return $this->basePath;
    }
}
