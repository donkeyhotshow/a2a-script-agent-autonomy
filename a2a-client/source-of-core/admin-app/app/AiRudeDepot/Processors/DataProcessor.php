<?php

namespace App\AiRudeDepot\Processors;

use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Processors\InstructionProcessor\StorageHelper;
use App\AiRudeDepot\Storage\DataHub;
use Exception;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use JsonException;
use Throwable;
use App\Helpers\JsonHelper;

// Use File facade for app path access

// Use base Exception

/**  бывший Modificator
 * Central engine for applying reusable data transformations ("modificators").
 *
 * Handles loading modificator definitions (JSON Instructions or Static PHP classes)
 * and executing their logic within the correct storage context.
 * Allows chaining multiple modificators fluently.
 *

 */
class DataProcessor
{
    use StorageHelper;

    public static $listForPhp = [
        'WalkForAssetUrls',
        'WalkForForms',
        'ExecuteInstructions',
        'WalkForOperations'
    ];

    // Storage for processing data
    public DataHub $commonStorage; // Explicitly type hint
    public $data;
    public $modificators = [];
    public StepResponse $response; // Explicitly type hint

    // Inject DataHub for common data processing
    public function __construct($data = null, DataHub $commonStorage, StepResponse $response)
    {
        // FIX: Default data to empty array if null is passed
        $this->data = $data ?? [];
        $this->response = $response;
        $this->commonStorage = $commonStorage; // Use injected storage for data

        $this->initializeActionHandlers(); // Initialize action handlers from StorageHelper trait

        // Log the common storage info
        Log::debug("[DataProcessor::__construct] Initialized with commonStorage", [
            'storage_hash' => spl_object_hash($this->commonStorage),
            'common_disk_name' => $this->commonStorage->diskName ?? 'N/A',
            'response_hash' => spl_object_hash($this->response)
        ]);
    }

    public static function __callStatic($name, $arguments)
    {
        // Create DataHub with default disk name instead of resolving from container
        $defaultDisk = config('filesystems.default', 'local');
        $commonStorage = new DataHub($defaultDisk);
        Log::debug("[DataProcessor::__callStatic] Created DataHub for static call", [
            'diskName' => $defaultDisk,
            'storage_hash' => spl_object_hash($commonStorage)
        ]);

        // Use the created DataHub instance
        $instance = new DataProcessor(null, $commonStorage, new StepResponse());
        return $instance->$name(...$arguments); // Return the instance after calling the method
    }

    public static function data($data, DataHub $commonStorage)
    {
        Log::debug("[DataProcessor::data] Using provided DataHub", [
            'storage_hash' => spl_object_hash($commonStorage),
            'diskName' => $commonStorage->getDiskName()
        ]);

        $modificator = new DataProcessor($data, $commonStorage, new StepResponse());
        return $modificator;
    }

    public function result()
    {
        return $this->data;
    }

    public function response()
    {
        return $this->response;
    }

    public function __call($name, $arguments)
    {
        Log::debug("[DataProcessor::__call] Attempting modifier '{$name}'", ['arguments' => $arguments]);
        $modifierPathBase = __DIR__ . '/DataProcessor';
        $phpModifierClass = '\\App\\AiRudeDepot\\Processors\\DataProcessor\\Php\\' . Str::studly($name);
        $jsonPath = $modifierPathBase . '/Json/' . $name . '.json';

        // Initialize jsonModifierExecuted
        $jsonModifierExecuted = false;

        // Prefer PHP modifiers if they exist
        if (class_exists($phpModifierClass)) {
            Log::debug("[DataProcessor::__call] Detected PHP modifier: {$phpModifierClass}");

            if (method_exists($phpModifierClass, 'process')) {
                try {
                    // Assuming static process method modifies $this->data or returns new data
                    // Pass $this->data by reference and arguments.
                    $dataRef = &$this->data;
                    // FIX: Pass DataHub as the second argument, then spread the rest
                    $result = $phpModifierClass::process($dataRef, $this->commonStorage, ...$arguments);
                    // $result = $phpClassName::process($dataRef, ...$arguments); // Original incorrect call

                    // $this->data is now updated by reference if the method supports it.
                    // If the method returns data, we might overwrite it - clarify convention.
                    // FIX: Overwrite $this->data if the process method returned a non-null result
                    if ($result !== null) {
                        $this->data = $result; // Use the explicit return value
                        Log::debug("[DataProcessor::__call] Modifier returned non-null result. Overwriting internal data.", ['result_type' => gettype($result)]);
                    }
                    Log::debug("[DataProcessor::__call] PHP modifier '{$name}' executed successfully.");
                    // REVERT: Return $this for chaining
                    // return $this->data;

                } catch (Throwable $e) {
                    Log::error("[DataProcessor::__call] Error executing PHP modifier '{$phpModifierClass}': " . $e->getMessage(), ['exception' => $e]);
                    $this->response->addHistory("Error executing modifier '{$name}': " . $e->getMessage(), 'error', $e->getTrace()); // Use addHistory for errors
                    $this->response->halt();
                    // Optionally re-throw or handle differently
                    // REVERT: Return $this even on error?
                    // return null; // Return null on error
                }
            } else {
                Log::error("[DataProcessor::__call] PHP modifier class or process method not found", ['class' => $phpModifierClass]);
                throw new Exception("PHP modifier class or process method not found: " . $phpModifierClass);
            }
        } else {
            // 2. Assume JSON Modificator
            Log::debug("[DataProcessor::__call] Assuming JSON modifier, checking path: {$jsonPath}");
            // Log the exact path being checked by File::exists
            Log::debug("[DataProcessor::__call] Exact jsonPath for File::exists check", ['path' => $jsonPath, 'name' => $name]);

            if (File::exists($jsonPath)) {
                try {
                    $jsonContent = File::get($jsonPath);
                    $modificatorData = json_decode($jsonContent, true, 512, JSON_THROW_ON_ERROR);

                    // Validate structure
                    if (!is_array($modificatorData)) {
                        throw new Exception("JSON content is not an array.");
                    }
                    // Relaxing type check - instructions might be the root
                    // if (!isset($modificatorData['type']) || $modificatorData['type'] !== 'Instructions') {
                    //    throw new Exception("Invalid or missing 'type': must be 'Instructions'.");
                    // }
                    $instructionsArray = $modificatorData['instructions'] ?? $modificatorData; // Allow instructions at root or under 'instructions' key
                    if (!is_array($instructionsArray)) {
                        throw new Exception("Missing or invalid 'instructions' array.");
                    }

                    Log::debug("[DataProcessor::__call] JSON modifier '{$name}' loaded. Running instructions.");
                    // Pass only the instructions array and arguments to runJson
                    $this->runJson($instructionsArray, $arguments);
                    // After runJson, $this->data holds the result from the 'output' buffer
                    // REVERT: Return $this for chaining
                    // return $this->data; // Return the resulting data

                    $this->runJson($instructionsArray, $arguments); // runJson modifies $this->response and buffers
                    $jsonModifierExecuted = true; // Mark as executed

                } catch (JsonException $e) {
                    Log::error("[DataProcessor::__call] Error decoding JSON modifier '{$name}': " . $e->getMessage(), ['path' => $jsonPath]);
                    $this->response->addHistory("Error decoding modifier definition '{$name}': " . $e->getMessage(), 'error', $e->getTrace());
                    $this->response->halt();
                    // REVERT: Return $this even on error?
                    // return null; // Return null on error
                } catch (Exception $e) {
                    Log::error("[DataProcessor::__call] Error processing JSON modifier '{$name}': " . $e->getMessage(), ['path' => $jsonPath, 'exception' => $e]);
                    $this->response->addHistory("Error processing modifier definition '{$name}': " . $e->getMessage(), 'error', $e->getTrace());
                    $this->response->halt();
                    // REVERT: Return $this even on error?
                    // return null; // Return null on error
                } catch (Throwable $e) { // Catch any other errors during file read/processing
                    Log::error("[DataProcessor::__call] General error with JSON modifier '{$name}': " . $e->getMessage(), ['path' => $jsonPath, 'exception' => $e]);
                    $this->response->addHistory("Error loading modifier definition '{$name}': " . $e->getMessage(), 'error', $e->getTrace());
                    $this->response->halt();
                    // REVERT: Return $this even on error?
                    // return null; // Return null on error
                }

                // FIX: If JSON modifier executed without halting, update $this->data from the 'output' buffer
                if ($jsonModifierExecuted && !$this->response->isHalted()) {
                    try {
                        $this->data = $this->commonStorage->address('output')->get();
                        Log::debug("[DataProcessor::__call] Updated internal data from 'output' buffer after JSON modifier '{$name}'.", ['data_type' => gettype($this->data)]);
                    } catch (Throwable $e) {
                        Log::error("[DataProcessor::__call] Error retrieving result from 'output' buffer after JSON modifier '{$name}': " . $e->getMessage(), ['exception' => $e]);
                        $this->response->addHistory("Failed to retrieve final result from 'output' buffer for modifier '{$name}'.", 'error', $e->getTrace());
                        $this->response->halt(); // Halt if we can't get the result
                        $this->data = null; // Ensure data is null on error
                    }
                }

            } else {
                Log::error("[DataProcessor::__call] Unknown modifier (PHP or JSON) or JSON file not found: '{$name}'", ['php_checked' => (isset($phpModifierClass) ? $phpModifierClass : 'N/A'), 'json_path_checked' => $jsonPath]);
                throw new Exception("Unknown modifier: " . $name);
            }
        }

        // FIX: Ensure the final DataHub state is attached to the response
        $this->response->setDataHub($this->commonStorage);

        // Return $this to allow chaining modifier calls
        return $this;
    }

    private function runJson($instructions, $arguments = [])
    {
        if (is_string($instructions)) {
            // Load instructions from JSON file using JsonHelper
            try {
                $instructionsArray = JsonHelper::loadFileInstructions($instructions, $this->commonStorage->getDiskName());
            } catch (Exception $e) {
                $this->response->addHistory($e->getMessage(), 'error');
                return $this->response->halt();
            }
        } elseif (is_array($instructions)) {
            $instructionsArray = $instructions;
        } else {
            $this->response->addHistory("Invalid instructions format provided to runJson.", 'error');
            return $this->response->halt();
        }

        // Set arguments into the 'args' buffer for instruction resolution
        $this->commonStorage->address('args')->set($arguments[0] ?? []);
        Log::debug("[DataProcessor::runJson] Set args buffer.", ['args' => ($arguments[0] ?? [])]);

        // FIX: Use $this->data (current processor data) instead of non-existent $this->initialData
        // Save current data to input/output buffers for instructions

        // Check if the data looks like an action request with a payload
        $inputData = $this->data;
        if (is_array($this->data) && isset($this->data['payload']) && isset($this->data['sendTo'])) {
            Log::debug("[DataProcessor::runJson] Using 'payload' from data for input buffer.");
            $inputData = $this->data['payload'];
        } else {
            Log::debug("[DataProcessor::runJson] Using entire data for input buffer.");
        }

        // Set the input buffer
        $this->commonStorage->address('input')->set($inputData ?? []); // Use resolved inputData or empty array

        // Initialize output buffer (should it be initialized with input or null? Let's keep null for actions)
        // $this->commonStorage->address('buffer:output')->set($this->data); // Initialize output with current data
        // $this->commonStorage->address('buffer:output')->set(null); // Ensure output starts null/empty for actions

        /* // Original logic:
        if ($this->data !== null) { // Check the actual data property
            $this->commonStorage->address('buffer:input')->set($this->data); // Use current data
            $this->commonStorage->address('buffer:output')->set($this->data); // Initialize output with current data
        } else {
            $this->commonStorage->address('buffer:input')->set([]); // Ensure input exists
            $this->commonStorage->address('buffer:output')->set(null); // Ensure output starts null/empty
        }
        */

        try {
            // FIX: Capture the response from executeInstructions and merge it
            $executionResponse = $this->executeInstructions($instructionsArray);
            $this->response->merge($executionResponse); // Merge history, console, halt status etc. (Required to get results from executeInstructions)
            // Optionally add the final data result if needed, though output buffer update in __call might be sufficient
            // $this->response->addData('result', $executionResponse->data);
        } catch (Exception $e) {
            $filePathInfo = is_string($instructions) ? "File: {$instructions}" : "Array Instructions";
            $this->response->addHistory("Error executing instructions ({$filePathInfo}): " . $e->getMessage(), 'error', $e->getTrace());
            $this->response->halt(); // Halt on execution error
        }

        // runJson should probably return void or $this, as it modifies $this->response
        // return $this->response; // Let's remove explicit return for now
    }

    /**
     * Loads action instructions from a file path using the instance's storage
     * and executes them.
     *
     * @param string $actionFilePath Path to the action instruction file relative to the storage disk root.
     * @return DataProcessor The DataProcessor instance containing the execution result.
     * @throws Exception If the action file cannot be loaded or instructions are invalid.
     */
    public function runActionInstructions(string $actionFilePath): self
    {
        Log::debug('[DataProcessor::runActionInstructions] Running action file.', [
            'actionFilePath' => $actionFilePath,
            'storageDisk' => $this->commonStorage->getDiskName(),
            'modificator_hash' => spl_object_hash($this)
        ]);
        try {
            $instructionData = $this->commonStorage->address($actionFilePath)->get();
            if (!$instructionData || !is_array($instructionData)) {
                Log::error('[DataProcessor::runActionInstructions] Failed to load valid data from file.', [
                    'actionFilePath' => $actionFilePath,
                    'loaded_data_type' => gettype($instructionData)
                ]);
                $this->response->addHistory("Action file '{$actionFilePath}' not found or did not contain an array.", 'error', debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS));
                $this->response->halt();
                return $this;
            }
            if (!isset($instructionData['type']) || $instructionData['type'] !== 'Instructions' || !isset($instructionData['instructions']) || !is_array($instructionData['instructions'])) {
                Log::warning('[DataProcessor::runActionInstructions] Data loaded from action file does not appear to be standard instructions format.', [
                    'actionFilePath' => $actionFilePath,
                    'keys' => array_keys($instructionData)
                ]);
                $instructionsArray = $instructionData;
            } else {
                $instructionsArray = $instructionData['instructions'];
            }
            Log::debug('[DataProcessor::runActionInstructions] Executing loaded instructions.', ['count' => count($instructionsArray)]);
            $this->runJson($instructionsArray, []);
            Log::debug('[DataProcessor::runActionInstructions] Finished executing instructions.', [
                'actionFilePath' => $actionFilePath,
                'isHalted' => $this->response->isHalted()
            ]);
        } catch (Throwable $e) {
            Log::error('[DataProcessor::runActionInstructions] Error processing action file.', [
                'actionFilePath' => $actionFilePath,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->response->addHistory("Error processing action file '{$actionFilePath}': " . $e->getMessage(), 'error', explode(PHP_EOL, $e->getTraceAsString()));
            $this->response->halt();
        }
        return $this;
    }

    /**
     * Loads action instructions from a file path using the instance's storage
     * and executes them using the runJson method.
     *
     * @param string $actionFilePath Path to the action instruction file relative to the storage disk root.
     * @return DataProcessor The DataProcessor instance containing the execution result.
     */
    public function processActionFile(string $actionFilePath): self
    {
        Log::debug('[DataProcessor::processActionFile] Processing action file.', [
            'actionFilePath' => $actionFilePath,
            'storageDisk' => $this->commonStorage->getDiskName(),
            'processor_hash' => spl_object_hash($this)
        ]);
        try {
            $instructionData = $this->commonStorage->address($actionFilePath)->get();
            if (!$instructionData || !is_array($instructionData)) {
                Log::error('[DataProcessor::processActionFile] Failed to load valid data from file.', [
                    'actionFilePath' => $actionFilePath,
                    'loaded_data_type' => gettype($instructionData)
                ]);
                $this->response->addHistory("Action file '{$actionFilePath}' not found or did not contain an array.", 'error', debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS));
                $this->response->halt();
                return $this;
            }
            $instructionsArray = null;
            if (isset($instructionData['instructions']) && is_array($instructionData['instructions'])) {
                if (isset($instructionData['type']) && $instructionData['type'] === 'Instructions') {
                    Log::debug('[DataProcessor::processActionFile] Found standard {type: Instructions, instructions: [...]} format.');
                    $instructionsArray = $instructionData['instructions'];
                } else {
                    Log::warning('[DataProcessor::processActionFile] Found `instructions` key, but `type` is missing or not Instructions. Using `instructions` array anyway.', ['keys' => array_keys($instructionData)]);
                    $instructionsArray = $instructionData['instructions'];
                }
            } elseif (isset($instructionData[0])) {
                Log::warning('[DataProcessor::processActionFile] Data does not have standard {type: Instructions, instructions: [...]} format. Assuming it is a raw array of instructions.', ['keys' => array_keys($instructionData)]);
                $instructionsArray = $instructionData;
            } else {
                Log::error('[DataProcessor::processActionFile] Loaded data is not a valid instructions array or standard format.', ['actionFilePath' => $actionFilePath]);
                $this->response->addHistory("Action file '{$actionFilePath}' does not contain a valid instructions array.", 'error', debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS));
                $this->response->halt();
                return $this;
            }
            Log::debug('[DataProcessor::processActionFile] Executing instructions.', ['count' => count($instructionsArray)]);
            $this->runJson($instructionsArray, []);
            Log::debug('[DataProcessor::processActionFile] Finished executing action file.', [
                'actionFilePath' => $actionFilePath,
                'isHalted' => $this->response->isHalted()
            ]);
        } catch (Throwable $e) {
            Log::error('[DataProcessor::processActionFile] Error processing action file.', [
                'actionFilePath' => $actionFilePath,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->response->addHistory("Error processing action file '{$actionFilePath}': " . $e->getMessage(), 'error', explode(PHP_EOL, $e->getTraceAsString()));
            $this->response->halt();
        }
        return $this;
    }
}
