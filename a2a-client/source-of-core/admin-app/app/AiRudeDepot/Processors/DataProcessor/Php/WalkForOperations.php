<?php

namespace App\AiRudeDepot\Processors\DataProcessor\Php;

use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Facades\Log;
use JsonException;

class WalkForOperations
{
    public static bool $allowDebug = false;
    public static bool $allowVerbosity = false;

    public static function process(&$data, DataHub $dataHub)
    {
        if (self::$allowDebug)
            Log::debug('[WalkForOperations] Starting process.', ['input_type' => gettype($data), 'is_array' => is_array($data), 'keys' => is_array($data) ? array_keys($data) : null, 'datahub_disk' => $dataHub->getDiskName()]);
        // Start processing with the passed data structure and DataHub
        $processedData = self::processNode($data, $dataHub); // Pass DataHub down
        if (self::$allowDebug)
            Log::debug('[WalkForOperations] Finished process.', ['output_type' => gettype($processedData)]);
        $data = $processedData;
    }

    private static function processNode($node, DataHub $dataHub, $depth = 0)
    {
        $logPrefix = str_repeat('  ', $depth);
        if (self::$allowDebug)
            Log::debug($logPrefix . '[WalkOps::processNode] Processing node', ['type' => gettype($node), 'is_array' => is_array($node), 'depth' => $depth]);

        if (!is_array($node)) {
            if (self::$allowDebug)
                Log::debug($logPrefix . '[WalkOps::processNode] Returning scalar/non-array.', ['value' => $node]);
            return $node; // Return scalars/objects immediately
        }

        // Handle potential operation nodes *at this level* (support legacy and new 'operation' format)
        $hasLegacyOp = isset($node['type']) && $node['type'] === 'operation' && isset($node['action']);
        $hasShortOp = isset($node['operation']);
        if ($hasLegacyOp || $hasShortOp) {
            $action = $hasLegacyOp ? $node['action'] : $node['operation'];
            $source = $node['source'] ?? null;
            if (self::$allowDebug) {
                if ($hasLegacyOp) {
                    Log::debug($logPrefix . '[WalkOps::processNode] Found OPERATION node at current level (legacy)', ['action' => $action, 'source' => $source, 'depth' => $depth]);
                } else {
                    Log::debug($logPrefix . '[WalkOps::processNode] Found OPERATION node at current level (short format)', ['operation' => $action, 'source' => $source, 'depth' => $depth]);
                }
            }

            switch ($action) {
                case 'include':
                    if (!$source) {
                        if (self::$allowDebug)
                            Log::warning($logPrefix . '[WalkOps::processNode] Include operation missing source.', ['depth' => $depth]);
                        return []; // Return empty if no source
                    }
                    // FIX: Use the injected DataHub instance
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Getting include source via DataHub.', ['source' => $source, 'disk' => $dataHub->getDiskName(), 'depth' => $depth]);
                    $sourceData = $dataHub->address($source)->get();

                    // --- DEBUG ---
                    Log::debug($logPrefix . '[WalkOps::processNode] Include source type before JSON check', ['source' => $source, 'type' => gettype($sourceData), 'is_string' => is_string($sourceData), 'depth' => $depth]);
                    // --- END DEBUG ---

                    if (!$sourceData) {
                        if (self::$allowDebug)
                            Log::warning($logPrefix . '[WalkOps::processNode] Include source not found or empty.', ['source' => $source, 'depth' => $depth]);
                        return []; // Return empty if source not found/empty
                    }

                    // Decode if JSON string
                    if (isset($node['is_json']) && $node['is_json'] === true && is_string($sourceData)) {
                        Log::debug('[WalkForOperations] is_json=true, sourceData IS string', ['sourceData_before_decode' => $sourceData]);
                        $decodedJson = json_decode($sourceData, true);
                        $last_error = json_last_error();
                        Log::debug('[WalkForOperations] json_decode result', ['decodedJson' => $decodedJson, 'json_last_error' => $last_error, 'JSON_ERROR_NONE' => JSON_ERROR_NONE]);
                        if ($last_error === JSON_ERROR_NONE) {
                            $sourceData = $decodedJson;
                            Log::debug('[WalkForOperations] sourceData AFTER successful decode', ['sourceData_after_decode' => $sourceData]);
                        } else {
                            Log::warning('[WalkForOperations] json_decode FAILED', ['error_code' => $last_error, 'original_sourceData' => $sourceData]);
                            // If decode fails, $sourceData remains the original string
                        }
                    }

                    // Recursively process the *included* data, passing DataHub
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Recursively processing included data.', ['source' => $source, 'depth' => $depth]);
                    return self::processNode($sourceData, $dataHub, $depth + 1); // Pass DataHub down

                case 'add':
                    if (!$source) {
                        if (self::$allowDebug)
                            Log::warning($logPrefix . '[WalkOps::processNode] Add operation missing source.', ['depth' => $depth]);
                        return []; // Return empty if no source
                    }
                    // FIX: Use the injected DataHub instance
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Getting add source via DataHub.', ['source' => $source, 'disk' => $dataHub->getDiskName(), 'depth' => $depth]);
                    $sourceData = $dataHub->address($source)->get();
                    // $sourceData = StaticStorage::get($source); // Old static call

                    if (!$sourceData) {
                        if (self::$allowDebug)
                            Log::warning($logPrefix . '[WalkOps::processNode] Add source not found or empty.', ['source' => $source, 'depth' => $depth]);
                        return []; // Return empty if source not found/empty
                    }

                    // Decode if JSON string
                    if (is_string($sourceData) && (str_ends_with(strtolower($source), '.json') || !pathinfo($source, PATHINFO_EXTENSION))) {
                        try {
                            $sourceData = json_decode($sourceData, true, 512, JSON_THROW_ON_ERROR);
                            if (self::$allowDebug)
                                Log::debug($logPrefix . '[WalkOps::processNode] Add source decoded as JSON.', ['source' => $source, 'depth' => $depth]);
                        } catch (JsonException $e) {
                            Log::error($logPrefix . '[WalkOps::processNode] JSON decode failed for add source.', ['source' => $source, 'error' => $e->getMessage(), 'depth' => $depth]);
                            return [];
                        }
                    }

                    // Recursively process the data to be added, passing DataHub
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Recursively processing data to add.', ['source' => $source, 'depth' => $depth]);
                    $processedAddData = self::processNode($sourceData, $dataHub, $depth + 1); // Pass DataHub down

                    // Return the processed data, ensuring it's an array for the caller to potentially merge/flatten
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Returning processed data for add operation.', ['type' => gettype($processedAddData), 'depth' => $depth]);
                    return is_array($processedAddData) ? $processedAddData : [$processedAddData];

                case 'remove':
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] Returning NULL for remove operation.', ['depth' => $depth]);
                    return null; // Signal removal

                default:
                    if (self::$allowDebug)
                        Log::warning($logPrefix . '[WalkOps::processNode] Unknown operation action at current level.', ['action' => $action, 'depth' => $depth]);
                // Fall through to process children if action is unknown but it's still an array
            }
        }

        // If it wasn't an operation node OR it was an unknown operation type,
        // process its children recursively.
        $isAssoc = self::isAssoc($node);
        $newNode = []; // Build a new array/object
        if (self::$allowDebug)
            Log::debug($logPrefix . '[WalkOps::processNode] Processing children of ' . ($isAssoc ? 'ASSOC' : 'SEQUENTIAL') . ' array', ['keys' => array_keys($node), 'depth' => $depth]);

        foreach ($node as $key => $value) {
            if (self::$allowDebug)
                Log::debug($logPrefix . '[WalkOps::processNode] > Processing child', ['key_or_index' => $key, 'depth' => $depth]);
            $processedValue = self::processNode($value, $dataHub, $depth + 1); // Recursively process child, passing DataHub

            if ($processedValue === null) {
                // If child processing resulted in 'remove', skip adding it.
                if (self::$allowDebug)
                    Log::debug($logPrefix . '[WalkOps::processNode] < Skipping child key/index due to NULL result (removed).', ['key_or_index' => $key, 'depth' => $depth]);
                continue;
            }

            if ($isAssoc) {
                // For associative arrays, assign processed value to the key
                if (self::$allowDebug)
                    Log::debug($logPrefix . '[WalkOps::processNode] < Assigning processed value to ASSOC key.', ['key' => $key, 'value_type' => gettype($processedValue), 'depth' => $depth]);
                $newNode[$key] = $processedValue;
            } else {
                // For sequential arrays, handle potential flattening needed from 'add' or 'include' operations
                // Check if the processed value is a sequential array (list) itself.
                if (is_array($processedValue) && !self::isAssoc($processedValue)) {
                    // If the processed value is itself a sequential array (result of 'add'/'include' that returned a list), flatten it
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] < Flattening sequential array from child.', ['original_index' => $key, 'count' => count($processedValue), 'depth' => $depth]);
                    foreach ($processedValue as $item) {
                        $newNode[] = $item;
                    }
                } else {
                    // Otherwise, just append the processed value (scalar, object, or assoc array)
                    if (self::$allowDebug)
                        Log::debug($logPrefix . '[WalkOps::processNode] < Appending processed value to SEQUENTIAL array.', ['original_index' => $key, 'value_type' => gettype($processedValue), 'depth' => $depth]);
                    $newNode[] = $processedValue;
                }
            }
        }

        if (self::$allowDebug)
            Log::debug($logPrefix . '[WalkOps::processNode] Finished processing children, returning new node.', ['return_type' => gettype($newNode), 'keys' => array_keys($newNode), 'depth' => $depth]);
        return $newNode; // Return the fully processed new array/object
    }

    private static function isAssoc(array $arr): bool
    {
        if ([] === $arr) return false; // Empty array is not associative
        return array_keys($arr) !== range(0, count($arr) - 1);
    }
}


// --- COMMENTED OUT OLD LOGIC ---
/*


<?php

namespace App\AiRudeDepot\Processors\DataProcessors;

use App\AiRudeDepot\Storage\DataHub as StaticStorage;
use Illuminate\Support\Facades\Log;

class NodeOperation
{
    public static function process(&$node)
    {
        // Handle top-level include operation
        if (is_array($node) && isset($node['type']) && $node['type'] === 'operation' && $node['action'] === 'include') {
            Log::debug('[NodeOp Ref] process: Top-level include operation detected.');
            self::processInclude($node);
            return;
        }

        // Process nested arrays and operations within them
        if (is_array($node)) {
            // Handle nested include operations that are direct children
            // This catches include operations that are elements of an array or properties of an object
            if (isset($node['type']) && $node['type'] === 'operation' && $node['action'] === 'include') {
                 Log::debug('[NodeOp Ref] process: Nested include operation detected.');
                 self::processInclude($node);
                 return; // Processed this node, stop further processing of its contents in this call
            }

            $newCurrentNode = [];
            // Determine if the original array was numerically indexed
            $isNumericArray = array_keys($node) === range(0, count($node) - 1);

            Log::debug('[NodeOp Ref] process: Processing array node. Numeric: ' . ($isNumericArray ? 'true' : 'false'));

            foreach ($node as $key => $element) {
                 Log::debug('[NodeOp Ref] process: Iterating element with key: ' . $key);
                 if (is_array($element)) {
                     // Check if the element is an operation node
                     if (isset($element['type']) && $element['type'] === 'operation' && isset($element['action'])) {
                         $action = $element['action'];
                         Log::debug('[NodeOp Ref] process: Found operation node with action: ' . $action);

                         if ($action === 'remove') {
                             Log::debug('[NodeOp Ref] process: Skipping remove operation.');
                             // Skip 'remove' operations
                             continue;
                         }

                         // Process the operation node
                         $operationResult = self::processOperationInsideArray($element);
                         Log::debug('[NodeOp Ref] process: Result from processOperationInsideArray for action ' . $action . ': ' . json_encode($operationResult));

                         if ($operationResult !== null) {
                             if ($action === 'add') {
                                 // For 'add', if the result is an array, merge its elements into the current array
                                 if (is_array($operationResult) || is_object($operationResult)) {
                                     Log::debug('[NodeOp Ref] process: Adding array/object result from add operation.');
                                     // Iterate over the result and add each item
                                     foreach($operationResult as $addedElementKey => $addedElement) {
                                          // When adding to a numeric array, append. For associative, preserve keys if result is associative.
                                          if ($isNumericArray || is_numeric($addedElementKey)) {
                                              $newCurrentNode[] = $addedElement;
                                          } else {
                                              $newCurrentNode[$addedElementKey] = $addedElement;
                                          }
                                     }
                                 } else {
                                     // If scalar, just add it as a new element
                                     Log::debug('[NodeOp Ref] process: Adding scalar result from add operation.');
                                     $newCurrentNode[] = $operationResult;
                                 }
                             } elseif ($action === 'include') {
                                 // For 'include' within an array, add the result as a single element under the original key
                                 Log::debug('[NodeOp Ref] process: Adding result from include operation.');
                                 if ($isNumericArray) {
                                     $newCurrentNode[] = $operationResult;
                                 } else {
                                     $newCurrentNode[$key] = $operationResult;
                                 }
                             }
                         } else {
                             // If operationResult is null (e.g., source not found for include/add, or it was a remove), do nothing.
                             Log::debug('[NodeOp Ref] process: Operation result is null. Skipping adding to new node.');
                         }
                     } else {
                         // If not an operation node, but a nested array, process it recursively
                         Log::debug('[NodeOp Ref] process: Processing nested non-operation array with key: ' . $key);
                         self::process($element);
                         // Add the processed nested array back to the new node
                         if ($isNumericArray) {
                            $newCurrentNode[] = $element;
                         } else {
                            $newCurrentNode[$key] = $element;
                         }
                     }
                 } else {
                     // Scalar value or object, just add it to the new node
                     Log::debug('[NodeOp Ref] process: Adding scalar/object element with key: ' . $key);
                     if ($isNumericArray) {
                         $newCurrentNode[] = $element;
                     } else {
                         $newCurrentNode[$key] = $element;
                     }
                 }
            }

            // Replace the original node with the newly built array
            Log::debug('[NodeOp Ref] process: Replacing original node with newCurrentNode.');
            $node = $newCurrentNode;

            // No need for array_values here, manual building handles indexing
        } else {
             Log::debug('[NodeOp Ref] process: Node is not an array. Skipping processing.');
        }
        // If not an array, do nothing (scalar or object)
    }

    private static function processInclude(&$node)
    {
        Log::debug('[NodeOp Ref] processInclude: Starting processing for include operation.');
        if (isset($node['source'])) {
            $source = $node['source'];
            Log::debug('[NodeOp Ref] processInclude: Attempting include for source: ' . $source);
            $fetchedData = StaticStorage::get($source);
            Log::debug('[NodeOp Ref] processInclude: Fetched data type: ' . gettype($fetchedData));

            if (strpos($source, '.json') !== false && is_string($fetchedData)) {
                Log::debug('[NodeOp Ref] processInclude: Detected JSON string, decoding as associative array...');
                $decodedData = json_decode($fetchedData, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    Log::debug('[NodeOp Ref] processInclude: JSON decoded successfully.');
                    $fetchedData = $decodedData;
                    // Recursively process the decoded JSON data
                    Log::debug('[NodeOp Ref] processInclude: Recursively processing decoded JSON data.');
                    self::process($fetchedData);
                } else {
                    Log::error('[NodeOp Ref] processInclude: JSON decode failed for source: ' . $source . '. Error: ' . json_last_error_msg());
                    $fetchedData = []; // Set to empty array on decode failure
                }
            }
// ... (rest of old logic commented out) ...
*/
