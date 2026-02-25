<?php

namespace Tests\Feature\AiRudeDepot\App;

use App\AiRudeDepot\App\App;
use Tests\TestCase;
use Mockery;
use Illuminate\Http\Request;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\AiRudeDepot;
use App\AiRudeDepot\Actions\BasicStep;
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Facades\Storage;

class AiRudeDepotAppTest extends TestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('aiTest');
    }

    public function test_app_class_exists()
    {
        $this->assertTrue(class_exists(App::class), 'App class should exist.');
    }

    public function test_app_method_functionality()
    {
        // Provide a valid Request object
        $request = Request::create('/test', 'GET');
        $DataHub = new DataHub('aiTest');
        $app = new App($request, $this->app, 'dummy', $DataHub);

        // Now test the App instance
        $this->assertInstanceOf(App::class, $app);
        // Add more specific assertions about its state or methods if needed
        $this->assertEquals('GET', $app->requestType);
    }

    public function test_run_method()
    {
        // Test the basic run flow without mocking internal methods
        $request = Request::create('/test-run', 'POST', ['action' => 'test_action']);
        $DataHub = new DataHub('aiTest');
        $app = new App($request, $this->app, 'dummy', $DataHub);

        // Call run directly on the App instance
        $result = $app->run('test');

        // Assert that it returns a StepResponse
        $this->assertInstanceOf(StepResponse::class, $result, 'App::run should return a StepResponse.');
    }

    // Ensure Mockery is closed after tests
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
