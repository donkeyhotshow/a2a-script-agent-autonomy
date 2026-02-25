<?php

namespace Tests\Feature\AiRudeDepot\TestModules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\PermanentLinkManager;

class TestPageModule extends BaseApp
{
    public function __construct(Request $request, Application $app, string $moduleSlug, ?DataHub $dataHub = null, ?PermanentLinkManager $linkManager = null)
    {
        parent::__construct($request, $app, $moduleSlug, $dataHub, $linkManager);
        Log::info("[TestPageModule in TestModules path]::__construct] Instantiated for slug: " . $moduleSlug . " with DataHub hash: " . ($this->storage ? spl_object_hash($this->storage) : 'null'));
    }

    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        $response->setDataHub($this->storage); // Ensure DataHub is set on the response for safety, though App::run also does this

        Log::info("[TestPageModule in TestModules path]::moduleRun] Executing for pageIdentifier: " . $pageIdentifier . " and slug " . $this->moduleSlug);

        // CORRECTED: Access permalink data injected by Main::runAppEnv
        $permalinkData = $this->getStorage()->address('buffer:app.permalink_data')->get();

        $title = 'Default Test Page Title From TestModules'; // Fallback title
        $content = 'Default test page content From TestModules.'; // Fallback content

        if ($permalinkData && is_array($permalinkData)) {
            Log::info("[TestPageModule in TestModules path]::moduleRun] Permalink data from storage ('buffer:app.permalink_data'): ", $permalinkData);
            $title = $permalinkData['metadata']['title'] ?? $title;
            // Assuming content might also be in metadata or a top-level key in $permalinkData
            $content = $permalinkData['metadata']['content'] ?? ($permalinkData['content'] ?? $content);
        } else {
            Log::warning("[TestPageModule in TestModules path]::moduleRun] Permalink data NOT found or in unexpected format at 'buffer:app.permalink_data'. Using fallbacks.", [
                'retrieved_data' => $permalinkData,
                'page_identifier' => $pageIdentifier
            ]);
        }

        $response->addData('title', $title);
        $response->addData('content', $content);
        $response->addHistory('TestPageModule [TestModules path] moduleRun executed.');
        Log::info("[TestPageModule in TestModules path]::moduleRun] Response data after adding title/content: ", $response->getData());
        return $response;
    }
}
