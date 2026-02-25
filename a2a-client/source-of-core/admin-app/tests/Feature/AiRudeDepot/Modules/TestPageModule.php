<?php

namespace Tests\Feature\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Support\Facades\Log;

class TestPageModule extends BaseApp
{
    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        $response->setDataHub($this->storage);

        // Attempt to get permalink data from the instance's storage - CORRECTED ACCESS METHOD
        $permalinkData = $this->getStorage()->address('buffer:app.permalink_data')->get();
        $title = 'Test Page Fallback Title'; // Default/fallback title
        $content = 'Fallback content for ' . $pageIdentifier;

        if ($permalinkData && is_array($permalinkData)) {
            Log::debug("[TestPageModule in Modules path]::moduleRun] Permalink data found in DataHub", ['permalinkData' => $permalinkData]);
            $title = $permalinkData['metadata']['title'] ?? $title;
            $content = $permalinkData['metadata']['content'] ?? 'Content from permalink for: ' . $pageIdentifier;
        } else {
            Log::warning("[TestPageModule in Modules path]::moduleRun] Permalink data NOT found or in unexpected format for key 'buffer:app.permalink_data'", [
                'retrieved_data' => $permalinkData,
                'page_identifier' => $pageIdentifier
            ]);
        }

        $response->addData('title', $title);
        $response->addData('content', $content);
        $response->addHistory('TestPageModule [Modules path] moduleRun executed for ' . $pageIdentifier . ' with title: ' . $title);

        Log::debug("[TestPageModule in Modules path]::moduleRun] Data before return", [
            'response_data' => $response->getData()
        ]);

        return $response;
    }
}
