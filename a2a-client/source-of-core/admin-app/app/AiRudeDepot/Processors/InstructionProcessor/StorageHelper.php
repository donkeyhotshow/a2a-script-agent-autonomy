<?php

namespace App\AiRudeDepot\Processors\InstructionProcessor;

use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Storage\DataHub;
use App\Helpers\JsonHelper;
use App\Models\Item;
use Exception;
use Illuminate\Support\Facades\Log;
use LogicException;

/**
 * Trait ProcessInstruction
 *
 * Provides the core logic for executing a sequence of instructions defined as JSON objects.
 * This trait is used by classes like Modificator to implement declarative data processing flows.
 * It interprets actions (update, save, for, call, etc.) and interacts with a DataHub instance.
 *
 * @see \docs\core\AiRudeDepot\Render\ProcessInstruction.md Detailed documentation of instructions and parameters.
 */
trait StorageHelper
{


    private function initializeActionHandlers()
    {
        //  Log::debug("[StorageHelper::initializeActionHandlers] Initializing action handlers map.");
        $this->actionHandlers = [

            'comment' => fn($instruction) => $this->handleComment($instruction),
            'coment' => fn($instruction) => $this->handleComment($instruction),
            'update' => fn($instruction) => $this->handleUpdate($instruction),
            'save' => fn($instruction) => $this->handleSave($instruction),
            'print_r' => fn($instruction) => $this->printValue($instruction),
            'for' => fn($instruction) => $this->processForLoop($instruction),
            'add' => fn($instruction) => $this->addToArray($instruction),
            'remove' => fn($instruction) => $this->handleRemove($instruction),
            'call' => fn($instruction) => $this->processCall($instruction),
            'return' => fn($instruction) => $this->handleReturn($instruction),
        ];
    }

    private function handleComment($instruction)
    {
        //  Log::debug("[StorageHelper::handleComment] Skipping comment.", ['instruction' => $instruction]);
        return new StepResponse(); // Return empty response
    }

    private function handleUpdate($instruction): StepResponse
    {
        // Log::debug("[StorageHelper::handleUpdate] Processing 'update' action (could be single or batch).");
        $response = new StepResponse();

        // Check the main instruction condition first
        if (isset($instruction['condition'])) {
            $condition = $instruction['condition'];
            // Log::debug("[StorageHelper::handleUpdate] Evaluating main condition.", ['condition' => $condition]);
            $conditionValue = DataManipulateHelper::evaluateCondition($this->commonStorage, $condition);
            $response->addHistory('condition ' . JsonHelper::encode($condition) . ' = ' . $conditionValue);
            // Log::debug("[StorageHelper::handleUpdate] Main condition result.", ['result' => $conditionValue]);
            // If main condition fails, return early
            if (!$conditionValue) return $response;
        }

        if (isset($instruction['batch'])) {
            // Log::debug("[StorageHelper::handleUpdate] Handling batch update.", ['batch_count' => count($instruction['batch'])]);
            foreach ($instruction['batch'] as $index => $item) {
                // Log::debug("[StorageHelper::handleUpdate] Processing batch item index {$index}.");
                // Skip disabled items
                if (isset($item['disabled']) && $item['disabled'] === true) {
                    // Log::debug("[StorageHelper::handleUpdate] Batch item {$index} disabled, skipping.");
                    continue;
                }

                // If this is a nested batch, recursively handle it
                if (isset($item['batch'])) {
                    // Log::debug("[StorageHelper::handleUpdate] Batch item {$index} is a nested batch, recursing.");
                    $response->merge($this->handleUpdate($item));
                } else {
                    // Log::debug("[StorageHelper::handleUpdate] Processing batch item {$index} via actionUpdate.");
                    // Process the batch item, actionUpdate already handles conditions
                    $response->merge($this->actionUpdate($item));
                }
                if ($response->isHalted()) {
                    // Log::warning("[StorageHelper::handleUpdate] Execution halted during batch processing at index {$index}.");
                    break; // Stop processing batch if halted
                }
            }
        } else {
            // Log::debug("[StorageHelper::handleUpdate] Handling single update via actionUpdate.");
            // Process a single update item
            $response->merge($this->actionUpdate($instruction));
        }
        // Log::debug("[StorageHelper::handleUpdate] Finished 'update' action processing.");
        return $response;
    }

    private function actionUpdate($instruction): StepResponse
    {
        // Log::debug("[StorageHelper::actionUpdate] Processing single update action.", ['instruction' => $instruction]);
        $response = new StepResponse();

        // Check condition first before proceeding
        if (isset($instruction['condition'])) {
            $condition = $instruction['condition'];
            // Log::debug("[StorageHelper::actionUpdate] Evaluating condition.", ['condition' => $condition]);
            $conditionValue = DataManipulateHelper::evaluateCondition($this->commonStorage, $condition);
            // Log::debug("[StorageHelper::actionUpdate] Condition result.", ['result' => $conditionValue]);
            if (!$conditionValue) return $response; // Skip if condition false
        }

        // Check if 'action' is specified for a nested instruction
        if (isset($instruction['action']) && $instruction['action'] !== 'update') {
            // Log::warning("[StorageHelper::actionUpdate] Skipping non-update action.", ['action' => $instruction['action']]);
            $response->addHistory('Skipping non-update action in actionUpdate: ' . $instruction['action']);
            return $response;
        }

        // Determine source and target
        $hasDataSource = isset($instruction['from']) || isset($instruction['address']);
        $hasValue = isset($instruction['value']);
        $hasTarget = isset($instruction['to']);
        // Log::debug("[StorageHelper::actionUpdate] Source/Target check", ['hasDataSource' => $hasDataSource, 'hasValue' => $hasValue, 'hasTarget' => $hasTarget]);

        // Validate presence of source/value and target
        if (!$hasDataSource && !$hasValue) {
            // Log::warning("[StorageHelper::actionUpdate] No source (from/address) or value specified.", ['instruction' => $instruction]);
            if (isset($instruction['batch'])) {
                return $response;
            } // Allow batch containers
            $response->addHistory('Warning: No source (from/address) or value specified for update', 'warning');
            return $response;
        }
        if (!$hasTarget) {
            // Log::warning("[StorageHelper::actionUpdate] No target ('to') specified.", ['instruction' => $instruction]);
            $response->addHistory('Warning: No target specified for update', 'warning');
            return $response;
        }

        // Process the data source or value
        $data = null; // Initialize $data
        if ($hasDataSource) {
            // Log::debug("[StorageHelper::actionUpdate] Resolving data from source address.");
            $data = $this->handleSource($instruction);
        } else { // hasValue must be true here
            // Log::debug("[StorageHelper::actionUpdate] Using direct 'value'.");
            $data = $instruction['value'];
            // Resolve potential placeholders within the direct value
            DataHub::processResolveInstruction($data, $this->commonStorage);
            // Log::debug("[StorageHelper::actionUpdate] Resolved direct 'value'.", ['resolved_value_type' => gettype($data)]);
        }

        // Process the target address
        $to = $instruction['to'];
        DataHub::processResolveInstruction($to, $this->commonStorage); // Resolve placeholders in target address
        // Log::debug("[StorageHelper::actionUpdate] Setting value to target.", ['target_address' => $to, 'data_type' => gettype($data)]);

        // Perform the set and save
        $saveResult = $this->commonStorage->address($to)->set($data)->save(); // Assuming set returns the address instance for chaining save
        // Log::debug("[StorageHelper::actionUpdate] Save result.", ['result_type' => gettype($saveResult), 'result' => $saveResult]);
        $response->addHistory('update ' . $to . ' = ' . json_encode($data) . ' | Save Result: ' . json_encode($saveResult));

        return $response;
    }

    private function handleSource($instruction)
    {
        //  Log::debug("[StorageHelper::handleSource] Resolving data source.", ['instruction' => $instruction]);
        $from = $instruction['from'] ?? $instruction['address'] ?? null;
        $with = $instruction['with'] ?? null;
        $key = $instruction['key'] ?? null;
        $find = $instruction['find'] ?? null;
        $value = $instruction['value'] ?? null;

        // Special handling for legacy MySQL paths with json_decode
        $isLegacyMysql = is_string($from) && strpos($from, 'mysql!') === 0 &&
            strpos($from, ':') === false && $with === 'json_decode';
        //  Log::debug("[StorageHelper::handleSource] Source details", ['from' => $from, 'with' => $with, 'key' => $key, 'find_type' => gettype($find), 'value_set' => isset($instruction['value']), 'isLegacyMysql' => $isLegacyMysql]);

        $data = null;
        if (in_array('value', array_keys($instruction))) {
            //  Log::debug("[StorageHelper::handleSource] Using direct 'value' from instruction.");
            if ($value) {
                // Assuming $this->storage is the DataHub instance from DataProcessor
                DataHub::processResolveInstruction($value, $this->commonStorage); // Resolve potential placeholders in the value itself
                //  Log::debug("[StorageHelper::handleSource] Resolved direct 'value'.", ['resolved_value_type' => gettype($value)]);
            }
            $data = $value;
        } else {
            if (!$from) {
                Log::error("[StorageHelper::handleSource] 'from' or 'address' is required but not provided.", ['instruction' => $instruction]);
                throw new Exception("Error in ProcessingActions::handleSource: 'from' or 'address' is required but not provided. Instruction: " . JsonHelper::encode($instruction));
            }
            //  Log::debug("[StorageHelper::handleSource] Using 'from'/'address' source.", ['source_address' => $from]);

            // --- START: Refactored Item model filtering ---
            $isItemModelAddress = is_string($from) && strpos($from, 'model!Item') === 0;
            $canOptimizeFind = false;
            $sourceAddressForGet = $from; // Start with original address

            // Check if $find is a simple attribute-value filter for address or type on Item model
            if ($isItemModelAddress && is_array($find) && isset($find['attr']) && isset($find['value'])) {
                $attribute = $find['attr'];
                // Check if attribute is address or type AND it's a simple equality check (no complex operator)
                // Simple equality is the implicit operator when only 'attr' and 'value' are provided in $find
                if (($attribute === 'address' || $attribute === 'type') && count($find) === 2) {
                     // Reconstruct the address to include a where clause for the Model controller
                     $escapedValue = urlencode($find['value']);
                     // Append or add query parameter to the existing address string
                     $separator = strpos($from, '?') === false ? '?' : '&';
                     $sourceAddressForGet = "{$from}{$separator}where[{$attribute}]={$escapedValue}";
                     $canOptimizeFind = true;
                     Log::debug("[StorageHelper::handleSource] Optimized Item query address", ['original' => $from, 'optimized' => $sourceAddressForGet, 'find_criteria' => $find]);
                }
            }

            // --- END: Refactored Item model filtering ---

            // --- REVERTED to original logic before {base.key} handling attempt ---
            if ($isLegacyMysql) {
                //  Log::debug("[StorageHelper::handleSource] Handling legacy MySQL path.", ['address' => $from]);
                try {
                    $data = $this->commonStorage->address($from)->get();
                    if (is_string($data)) $data = json_decode($data, true);
                } catch (Exception $e) {
                    Log::warning("[StorageHelper::handleSource] Legacy MySQL get failed, trying file fallback.", ['address' => $from, 'error' => $e->getMessage()]);
                    $tableName = substr($from, 6);
                    $filePath = 'file!' . $tableName;
                    try {
                        $data = $this->commonStorage->address($filePath)->get();
                        //  Log::debug("[StorageHelper::handleSource] Legacy MySQL file fallback successful.", ['file_path' => $filePath]);
                    } catch (Exception $fileException) {
                        Log::error("[StorageHelper::handleSource] Legacy MySQL file fallback failed.", ['file_path' => $filePath, 'error' => $fileException->getMessage()]);
                        throw $e; // Re-throw original DB exception
                    }
                }
            } else {
                // Original standard address resolution using the potentially optimized address
                //  Log::debug("[StorageHelper::handleSource] Performing standard address get.", ['address' => $sourceAddressForGet]);
                $data = is_array($sourceAddressForGet) // Note: sourceAddressForGet should be string here after checks
                    ? array_map(fn($item) => $this->commonStorage->address($item)->get(), $sourceAddressForGet)
                    : $this->commonStorage->address($sourceAddressForGet)->get();
            }
            // --- END REVERT ---
            //  Log::debug("[StorageHelper::handleSource] Data retrieved from source address.", ['retrieved_data_type' => gettype($data)]);
        }

        // Only apply DataManipulateHelper::searchInData if we didn't optimize the find operation
        if ($find !== null && !$canOptimizeFind) {
            //  Log::debug("[StorageHelper::handleSource] Applying 'find' filter via DataManipulateHelper.", ['find_criteria' => $find]);
            if (isset($find['value'])) {
                DataHub::processResolveInstruction($find['value'], $this->commonStorage);
            }
            $data = DataManipulateHelper::searchInData($this->commonStorage, $data, $find);
            //  Log::debug("[StorageHelper::handleSource] Data after DataManipulateHelper::searchInData filter.", ['filtered_data_type' => gettype($data)]);
        }
        if ($key !== null) {
            //  Log::debug("[StorageHelper::handleSource] Applying 'key' filter.", ['key' => $key]);
            $data = is_array($data) && isset($data[$key]) ? $data[$key] : null;
            //  Log::debug("[StorageHelper::handleSource] Data after 'key' filter.", ['key_filtered_data_type' => gettype($data)]);
        }
        if ($with && !$isLegacyMysql) {
            //  Log::debug("[StorageHelper::handleSource] Applying 'with' transformation.", ['transformation' => $with]);
            try {
                $data = DataManipulateHelper::applyDataTransformation($data, $with);
                //  Log::debug("[StorageHelper::handleSource] Data after 'with' transformation.", ['transformed_data_type' => gettype($data)]);
            } catch (Exception $e) {
                Log::error("[StorageHelper::handleSource] Error during 'with' transformation.", ['instruction' => $instruction, 'error' => $e->getMessage()]);
                throw new Exception("Error in ProcessingActions::handleSource 'with' processing: " . $e->getMessage() . ". Instruction: " . JsonHelper::encode($instruction));
            }
        }
        if (isset($instruction['nameIt'])) {
            //  Log::debug("[StorageHelper::handleSource] Naming result with 'nameIt'.", ['name' => $instruction['nameIt']]);
            return [$instruction['nameIt'] => $data];
        }

        //  Log::debug("[StorageHelper::handleSource] Resolved source data.", ['final_data_type' => gettype($data)]);
        return $data;
    }

    private function handleSave($instruction): StepResponse
    {
        // Log::debug("[StorageHelper::handleSave] Processing 'save' action.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $from = $instruction['from'] ?? $instruction['address'] ?? null;
        if (!$from) {
            // Log::error("[StorageHelper::handleSave] Missing 'from' or 'address'.", ['instruction' => $instruction]);
            throw new Exception("Missing 'from' or 'address' in save instruction.");
        }
        $items = is_array($from) ? $from : [$from];

        foreach ($items as $key) {
            // Log::debug("[StorageHelper::handleSave] Saving item.", ['address' => $key]);
            DataHub::processResolveInstruction($key, $this->commonStorage); // Resolve placeholders in address
            $saveResult = $this->commonStorage->address($key)->save();
            // Log::debug("[StorageHelper::handleSave] Save result for address '{$key}'.", ['result_type' => gettype($saveResult), 'result' => $saveResult]);
            $response->addHistory('save ' . $key . ' = ' . json_encode($saveResult));
        }
        return $response;
    }

    private function printValue($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::printValue] Processing 'print_r' action.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $value = $this->handleSource($instruction);
        $output = print_r($value, true);
        // Add plain output to logs, potentially formatted output to console/history
        //  Log::debug("[StorageHelper::printValue] Value dump.", ['from' => ($instruction['from'] ?? 'N/A'), 'output' => $output]);
        // FIX: Pass the array directly, not the JSON string
        $consoleData = [
            'type' => 'print_r',
            'source' => ($instruction['from'] ?? 'N/A'),
            'output' => $output
        ];
        // REMOVE DETAILED LOGGING BEFORE THE CALL
        // $encodedData = json_encode($consoleData);
        // Log::debug("[StorageHelper::printValue] Preparing to call addConsole", [
        //     'response_class' => get_class($response),
        //     'encoded_data_type' => gettype($encodedData),
        //     'encoded_data_value' => $encodedData
        // ]);
        // FIX: Pass the array directly, not the JSON string
        $response->addConsole($consoleData);
        return $response;
    }

    private function processForLoop($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::processForLoop] Processing 'for' loop.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $from = $instruction['from'] ?? null;
        DataHub::processResolveInstruction($from, $this->commonStorage);
        $to = $instruction['to'] ?? null;
        DataHub::processResolveInstruction($to, $this->commonStorage);

        $instructions = $instruction['instructions'] ?? [];
        if (!$from || empty($instructions)) {
            Log::error("[StorageHelper::processForLoop] Invalid 'for' instruction format.", ['instruction' => $instruction]);
            throw new Exception("Invalid 'for' instruction format");
        }

        $items = $this->commonStorage->address($from)->get();
        //  Log::debug("[StorageHelper::processForLoop] Iterating over items.", ['from' => $from, 'item_count' => is_array($items) || $items instanceof Countable ? count($items) : 'N/A']);
        $results = [];

        // Ensure $items is iterable
        if (!is_iterable($items)) {
            Log::warning("[StorageHelper::processForLoop] Source '{$from}' is not iterable.", ['type' => gettype($items)]);
            $items = []; // Process as empty loop
        }

        foreach ($items as $index => $item) {
            //  Log::debug("[StorageHelper::processForLoop] Loop iteration.", ['index' => $index, 'item_type' => gettype($item)]);
            // Set buffer variables for current item/index
            $this->commonStorage->address('buffer:for.currentItem')->set($item);
            $this->commonStorage->address('buffer:for.currentIndex')->set($index);

            // Execute nested instructions for this item
            foreach ($instructions as $instrIndex => $instr) {
                //  Log::debug("[StorageHelper::processForLoop] Executing nested instruction for item {$index}.", ['nested_instr_index' => $instrIndex, 'instruction' => $instr]);
                $response->merge($this->processInstruction($instr)); // Process nested instruction
                if ($response->isHalted()) {
                    Log::warning("[StorageHelper::processForLoop] Nested instruction execution halted loop.", ['index' => $index, 'nested_instr_index' => $instrIndex]);
                    break 2; // Break out of both loops if nested execution halted
                }
            }

            // Collect result if 'to' address is specified
            if ($to) {
                // Assuming the result for the iteration is stored in 'buffer:for.list'
                $loopResult = $this->commonStorage->address('buffer:for.list')->get();
                //  Log::debug("[StorageHelper::processForLoop] Collecting result for iteration.", ['index' => $index, 'result_type' => gettype($loopResult)]);
                $results[] = $loopResult;
                $this->commonStorage->address('buffer:for.list')->remove(); // Clear buffer for next iteration
            }
        }

        // Set the final collected results to the 'to' address
        if ($to) {
            //  Log::debug("[StorageHelper::processForLoop] Setting final results array.", ['to' => $to, 'result_count' => count($results)]);
            $this->commonStorage->address($to)->set($results);
        }

        // Clean up buffer variables
        $this->commonStorage->address('buffer:for.currentItem')->remove();
        $this->commonStorage->address('buffer:for.currentIndex')->remove();

        //  Log::debug("[StorageHelper::processForLoop] Finished 'for' loop processing.");
        $response->addHistory('Processed for loop');
        return $response;
    }

    private function processInstruction($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::processInstruction] Processing instruction.", ['instruction' => $instruction]);
        $response = new StepResponse();

        if (!isset($instruction['action'])) {
            Log::error("[StorageHelper::processInstruction] Missing 'action' key.", ['instruction' => $instruction]);
            $response->addHistory("Missing action in instruction", 'error');
            return $response;
        }

        if (isset($instruction['disabled']) && $instruction['disabled'] === true) {
            //  Log::debug("[StorageHelper::processInstruction] Instruction disabled, skipping.", ['action' => $instruction['action']]);
            $response->addHistory('disabled ' . $instruction['action']);
            return $response;
        }

        if (isset($instruction['condition'])) {
            $condition = $instruction['condition'];
            //  Log::debug("[StorageHelper::processInstruction] Evaluating condition.", ['condition' => $condition]);
            $conditionValue = DataManipulateHelper::evaluateCondition($this->commonStorage, $condition);
            $response->addHistory('condition ' . JsonHelper::encode($condition) . ' = ' . $conditionValue);
            //  Log::debug("[StorageHelper::processInstruction] Condition result.", ['result' => $conditionValue]);
            if (!$conditionValue) return $response; // Skip if condition false
        }

        $action = $instruction['action'];
        //  Log::debug("[StorageHelper::processInstruction] Dispatching to action handler.", ['action' => $action]);

        // Assuming $this->actionHandlers is initialized (e.g., by initializeActionHandlers)
        if (!isset($this->actionHandlers[$action])) {
            Log::error("[StorageHelper::processInstruction] Unknown action.", ['action' => $action]);
            $response->addHistory("Unknown action: " . $action, 'error');
        } else {
            try {
                $result = ($this->actionHandlers[$action])($instruction);
                if ($result instanceof StepResponse) {
                    $response->merge($result);
                    //  Log::debug("[StorageHelper::processInstruction] Merged response from action handler.", ['action' => $action, 'result_halted' => $result->isHalted()]);
                } else {
                    // Should action handlers always return StepResponse?
                    Log::error("[StorageHelper::processInstruction] Action handler returned unexpected type.", ['action' => $action, 'type' => gettype($result)]);
                    $response->addHistory("Unknown action handler result type: " . $action, 'error');
                }
            } catch (Exception $e) {
                Log::error("[StorageHelper::processInstruction] Error executing action handler '{$action}'.", [
                    'message' => $e->getMessage(),
                    'instruction' => $instruction,
                    'exception' => $e
                ]);
                $response->addHistory("Error action: " . $action . ".\nMessage: " . $e->getMessage() . "\nInstruction: " . JsonHelper::encode($instruction), 'error', $e->getTrace());
                $response->halt(); // Halt on error within action handler
            }
        }

        return $response;
    }

    private function addToArray($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::addToArray] Processing 'add' action.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $fromData = $this->handleSource($instruction);
        $to = $instruction['to'] ?? null;

        if (!$to) {
            Log::error("[StorageHelper::addToArray] 'to' address is required.", ['instruction' => $instruction]);
            throw new Exception("Invalid 'add' instruction format: 'to' is required");
        }

        // Evaluate condition if present
        if (isset($instruction['condition'])) {
            $condition = $instruction['condition'];
            //  Log::debug("[StorageHelper::addToArray] Evaluating condition.", ['condition' => $condition]);
            $conditionValue = DataManipulateHelper::evaluateCondition($this->commonStorage, $condition);
            $response->addHistory('condition ' . JsonHelper::encode($condition) . ' = ' . $conditionValue);
            //  Log::debug("[StorageHelper::addToArray] Condition result.", ['result' => $conditionValue]);

            if (!$conditionValue) return $response; // Return if condition false
        }

        $target = $this->commonStorage->address($to)->get();
        //  Log::debug("[StorageHelper::addToArray] Current target value.", ['address' => $to, 'type' => gettype($target)]);
        if ($target === null) {
            $target = []; // Initialize as array if null
        }

        // Handle 'how' parameter
        $how = $instruction['how'] ?? 'append'; // Default to 'append'
        //  Log::debug("[StorageHelper::addToArray] Adding data.", ['how' => $how, 'from_data_type' => gettype($fromData)]);
        if ($how === 'prepend') {
            if (is_array($target)) {
                array_unshift($target, $fromData);
            } elseif (is_string($target)) {
                $target = (is_array($fromData) ? implode('', $fromData) : $fromData) . $target;
            }
        } else { // Default to 'append'
            if (is_array($target)) {
                $target[] = $fromData;
            } elseif (is_string($target)) {
                $target .= is_array($fromData) ? implode('', $fromData) : $fromData;
            }
        }

        // Handle 'limit' parameter
        $limit = $instruction['limit'] ?? null;
        if ($limit !== null && is_array($target)) {
            //  Log::debug("[StorageHelper::addToArray] Applying limit.", ['limit' => $limit]);
            $target = array_slice($target, 0, $limit);
        }

        //  Log::debug("[StorageHelper::addToArray] Setting updated target value.", ['address' => $to, 'new_target_type' => gettype($target)]);
        $this->commonStorage->address($to)->set($target);
        $response->addHistory('add ' . $to . ' = ' . json_encode($target));
        return $response;
    }

    // This handles a single update operation (called by handleUpdate)

    private function handleRemove($instruction)
    {
        //  Log::debug("[StorageHelper::handleRemove] Processing 'remove' action.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $items = [];
        // Use 'from' or 'address' as the source to remove
        $source = $instruction['from'] ?? $instruction['address'] ?? $instruction['to'] ?? null;
        $keyPath = $instruction['keyPath'] ?? null; // Optional keyPath for removing specific part

        if (!$source) {
            Log::error("[StorageHelper::handleRemove] Missing 'from', 'address', or 'to' path.", ['instruction' => $instruction]);
            throw new Exception("Missing path ('from', 'address', or 'to') in handleRemove instruction.");
        }

        $items = is_array($source) ? $source : [$source];

        foreach ($items as $key) {
            //  Log::debug("[StorageHelper::handleRemove] Removing item/path.", ['address' => $key, 'keyPath' => $keyPath]);
            DataHub::processResolveInstruction($key, $this->commonStorage); // Resolve placeholders in address
            // Assuming ->remove() handles keyPath if provided, and returns instance for chaining save
            $removeResult = $this->commonStorage->address($key)->remove($keyPath)->save();
            //  Log::debug("[StorageHelper::handleRemove] Remove/Save result for '{$key}'.", ['result' => $removeResult]);
            $response->addHistory("Removed from data: " . $key . ($keyPath ? ' [' . implode('.', (array)$keyPath) . ']' : ''));
        }

        return $response;

    }

    private function processCall($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::processCall] Processing 'call' action.", ['instruction' => $instruction]);
        $response = new StepResponse(); // Create a response object for this call
        try {
            $value = $this->handleSource($instruction); // Gets the instructions to call
            if (!is_array($value)) {
                Log::error("[StorageHelper::processCall] Source data for 'call' is not an array of instructions.", ['type' => gettype($value), 'instruction' => $instruction]);
                throw new Exception("Error in 'call' instruction: 'value' from handleSource is not an array. Instruction: " . JsonHelper::encode($instruction));
            }

            //  Log::debug("[StorageHelper::processCall] Executing nested instructions.", ['count' => count($value)]);
            if (!isset($this->commonStorage) || !($this->commonStorage instanceof DataHub)) {
                throw new LogicException("[StorageHelper::processCall] Cannot execute nested instructions without a valid DataHub instance in commonStorage.");
            }

            // Execute nested instructions and merge their response
            $nestedResponse = $this->executeInstructions($value);
            $response->merge($nestedResponse); // Merge history, status, halt state etc.
            //  Log::debug("[StorageHelper::processCall] Merged response from nested execution.", ['nested_halted' => $nestedResponse->isHalted()]);

        } catch (Exception $e) {
            Log::error("[StorageHelper::processCall] Error during 'call' execution: " . $e->getMessage(), ['instruction' => $instruction, 'exception' => $e]);
            $response->addHistory("Error executing nested 'call': " . $e->getMessage(), 'error', $e->getTrace());
            $response->halt(); // Halt this level if the call itself failed
        }
        return $response; // Return the combined response
    }

    public function executeInstructions(array $instructionsInput): StepResponse
    {
        //  Log::debug("[StorageHelper::executeInstructions] Starting execution.", ['input_type' => gettype($instructionsInput), 'is_list' => array_is_list($instructionsInput)]);

        // FIX: Check for the structured format {type: Instructions, instructions: [...]} and extract the actual array
        $actualInstructions = [];
        if (isset($instructionsInput['type']) && $instructionsInput['type'] === 'Instructions' && isset($instructionsInput['instructions']) && is_array($instructionsInput['instructions'])) {
            $actualInstructions = $instructionsInput['instructions'];
            //  Log::debug("[StorageHelper::executeInstructions] Extracted instructions from structured format.", ['count' => count($actualInstructions)]);
        } elseif (array_is_list($instructionsInput)) { // Check if it's a simple list of instructions
            $actualInstructions = $instructionsInput;
            //  Log::debug("[StorageHelper::executeInstructions] Using input as a direct list of instructions.", ['count' => count($actualInstructions)]);
        } else {
            // Handle cases where input is an associative array but not the expected structure (e.g., single instruction passed directly)
            // OR potentially invalid input. For now, log a warning and try to process it,
            // but this might need stricter validation depending on allowed inputs.
            Log::warning("[StorageHelper::executeInstructions] Input is not a standard list or structured format. Attempting to process directly.", ['keys' => array_keys($instructionsInput)]);
            // If it's a single instruction wrapped in an associative array (e.g., by mistake?), maybe handle it?
            // For now, let the loop handle it, it might error out correctly if it's not valid.
            $actualInstructions = $instructionsInput;
        }

        $response = new StepResponse();
        // FIX: Loop over the $actualInstructions array
        foreach ($actualInstructions as $index => $instruction) {
            // Ensure $instruction is an array before processing (skips scalar values like 'type' if they slipped through)
            if (!is_array($instruction)) {
                Log::warning("[StorageHelper::executeInstructions] Skipping non-array instruction at index {$index}.", ['value' => $instruction]);
                continue;
            }
            //  Log::debug("[StorageHelper::executeInstructions] Processing instruction index {$index}", ['instruction_action' => $instruction['action'] ?? 'N/A']);
            try {
                // Напрямую вызываем processInstruction для каждой инструкции
                $result = $this->processInstruction($instruction); // Используем $this->processInstruction
                if ($result instanceof StepResponse) {
                    $response->merge($result);
                    //  Log::debug("[StorageHelper::executeInstructions] Merged StepResponse.", ['result_halted' => $result->isHalted()]);
                } else {
                    // processInstruction должен всегда возвращать StepResponse
                    Log::error("[StorageHelper::executeInstructions] processInstruction returned unexpected type", ['type' => gettype($result)]);
                    throw new Exception("processInstruction returned unexpected type");
                }

                if ($response->isHalted() || $response->isCompleted()) { // Останавливаемся, если response halted или completed
                    //  Log::debug("[StorageHelper::executeInstructions] Response halted/completed at index {$index}, breaking loop.");
                    break;
                }
            } catch (Exception $e) {
                Log::error("[StorageHelper::executeInstructions] Error processing instruction index {$index}: " . $e->getMessage(), [
                    'instruction' => $instruction,
                    'exception' => $e
                ]);
                $response->addHistory("Error processing instruction: " . $e->getMessage() . ". Instruction: " . JsonHelper::encode($instruction), 'error', $e->getTrace());
                $response->halt(); // Останавливаем выполнение при ошибке
                break;
            }
        }
        //  Log::debug("[StorageHelper::executeInstructions] Finished execution.", ['final_response_halted' => $response->isHalted()]);
        return $response;
    }

    private function handleReturn($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::handleReturn] Processing 'return' action.", ['instruction' => $instruction]);
        // сюда нужно добавить вариант когда ретурн вызывается с названием переменной, на случай если нужно вывести немассив
        $response = new StepResponse();
        $returnValue = $this->handleSource($instruction);
        //  Log::debug("[StorageHelper::handleReturn] Return value resolved.", ['type' => gettype($returnValue)]);
        try {
            $response->addDataRecursive($returnValue);
            //  Log::debug("[StorageHelper::handleReturn] Added data to response.");
            if (isset($instruction['halt']) && $instruction['halt'] == true) {
                //  Log::debug("[StorageHelper::handleReturn] Halting response.");
                $response->halt();
            }
            //     if (isset($instruction['compleated']) && $instruction['compleated'] == true) $response->complete();
            $response->complete(); // Always complete on return?
            //  Log::debug("[StorageHelper::handleReturn] Completed response.");
        } catch (Exception $e) {
            Log::error("[StorageHelper::handleReturn] Error adding data to response: " . $e->getMessage(), ['exception' => $e]);
            $response->halt();
            $response->addHistory("Error return: " . $e->getMessage(), 'error', $e->getTrace());
        }


        return $response;
    }

    // This seems like a DB-specific helper, maybe belongs elsewhere?

    private function handleAssignId($instruction): StepResponse
    {
        //  Log::debug("[StorageHelper::handleAssignId] Processing 'assignId' action.", ['instruction' => $instruction]);
        $response = new StepResponse();
        $address = $instruction['address'] ?? null;
        if (!$address) {
            Log::error("[StorageHelper::handleAssignId] Missing 'address' parameter.", ['instruction' => $instruction]);
            throw new Exception("assignId instruction requires an 'address' parameter.");
        }

        $data = $this->commonStorage->address($address)->get();
        //  Log::debug("[StorageHelper::handleAssignId] Data retrieved from address.", ['address' => $address, 'type' => gettype($data)]);
        if ($data === null) {
            Log::error("[StorageHelper::handleAssignId] No data found at address.", ['address' => $address]);
            throw new Exception("No data found at address: {$address}");
        }

        $dataWithId = $this->simulateCreateInstance($data); // Calls DB interaction
        $this->commonStorage->address($address)->set($dataWithId)->save();
        //  Log::debug("[StorageHelper::handleAssignId] Set and saved data with ID.", ['address' => $address, 'id' => $dataWithId['id']]);
        $response->addHistory("Assigned id {$dataWithId['id']} to object at {$address}");
        return $response;
    }

    // Новый метод для обработки инструкции assignId - Needs registration in initializeActionHandlers

    private function simulateCreateInstance($data)
    {
        //  Log::debug("[StorageHelper::simulateCreateInstance] Simulating instance creation.", ['input_data_type' => gettype($data)]);
        // Создаём запись Item. Если адрес не задан, попробуем взять его из текущего контекста.
        $item = new Item();
        if (!isset($data['address'])) {
            $data['address'] = $this->commonStorage->currentAddress ?? null; // Assuming currentAddress property exists
            //  Log::debug("[StorageHelper::simulateCreateInstance] Using currentAddress from storage.", ['address' => $data['address']]);
        }
        $item->data = [
            'address' => $data['address'] ?? null,
            'content' => $data
        ];
        $item->save(); // Генерирует auto-increment id
        $data['id'] = $item->id; // Встраиваем id в данные
        //  Log::debug("[StorageHelper::simulateCreateInstance] Instance saved, assigned ID.", ['id' => $item->id]);

        return $data;
    }
}
