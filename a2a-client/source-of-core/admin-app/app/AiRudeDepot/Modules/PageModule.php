<?php

namespace App\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Processors\DataProcessor;
use App\AiRudeDepot\Storage\DataHub;
use Exception;
use Illuminate\Support\Facades\Log;

class PageModule extends App
{
    /**
     * Standard run logic for page-type modules.
     * Fetches page structure using pageModule modificator.
     */
    protected bool $allowDebug = true;
    protected bool $allowVerbosity = false;

    public function moduleRun(StepResponse $response, string $pagePath): StepResponse
    {

        // <<< ADD LOG HERE >>>
        Log::debug("[PageModule::moduleRun] Entered method. Initial pagePath value: '{$pagePath}'", [
            'pagePath_type' => gettype($pagePath),
            'pagePath_length' => is_string($pagePath) ? strlen($pagePath) : null,
            'object_hash' => spl_object_hash($this)
        ]);

        $currentPagePath = $pagePath;

        $dataHub = $this->getStorage();
        if ($dataHub instanceof DataHub) {
            $response->setDataHub($dataHub);
        } else {
            Log::critical("[PageModule::moduleRun] FATAL: Could not get valid DataHub instance from getStorage() at the beginning. App state is invalid.");
            $response->addHistory("Fatal error: Could not initialize module storage.", 'critical');
            $response->addData('component', 'Error/Critical');
            $response->halt();
            return $response;
        }

        $response->addHistory("PageModule::moduleRun executing with path: {$currentPagePath}");
        // REMOVED: $envPath - Use $this->storage instead
        // $envPath = base_path(config('ai.env_path', 'storage/ai'));

        // << UNCOMMENT THIS BLOCK >>
        if (method_exists($this, 'beforeRun')) {
            // Pass $this->storage if hook needs it
            $this->beforeRun($response, $currentPagePath, $this->storage);
        }

        Log::debug("[PageModule::moduleRun] AFTER beforeRun check. currentPagePath: '{$currentPagePath}'");

        // <<< FIX: Load page data directly using DataHub, bypassing processPage modifier >>>
        Log::debug("[PageModule::moduleRun] DEBUG: Value of currentPagePath right before constructing filePath: '{$currentPagePath}'", [
            'pagePath_type' => gettype($currentPagePath),
            'pagePath_length' => is_string($currentPagePath) ? strlen($currentPagePath) : null
        ]);
        $pageFilePath = "{$this->getSlug()}/pages/{$currentPagePath}";
        $pageDataOrInstructions = null;
        try {
            Log::debug("[PageModule::moduleRun] Attempting direct load of page data from: {$pageFilePath}");
            $pageDataOrInstructions = $this->storage->address($pageFilePath)->get();
            $response->addHistory("Loaded page data directly from {$pageFilePath}");
        } catch (Exception $e) {
            $response->addHistory("Failed to directly load page data from {$pageFilePath}: " . $e->getMessage(), 'error');
        }

        // Check if direct load failed or returned empty data
        if (empty($pageDataOrInstructions)) {
            $response->addHistory("Direct load returned empty result for module: {$this->getSlug()}, page: {$currentPagePath}. Assuming page not found.", 'warning');
            // Here you might want to trigger a 404 response or a specific error component
            $response->addData('component', 'Error/Generic'); // Or Error/NotFound
            $response->halt();
            return $response;
        }
        // <<< END FIX >>>

        // <<< LOG BEFORE walkForOperations >>>
        Log::debug("[PageModule::moduleRun] BEFORE walkForOperations", [
            'component_before' => $response->getData('component')
        ]);

        // 2. Run walkForOperations PHP modifier (operates on the loaded $pageDataOrInstructions)
        $modStructure = DataProcessor::data($pageDataOrInstructions, $this->storage)->walkForOperations();
        $structure = $modStructure->result();

        // <<< LOG AFTER walkForOperations, BEFORE merge >>>
        Log::debug("[PageModule::moduleRun] AFTER walkForOperations, BEFORE merge", [
            'component_in_response' => $response->getData('component'),
            'modifier_response_data' => $modStructure->response()->getData()
        ]);

        $response->merge($modStructure->response());

        $response->addDataRecursive($structure);
        // <<< LOG AFTER merge >>>
        Log::debug("[PageModule::moduleRun] AFTER merge from walkForOperations", [
            'component_after_merge' => $response->getData('component')
        ]);

        // Check if walkForOperations failed or halted
        if ($response->isHalted()) {
            $response->addHistory("Execution halted after walkForOperations modifier.", 'warning');
            return $response;
        }

        // 3. Process Forms using walkForForms PHP modifier
        $formsData = null;
        if ($structure) {
            try {
                $modResultForms = DataProcessor::data((array)$structure, $this->storage)->walkForForms($this->moduleSlug);
                $formsData = $modResultForms->result();
                $response->merge($modResultForms->response());
                if (!empty($formsData)) {
                    $response->addData('forms', $formsData);
                }
                Log::debug("[PageModule] Forms data after walkForForms", ['formsDataType' => gettype($formsData), 'is_empty' => empty($formsData)]);
            } catch (Exception $e) {
                $response->addHistory("Error processing forms in PageModule via walkForForms: " . $e->getMessage(), 'error', $e->getTrace());
            }
            if ($response->isHalted()) {
                $response->addHistory("Execution halted during walkForForms modifier.", 'warning');
            }
        } else {
            $response->addHistory("Skipping form processing (walkForForms) because structure is empty after walkForOperations.", 'warning');
        }

        // Allow subclasses to hook after running modificators but before adding data
        if (method_exists($this, 'afterModificatorRun')) {
            [$structure, $formsData] = $this->afterModificatorRun($response, $currentPagePath, $this->storage, $structure, $formsData);
        }

        // Allow subclasses to hook after processing but before final data assignment
        if (method_exists($this, 'afterRun')) {
            $this->afterRun($response, $currentPagePath, $this->storage, $structure, $formsData);
        }

        $response->addHistory("PageModule::moduleRun finished for path: {$currentPagePath}");
        Log::debug("[PageModule::moduleRun] Returning response with data merged via addDataRecursive.", ['data_keys' => array_keys($response->getData())]);

        // <<< REMOVED: Explicit component setting per user request >>>
        // $response->addData('component', 'Dynamic/Index');
        // Log::debug("[PageModule::moduleRun] Explicitly set component to Dynamic/Index.");

        return $response;
    }

    // Example Hook methods (optional for subclasses to implement)
    // protected function beforeRun(StepResponse $response, string $pagePath, DataHub $storage) {}
    // protected function afterModificatorRun(StepResponse $response, string $pagePath, DataHub $storage, ?array $structure, ?array $formsResult): array { return [$structure, $formsResult]; }
    // protected function afterRun(StepResponse $response, string $pagePath, DataHub $storage, ?array $structure, ?array $formsResult) {}
}
