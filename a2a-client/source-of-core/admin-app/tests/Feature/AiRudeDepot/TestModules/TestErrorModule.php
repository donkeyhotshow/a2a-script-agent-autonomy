<?php

namespace Tests\Feature\AiRudeDepot\TestModules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\PermanentLinkManager;

class TestErrorModule extends BaseApp
{
    public function __construct(Request $request, Application $app, string $moduleSlug, ?DataHub $dataHub = null, ?PermanentLinkManager $linkManager = null)
    {
        parent::__construct($request, $app, $moduleSlug, $dataHub, $linkManager);
        Log::info("[TestErrorModule::__construct] Instantiated for slug: " . $moduleSlug . " with DataHub hash: " . ($this->storage ? spl_object_hash($this->storage) : 'null'));
    }

    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        Log::info("[TestErrorModule::moduleRun] Executing for pageIdentifier: " . $pageIdentifier . " and slug " . $this->moduleSlug);

        // Correctly retrieve the permalink data for the error page (e.g., errors/500)
        // This is set by Main::runAppEnv into the error module's instance DataHub.
        $permalinkData = $this->getStorage()->address('buffer:app.permalink_data')->get();

        Log::info("[TestErrorModule::moduleRun] Permalink data from storage ('buffer:app.permalink_data'): ", is_array($permalinkData) ? $permalinkData : ['type' => gettype($permalinkData), 'value' => $permalinkData]);

        // Use data from $permalinkData if available, otherwise use test defaults
        // TEMPORARILY FORCE FALLBACK
        // $title = 'Error ' . $pageIdentifier;
        $title = $permalinkData['metadata']['title'] ?? ('Error ' . $pageIdentifier);
        $message = $permalinkData['metadata']['message'] ?? ('Test error page for code: ' . $pageIdentifier);

        $response->addData('title', $title);
        $response->addData('message', $message);
        $response->addData('error_code', $pageIdentifier);
        $response->addHistory('TestErrorModule moduleRun executed for error: ' . $pageIdentifier);
        Log::info("[TestErrorModule::moduleRun] Response data after adding title/message: ", $response->getData());

        // Crucially, error modules in this system are expected to return a 200 OK StepResponse
        // The actual HTTP status (like 404) is set by ModuleRunner based on StepResponse status or permalink.
        // However, for the Inertia rendering part, the component itself is rendered with 200 OK.
        return $response;
    }
}
