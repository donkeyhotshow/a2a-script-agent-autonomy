<?php

namespace Tests\Feature\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;

class TestAdminModule extends BaseApp
{
    // Ensure this module uses moduleRun if it's supposed to align with recent refactoring
    // For now, keeping existing run() method as per original file.
    public function run(string $pageIdentifier): StepResponse
    {
        $response = new StepResponse();
        $response->setDataHub($this->storage);
        $response->addData('title', 'Test Admin Page Title');
        $response->addData('content', 'This is protected admin content for: ' . $pageIdentifier);
        $response->addHistory('TestAdminModule run executed for ' . $pageIdentifier);
        return $response;
    }
} 