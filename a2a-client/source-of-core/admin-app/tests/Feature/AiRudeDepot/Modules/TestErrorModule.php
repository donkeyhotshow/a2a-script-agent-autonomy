<?php

namespace Tests\Feature\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\PermanentLinkManager;

class TestErrorModule extends BaseApp
{
    public function __construct(Request $request, Application $app, string $moduleSlug, ?DataHub $dataHub = null, ?PermanentLinkManager $linkManager = null)
    {
        parent::__construct($request, $app, $moduleSlug, $dataHub, $linkManager);
        Log::info("[TestErrorModule in Modules path]::__construct] Instantiated for slug: " . $moduleSlug);
    }

    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        $response->setDataHub($this->storage);
        $errorCode = filter_var($pageIdentifier, FILTER_VALIDATE_INT);

        $permalinkData = $this->getStorage()->address('buffer:app.permalink_data')->get();
        $title = 'Error From TestErrorModule';

        if ($permalinkData && isset($permalinkData['metadata']['title'])) {
            $title = $permalinkData['metadata']['title'];
            Log::debug('[TestErrorModule in Modules path] Title from permalink metadata: ' . $title);
        } elseif ($errorCode) {
            $title = 'Error ' . $errorCode . ' from TestErrorModule';
            Log::debug('[TestErrorModule in Modules path] Title fallback: ' . $title);
        }

        $response->addData('title', $title);
        $response->addData('message', 'An error occurred. Error code: ' . ($errorCode ?: 'Undefined') . ' processed by TestErrorModule in Modules path');
        if ($errorCode) {
            $response->addData('error_code', (string)$errorCode);
        }
        $response->addHistory('TestErrorModule [Modules path] moduleRun executed for error code: ' . ($errorCode ?: $pageIdentifier));

        switch ($errorCode) {
            case 403:
                $response->setStatus(StepStatusEnum::ERROR_FORBIDDEN);
                break;
            case 404:
                $response->setStatus(StepStatusEnum::ERROR_NOT_FOUND);
                break;
            case 500:
            default:
                $response->setStatus(StepStatusEnum::ERROR_CRITICAL);
                break;
        }

        Log::debug('[TestErrorModule in Modules path] Final status set IN MODULE RUN', ['status_val' => $response->getStatus()->value, 'status_name' => $response->getStatus()->name]);

        if ($pageIdentifier === '404') {
            Log::critical('[TestErrorModule in Modules path] Status in moduleRun for 404 just before return', [
                'status_obj_hash' => spl_object_hash($response),
                'status_obj' => $response->getStatus(),
                'status_val' => $response->getStatus()->value,
                'status_name' => $response->getStatus()->name
            ]);
        }

        return $response;
    }
}
