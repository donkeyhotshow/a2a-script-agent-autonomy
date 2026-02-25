<?php

namespace Tests\Feature\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;

class TestSubpathModule extends BaseApp
{
    // This module's permalink should have handles_subpaths: true
    // The $pageIdentifier passed by Main will be the FULL original path
    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        $response->setDataHub($this->storage);

        $fullPathIdentifier = $this->request->path();

        $response->addData('title', 'Test Subpath Handler');
        $response->addData('full_path_received', $fullPathIdentifier);
        $response->addData('base_module', $this->moduleSlug);
        $response->addHistory('TestSubpathModule moduleRun executed for path: ' . $fullPathIdentifier);
        return $response;
    }
}
