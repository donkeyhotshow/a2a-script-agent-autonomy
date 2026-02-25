<?php

/**
 * InstructionProcessor
 *
 * Этот класс обрабатывает инструкции и вызывает соответствующие методы у модулей данных
 * (File, Buffer, Model и т.д.), определенных по формату адреса (buffer:, file!, etc.).
 * Он является связующим звеном между инструкциями и низкоуровневыми операциями с хранилищем.
 *
 * Основные зависимости:
 * - DataHub: Используется для определения и получения экземпляров модулей данных на основе адресов.
 * - Модули данных (App\AiRudeDepot\Storage\Data\Controllers\*): Предоставляют фактическую логику работы
 *   с различными типами хранилищ (файлы, буферы, базы данных).
 * - Хелперы (DataManipulateHelper, StorageHelper, PathHelper и т.д.): Используются для
 *   низкоуровневых операций с данными, путями и хранилищем.
 *
 * См. также:
 * - Стандарт: /c:/apps/admin-app/prompts/version-5/standards/low-level-storage.md (описание адресов и взаимодействия с модулями)
 * - Классы модулей данных: app/AiRudeDepot/Storage/Data/Controllers/
 * - Классы хелперов: app/Helpers/
 *
 */

namespace App\AiRudeDepot\Processors;

use App\AiRudeDepot\Processors\InstructionProcessor\DataManipulateHelper;
use App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper;
use App\AiRudeDepot\Storage\DataHub;
use Exception;
use Illuminate\Support\Facades\Log;
use ReflectionClass;
use ReflectionException;

class InstructionProcessor
{
    use StorageHelper;

    public $module;
    public $keyPath;
    public DataHub $storage;
    public $address;
    public $editable = true;
    public $filePath;
    public $moduleName;
    public $actionHandlers;
    public $data = [];
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    public function __construct(DataHub $storage, $originalAddress = null, $pathInfo = null, $module = null)
    {
        $this->storage = $storage;
        $this->address = $originalAddress;
        if ($module) $this->module = $module;
        if ($pathInfo) $this->pathInfo($pathInfo);
        Log::debug('[InstructionProcessor::__construct] Instance created/updated', ['hash' => spl_object_hash($this), 'address' => $this->address, 'module_hash' => $this->module ? spl_object_hash($this->module) : 'null']);
    }

    public function pathInfo($pathInfo)
    {
        $this->moduleName = $pathInfo['moduleName'] ?? null;
        $this->filePath = $pathInfo['filePath'] ?? null;
        $this->keyPath = $pathInfo['keyPath'] ?? [];
        $this->address = $pathInfo['pathName'] ?? $this->address;
        Log::debug('[InstructionProcessor::pathInfo] Updated', ['hash' => spl_object_hash($this), 'address' => $this->address, 'keyPath' => $this->keyPath, 'moduleName' => $this->moduleName]);
        return $this;
    }

    public function data($what)
    {
        $this->data['data'] = $what;
        $this->module->set($this->keyPath, $what);
        return $this;
    }

    public function set($what = null)
    {
        if (!$this->module) {
            if ($this->allowDebug)
                Log::warning("[InstructionProcessor::set] Module not set for address: {$this->address}. Skipping set.");
            return $this;
        }
        if ($this->allowDebug)
            Log::debug("[InstructionProcessor::set] Attempting set.", [
                'instruction_processor_hash' => spl_object_hash($this),
                'module_class' => get_class($this->module),
                'keyPath' => $this->keyPath,
                'value_to_set' => $what
            ]);

        $this->module->set($this->keyPath, $what);

        if ($this->allowDebug)
            Log::debug("[InstructionProcessor::set] Module set operation completed.", ['instruction_processor_hash' => spl_object_hash($this)]);
        return $this;
    }

    public function update()
    {
        if (isset($this->data['action'])) {
            if ($this->allowVerbosity) {
                print_r('<br>----------sdf--------------ffff<br>');
                print_r($this->data);
                exit;
            }
        }
        return $this;
    }

    public function getData($default = null)
    {
        return $this->data;
    }

    public function save()
    {
        if ($this->allowDebug)
            Log::debug('[InstructionProcessor::save] Attempting save operation.', [
                'module_class' => $this->module ? get_class($this->module) : 'null',
                'address' => $this->address,
                'instruction_processor_hash' => spl_object_hash($this),
                'module_hash' => $this->module ? spl_object_hash($this->module) : 'null',
            ]);

        if (!$this->module) {
            Log::error('[InstructionProcessor::save] No module instance available.', ['hash' => spl_object_hash($this)]);
            return false;
        }

        if (method_exists($this->module, 'setOperation') && property_exists($this->module, 'parameters')) {
            $moduleParameters = [];
            if (method_exists($this->module, 'getParameters')) {
                $moduleParameters = $this->module->getParameters();
            } else {
                try {
                    $reflection = new ReflectionClass($this->module);
                    if ($reflection->hasProperty('parameters')) {
                        $property = $reflection->getProperty('parameters');
                        $moduleParameters = $property->getValue($this->module);
                    }
                } catch (ReflectionException $e) {
                    Log::warning('[InstructionProcessor::save] Could not access module parameters via reflection.', ['error' => $e->getMessage()]);
                }
            }

            $isUpdateContext = !empty($moduleParameters['id']);

            if ($isUpdateContext) {
                Log::debug('[InstructionProcessor::save] Setting module operation to: update (based on module params)', ['hash' => spl_object_hash($this), 'module_params' => $moduleParameters]);
                $this->module->setOperation('update');
            } else {
                Log::debug('[InstructionProcessor::save] Setting module operation to: insert (based on module params)', ['hash' => spl_object_hash($this), 'module_params' => $moduleParameters]);
                $this->module->setOperation('insert');
            }
        } else {
            Log::warning('[InstructionProcessor::save] Module missing setOperation method or parameters property/getter. Cannot set operation explicitly.', ['module_class' => get_class($this->module)]);
        }

        try {
            Log::info('[InstructionProcessor::save] >>> Calling $this->module->save()', [
                'instruction_processor_hash' => spl_object_hash($this),
                'module_hash' => spl_object_hash($this->module),
                'module_class' => get_class($this->module)
            ]);
            $result = $this->module->save();
            Log::info('[InstructionProcessor::save] <<< Returned from $this->module->save()', ['result' => $result]);
            if ($this->allowDebug)
                Log::debug('[InstructionProcessor::save] Module save() call completed.', [
                    'result' => $result,
                    'instruction_processor_hash' => spl_object_hash($this)
                ]);
            return $result;
        } catch (Exception $e) {
            Log::error('[InstructionProcessor::save] Exception during module save operation.', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'hash' => spl_object_hash($this),
            ]);
            return false;
        }
    }

    public function remove($keyPath = null)
    {
        if ($this->allowDebug)
            Log::debug('[InstructionProcessor::remove] Attempting remove operation.', [
                'module_class' => $this->module ? get_class($this->module) : 'null',
                'effective_keyPath' => $keyPath ?? $this->keyPath ?? [],
                'instruction_processor_hash' => spl_object_hash($this),
                'module_hash' => $this->module ? spl_object_hash($this->module) : 'null',
            ]);

        if (!$this->module) {
            Log::error('[InstructionProcessor::remove] No module instance available.', ['hash' => spl_object_hash($this)]);
            return $this;
        }

        $effectiveKeyPath = $keyPath ?? $this->keyPath;

        // --- Add Check (Placeholder) ---
        // If the module uses StorageHelper::removeNestedValue, that helper needs the check.
        // If the module has its own remove(), the check needs to be there.
        // For now, we add a basic check here, but the root cause might be in the module's logic or StorageHelper.
        $dataToCheck = $this->get(); // Get the data the module would operate on
        if ($effectiveKeyPath && !is_array($dataToCheck)) {
            Log::warning('[InstructionProcessor::remove] Target data is not an array, cannot remove nested key.', ['address' => $this->address, 'keyPath' => $effectiveKeyPath, 'data_type' => gettype($dataToCheck)]);
            // Depending on desired behavior, we might return $this or let the module handle it.
            // For safety, let's return here if we know a nested removal will fail.
            if (empty($effectiveKeyPath)) {
                Log::warning('[InstructionProcessor::remove] Attempting to remove root on non-array data. Check module logic.');
                // Let module handle root removal attempt
            } else {
                return $this; // Prevent attempt to remove nested key from non-array
            }
        }
        // --- End Check ---

        if (method_exists($this->module, 'remove')) {
            Log::debug('[InstructionProcessor::remove] Module has its own remove() method. Calling it directly.', ['hash' => spl_object_hash($this)]);
            try {
                Log::info('[InstructionProcessor::remove] >>> Calling $this->module->remove()', [
                    'hash' => spl_object_hash($this),
                    'module_hash' => spl_object_hash($this->module),
                    'module_class' => get_class($this->module),
                    'key_path_arg' => $effectiveKeyPath
                ]);
                $this->module->remove($effectiveKeyPath);
                Log::info('[InstructionProcessor::remove] <<< Returned from $this->module->remove()');
                Log::debug('[InstructionProcessor::remove] Module remove() call completed.', ['hash' => spl_object_hash($this)]);
            } catch (Exception $e) {
                Log::error('[InstructionProcessor::remove] Exception during direct module remove() call.', [
                    'exception' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'hash' => spl_object_hash($this),
                ]);
            }
            return $this;
        }

        Log::debug('[InstructionProcessor::remove] Module does not have a remove() method and fallback not implemented here.', ['module_class' => get_class($this->module)]);
        return $this;
    }

    public function get($keyPath = null)
    {
        $effectiveKeyPath = $keyPath ?? $this->keyPath;

        if (!$this->module) {
            if ($this->allowDebug)
                Log::warning("[InstructionProcessor::get] Module not set for address: {$this->address}. Returning null.");
            return null;
        }

        if ($this->allowDebug)
            Log::debug('[InstructionProcessor::get] Calling module->get()', [
                'instruction_processor_hash' => spl_object_hash($this),
                'module_hash' => $this->module ? spl_object_hash($this->module) : 'null_module',
                'module_class' => $this->module ? get_class($this->module) : 'null_module',
                'effective_key_path' => $effectiveKeyPath,
            ]);

        $result = $this->module->get($effectiveKeyPath);

        $resultType = is_object($result) ? get_class($result) : gettype($result);
        if ($this->allowDebug)
            Log::debug("[InstructionProcessor::get] Result received from module", [
                'module_type' => $this->module ? get_class($this->module) : 'null_module',
                'result_type' => $resultType,
                'result_preview' => is_array($result) ? 'Array(count=' . count($result) . ')' : (is_object($result) ? 'Object' : $result)
            ]);

        return $result;
    }

    public function __toString()
    {
        return (string)$this->address;
    }

    public function output()
    {
        return json_encode($this->get(), JSON_PRETTY_PRINT);
    }

    public function find(array $options)
    {
        if (isset($options['field'])) {
            $options['attr'] = $options['field'];
            unset($options['field']);
        }
        $currentData = $this->get();

        if (!is_array($currentData)) {
            Log::warning('[InstructionProcessor::find] Data is not an array, cannot search.', ['address' => $this->address, 'data_type' => gettype($currentData)]);
            return null;
        }

        $result = DataManipulateHelper::searchInData($this->storage, $currentData, $options);
        return $result;
    }

    public function setModule($moduleInstance)
    {
        $oldHash = $this->module ? spl_object_hash($this->module) : 'null';
        $newHash = $moduleInstance ? spl_object_hash($moduleInstance) : 'null';
        if ($this->allowDebug)
            Log::debug('[InstructionProcessor::setModule] Updating module instance', [
                'instruction_processor_hash' => spl_object_hash($this),
                'old_module_hash' => $oldHash,
                'new_module_hash' => $newHash,
                'new_module_class' => $moduleInstance ? get_class($moduleInstance) : 'null'
            ]);
        $this->module = $moduleInstance;
        return $this;
    }
}

