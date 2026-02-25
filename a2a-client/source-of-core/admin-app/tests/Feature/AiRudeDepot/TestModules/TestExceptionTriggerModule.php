<?php

namespace Tests\Feature\AiRudeDepot\TestModules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Managers\PermanentLinkManager;

class TestExceptionTriggerModule extends BaseApp
{
    public function __construct(Request $request, Application $app, string $moduleSlug, ?DataHub $dataHub = null, ?PermanentLinkManager $linkManager = null)
    {
        parent::__construct($request, $app, $moduleSlug, $dataHub, $linkManager);
        Log::info("[TestExceptionTriggerModule::__construct] Instantiated for slug: " . $moduleSlug);
    }

    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        Log::info("[TestExceptionTriggerModule::moduleRun] Executing for pageIdentifier: " . $pageIdentifier . " - WILL THROW EXCEPTION");
        throw new \Exception('Simulated module execution error from TestExceptionTriggerModule');
    }
} 