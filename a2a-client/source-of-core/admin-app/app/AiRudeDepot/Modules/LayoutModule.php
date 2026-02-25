<?php

namespace App\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Processors\DataProcessor;
use Exception;

class LayoutModule extends App
{
    /**
     * Standard run logic for layout-type modules.
     * Fetches layout structure AND form data using layoutModule and layoutFormComponent.
     */
    public function moduleRun(StepResponse $response, string $pagePath): StepResponse
    {
        $response->addHistory("LayoutModule::moduleRun starting for module: {$this->folder}");
        try {
            // Allow subclasses to hook before running modificators
            if (method_exists($this, 'beforeRun')) {
                $this->beforeRun($response, $pagePath, $this->storage);
            }

            // --- Get Page Structure ---
            $modResultStructure = DataProcessor::data(null, $this->storage)
                ->layoutModule($this->folder)
                ->layoutNodeOperation();
            $structure = $modResultStructure->result();
            $response->mergeMeta($modResultStructure->response());

            // --- Get Forms in a SEPARATE Modificator instance ---
            $formsData = null;
            if ($structure) {
                try {
                    $modResultForms = DataProcessor::data((array)$structure, $this->storage)
                        ->layoutFormComponent($this->folder);
                    $formsData = $modResultForms->result();
                    $response->mergeMeta($modResultForms->response());
                } catch (Exception $e) {
                    $response->addHistory("Error processing forms in LayoutModule: " . $e->getMessage(), 'error', $e->getTrace());
                }
            } else {
                $response->addHistory("Skipping form processing because structure is empty.", 'warning');
            }
            // ---------------------------------------------------------

            // Allow subclasses to hook after running modificators but before adding data
            if (method_exists($this, 'afterModificatorRun')) {
                [$structure, $formsData] = $this->afterModificatorRun($response, $pagePath, $this->storage, $structure, $formsData);
            }

            // Add Structure
            if ($structure) {
                $response->addHistory("Adding page structure from LayoutModule modificator to response");
                $response->addDataRecursive($structure);
            } else {
                $response->addHistory("Page structure from LayoutModule chain is empty/null", 'warning');
            }

            // Add Forms Data
            if ($formsData) {
                $response->addHistory("Adding forms data from SEPARATE modificator to response");
                $response->addDataRecursive(['forms' => $formsData]);
            } else {
                $response->addHistory("Forms data from SEPARATE modificator is empty/null", 'warning');
            }

            // Allow subclasses to hook after adding data
            if (method_exists($this, 'afterRun')) {
                $this->afterRun($response, $pagePath, $this->storage, $structure, $formsData);
            }

        } catch (Exception $e) {
            $response->addHistory('Error in LayoutModule::moduleRun: ' . $e->getMessage(), 'error', $e->getTrace());
        }
        $response->addHistory("LayoutModule::moduleRun finished for module: {$this->folder}");
        return $response;
    }

    // Example Hook methods (optional for subclasses to implement)
    // protected function beforeRun(StepResponse $response, string $pagePath, DataHub $storage) {}
    // protected function afterModificatorRun(StepResponse $response, string $pagePath, DataHub $storage, ?array $structure, ?array $formsResult): array { return [$structure, $formsResult]; }
    // protected function afterRun(StepResponse $response, string $pagePath, DataHub $storage, ?array $structure, ?array $formsResult) {}
}
