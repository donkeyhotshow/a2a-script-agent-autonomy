<?php

namespace Tests\Feature\AiRudeDepot\TestModules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\PermanentLinkManager;

class TestHomepageModule extends BaseApp
{
    public function __construct(Request $request, Application $app, string $moduleSlug, ?DataHub $dataHub = null, ?PermanentLinkManager $linkManager = null)
    {
        parent::__construct($request, $app, $moduleSlug, $dataHub, $linkManager);
        Log::info("[TestHomepageModule::__construct] Instantiated for slug: " . $moduleSlug . " with DataHub hash: " . ($this->storage ? spl_object_hash($this->storage) : 'null'));
    }

    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        Log::info("[TestHomepageModule::moduleRun] Executing for pageIdentifier: " . $pageIdentifier . " and slug " . $this->moduleSlug);

        // Retrieve permalink_data from DataHub, now set under 'buffer:app.permalink_data' key
        $permalinkData = $this->getStorage()->address('buffer:app.permalink_data')->get();
        Log::info("[TestHomepageModule::moduleRun] Permalink data from storage ('buffer:app.permalink_data'): ", is_array($permalinkData) ? $permalinkData : ['type' => gettype($permalinkData), 'value' => $permalinkData]);

        // Use data from $permalinkData if available, otherwise use test defaults
        $title = $permalinkData['metadata']['title'] ?? 'Homepage Title'; // Default matches test expectation
        $content = $permalinkData['content'] ?? 'Homepage content here.'; // Default matches test expectation

        $response->addData('title', $title);
        $response->addData('content', $content);
        $response->addHistory('TestHomepageModule moduleRun executed.');
        Log::info("[TestHomepageModule::moduleRun] Response data after adding title/content: ", $response->getData());
        return $response;
    }
}
