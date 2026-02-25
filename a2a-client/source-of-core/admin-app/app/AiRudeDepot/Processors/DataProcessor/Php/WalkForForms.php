<?php

namespace App\AiRudeDepot\Processors\DataProcessor\Php;

// Use the actual DataHub class, not just as StaticStorage alias
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Facades\Log;

// use App\AiRudeDepot\Storage\DataHub as StaticStorage; // Remove static alias

class WalkForForms
{
    /**
     * Recursively traverses the node structure, collecting initial form states
     * specified by `model.form` attributes using the provided DataHub instance.
     *
     * @param array   &$node The node structure to process.
     * @param DataHub $dataHub The DataHub instance configured for the correct disk.
     * @param string $moduleSlug The slug of the current module, needed for data paths.
     * @param bool $lvlRoot Internal flag for recursion depth.
     * @return array A flat associative array containing the aggregated form states.
     */
    protected static bool $allowDebug = false;
    protected static bool $allowVerbosity = false;

    // Updated signature: accept DataHub AND moduleSlug
    public static function process(array &$node, DataHub $dataHub, string $moduleSlug, $lvlRoot = true): array
    {
        static $results = [];
        if ($lvlRoot) {
            $results = []; // Initialize/reset results on the first call
            Log::debug("[WalkForForms::process] Starting form processing.", ['datahub_disk' => $dataHub->getDiskName(), 'moduleSlug' => $moduleSlug]);
        }

        foreach ($node as $key => &$value) {
            if ($key === 'model' && is_array($value) && isset($value['form'])) {
                $formName = $value['form'];

                if (self::$allowDebug)
                    Log::debug("[WalkForForms::process] Found form reference: {$formName}");

                // Construct the path using the moduleSlug
                $formDataPath = $moduleSlug . '/data/' . $formName;
                // $formDataPath = 'data/' . $formName; // Old incorrect path construction
                Log::debug("[WalkForForms::process] Attempting to get form data.", ['path' => $formDataPath, 'disk' => $dataHub->getDiskName()]);

                // Use the injected DataHub instance to get data
                $formData = $dataHub->address($formDataPath)->get();

                if (self::$allowDebug)
                    Log::debug("[WalkForForms::process] Data retrieved for {$formName}", ['raw_data_type' => gettype($formData)]);

                // Attempt to unwrap (logic seems specific, kept as is)
                if (is_array($formData) && count($formData) === 1 && isset($formData[0]) && is_array($formData[0])) {
                    if (self::$allowDebug)
                        Log::debug("[WalkForForms::process] Attempting to unwrap data for {$formName}");
                    $formData = $formData[0];
                    if (self::$allowDebug)
                        Log::debug("[WalkForForms::process] Data after unwrapping attempt for {$formName}", ['unwrapped_data_type' => gettype($formData)]);
                } else {
                    if (self::$allowDebug)
                        Log::debug("[WalkForForms::process] No unwrapping needed or possible for {$formName}");
                }

                // Ensure $formData is an array before merging
                if (is_array($formData)) {
                    // FIX: Ensure $results is initialized if merging an empty array into it first time
                    if (!isset($results[$formName])) {
                        $results[$formName] = [];
                    }
                    // Assign base form data directly under form name
                    $results[$formName] = $formData;

                    // --- CORRECTED: Load validation errors from the DataHub buffer ---
                    // FIX: Look in the buffer, not a file path
                    // FIX: Add the 'buffer:' prefix to the address
                    $validationErrorsAddress = 'buffer:validationErrors'; // Check buffer directly
                    Log::debug("[WalkForForms::process] Attempting to load validation errors from buffer.", ['address' => $validationErrorsAddress, 'disk' => $dataHub->getDiskName()]);
                    // Use get(null) to avoid errors if the buffer doesn't exist
                    $allValidationErrors = $dataHub->address($validationErrorsAddress)->get(null);

                    // Check if errors exist AND if errors for THIS specific form exist
                    if (is_array($allValidationErrors) && isset($allValidationErrors[$formName])) {
                        $formSpecificErrors = $allValidationErrors[$formName];
                        Log::debug("[WalkForForms::process] Found validation errors for this form, merging into results.", ['formName' => $formName, 'errors' => $formSpecificErrors]);
                        // Merge errors under an 'errors' key within the form's data
                        if (!isset($results[$formName]) || !is_array($results[$formName])) {
                            $results[$formName] = []; // Initialize if needed
                        }
                        // Only add errors if they are actually present for this form
                        if (!empty($formSpecificErrors)) {
                            $results[$formName]['errors'] = $formSpecificErrors;
                        }
                    } else {
                        Log::debug("[WalkForForms::process] No validation errors found in buffer or no errors for this specific form.", ['address' => $validationErrorsAddress, 'formName' => $formName, 'load_result_type' => gettype($allValidationErrors)]);
                        // Ensure errors key exists but is empty if no errors found
                        if (!isset($results[$formName]['errors'])) {
                            $results[$formName]['errors'] = [];
                        }
                    }

                    if (self::$allowDebug)
                        Log::debug("[WalkForForms::process] Merged data (including potential errors) for {$formName}", ['current_results_keys' => array_keys($results), 'form_data' => $results[$formName]]);
                } else {
                    if (self::$allowDebug)
                        Log::debug("[WalkForForms::process] Invalid or null form data skipped for {$formName}", ['path_tried' => $formDataPath, 'disk' => $dataHub->getDiskName()]);
                }
            } elseif (is_array($value)) {
                // Recurse into sub-arrays, passing the same DataHub instance AND moduleSlug
                if (self::$allowDebug)
                    Log::debug("[WalkForForms::process] Recursing into sub-array for key '{$key}'");
                self::process($value, $dataHub, $moduleSlug, false); // Pass $dataHub AND $moduleSlug down
            }
        }
        // unset($value); // Break reference

        if ($lvlRoot) {
            Log::debug("[WalkForForms::process] Finished form processing.", ['final_results_keys' => array_keys($results)]);
        }
        return $results;
    }
}
