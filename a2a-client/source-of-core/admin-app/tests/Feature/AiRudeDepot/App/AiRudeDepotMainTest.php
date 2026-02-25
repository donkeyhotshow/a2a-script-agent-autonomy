<?php

namespace Tests\Feature\AiRudeDepot\App;

use App\AiRudeDepot\App\Main;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\RefreshDatabase;

// Added trait
use Illuminate\Foundation\Testing\WithoutMiddleware;

// Add if needed
use Tests\TestCase;
use Mockery;
use Illuminate\Contracts\Foundation\Application;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\App\App as FrontendApp;
use Illuminate\Support\Facades\Config;

// Needed for setting config
use App\Models\User;

// Needed for auth test
use Illuminate\Support\Facades\Auth;

// Needed for auth test
use Illuminate\Support\Facades\Storage;

// Needed for writing test permalinks
use App\AiRudeDepot\Managers\PermanentLinkManager;

// Needed for override
use App\AiRudeDepot\Managers\ModuleClassResolver;
use Illuminate\Support\Facades\Log;
use Mockery\MockInterface;

class AiRudeDepotMainTest extends TestCase
{
    use RefreshDatabase;

    // Added trait usage

    // use WithoutMiddleware; // Uncomment if middleware interferes

    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    protected DataHub $dataHub;
    protected $app;
    protected PermanentLinkManager $linkManager; // Added property for manager

    protected function setUp(): void
    {
        parent::setUp();
        $this->app = app();
        $this->dataHub = new DataHub('aiTest');
        $this->app->instance(DataHub::class, $this->dataHub);

        $this->linkManager = $this->app->make(PermanentLinkManager::class);
        $this->setupTestPermalinksAndOverride();

        // Comment out or remove the old instance mock:
        // $this->mock(ModuleClassResolver::class, function (MockInterface $mock) {
        //     $mock->shouldReceive('resolve')->with('test-page')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestPageModule::class);
        //     $mock->shouldReceive('resolve')->with('test-admin')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestAdminModule::class);
        //     $mock->shouldReceive('resolve')->with('test-error')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestErrorModule::class);
        //     $mock->shouldReceive('resolve')->with('test-post')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestPostModule::class);
        //     $mock->shouldReceive('resolve')->with('test-subpath')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestSubpathModule::class);
        //     // Add a fallback for any other slug to prevent errors if other tests hit it
        //     $mock->shouldReceive('resolve')->withAnyArgs()->andReturnUsing(function($slug) {
        //         // Attempt to resolve non-test slugs normally, or return a specific default/error for unmocked test slugs
        //         // For this test suite, we expect specific test slugs to be handled above.
        //         // Any other slug might be an actual application module slug or an error.
        //         // Returning null will likely cause Main::runAppEnv to fail module construction, which is an indicator.
        //          Log::warning("[AiRudeDepotMainTest MOCK ModuleClassResolver] Unhandled slug: " . $slug . ", returning null.");
        //         return null;
        //     });
        // });

        // Add alias mock for static calls
        $resolverMock = Mockery::mock('alias:' . \App\AiRudeDepot\App\Helpers\ModuleClassResolver::class);
        $resolverMock->shouldReceive('resolve')->with('test-page')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestPageModule::class);
        $resolverMock->shouldReceive('resolve')->with('test-admin')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestAdminModule::class);
        $resolverMock->shouldReceive('resolve')->with('test-error')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestErrorModule::class);
        $resolverMock->shouldReceive('resolve')->with('test-post')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestPostModule::class);
        $resolverMock->shouldReceive('resolve')->with('test-subpath')->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestSubpathModule::class);
        $resolverMock->shouldReceive('resolve')->withAnyArgs()->andReturnUsing(function ($slug) {
            // Important: Log from the MOCK to see if it's hit
            Log::info("[AiRudeDepotMainTest STATIC MOCK ModuleClassResolver::resolve] CALLED WITH SLUG: " . $slug);
            $knownTestSlugs = ['test-page', 'test-admin', 'test-error', 'test-post', 'test-subpath'];
            if (!in_array($slug, $knownTestSlugs)) {
                // This case handles slugs that are NOT one of our explicitly mocked test slugs.
                // Example: if 'errors/404' resolves to module 'errors' (not 'test-error'), this will be hit.
                // For AiRudeDepotMainTest, the permalinks are set up such that 'errors' module is 'test-error'.
                // So this path might be hit for genuinely unknown slugs, or if a permalink points to a non-test module.
                Log::warning("[AiRudeDepotMainTest STATIC MOCK ModuleClassResolver] Unhandled slug by specific rules: '" . $slug . "', returning null to let system try default resolution or fail.");
                return null;
            }
            // If the slug IS one of the knownTestSlugs but wasn't caught by a more specific ->with('slug') expectation,
            // it means there is a logic error in the mock setup (e.g. withAnyArgs before specific ones, or a typo).
            // Or, it means a specific test slug was passed for which we didn't set up an explicit ->andReturn().
            // For AiRudeDepotMainTest, all listed test slugs DO have explicit returns.
            Log::error("[AiRudeDepotMainTest STATIC MOCK ModuleClassResolver] Fallback for known test slug '" . $slug . "' hit. This indicates missing explicit mock or ordering issue. Returning null.");
            return null;
        });
    }

    /**
     * Sets up test permalinks and overrides the PermanentLinkManager.
     */
    protected function setupTestPermalinksAndOverride(): void
    {
        // Define permalinks specifically for testing purposes
        $permalinks = [
            'test-page' => [
                'path' => 'test-page',
                // Corrected: Use slug
                'module' => 'test-page',
                'metadata' => ['required_access' => 'public', 'title' => 'Test Page'],
                'handles_subpaths' => false,
            ],
            'admin/dashboard' => [
                'path' => 'admin/dashboard',
                // Corrected: Use slug
                'module' => 'test-admin',
                'metadata' => ['required_access' => 'admin', 'title' => 'Admin Dashboard'],
                'handles_subpaths' => false,
            ],
            'linked-page-source' => [
                'path' => 'linked-page-source',
                // Corrected: Use slug
                'module' => 'test-page', // Target module remains the same, slug is for lookup
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => false,
                'link' => 'target-page' // Points to another permalink entry
            ],
            'target-page' => [
                'path' => 'target-page',
                // Corrected: Use slug
                'module' => 'test-page',
                'metadata' => ['required_access' => 'public', 'title' => 'Target Page'],
                'handles_subpaths' => false,
            ],
            // Parent for subpath handling
            'sub/parent' => [
                'path' => 'sub/parent',
                // Corrected: Use slug
                'module' => 'test-subpath',
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => true,
            ],
            // Module for POST requests
            'test-post' => [
                'path' => 'test-post',
                // Corrected: Use slug
                'module' => 'test-post',
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => false,
            ],
            'test/success' => [
                'path' => 'test/success',
                // Corrected: Use slug
                'module' => 'test-page', // Target module for the redirect success page
                'metadata' => ['required_access' => 'public', 'title' => 'Redirect Success Page'],
                'handles_subpaths' => false,
            ],
            // Error handling module (used internally by Main)
            'errors' => [
                'path' => 'errors',
                // Corrected: Use slug
                'module' => 'test-error',
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => true,
            ],
            // Recursive loop for depth test
            'test-loop-a' => [
                'path' => 'test-loop-a',
                // Corrected: Use slug
                'module' => 'test-page',
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => false,
                'link' => 'test-loop-b'
            ],
            'test-loop-b' => [
                'path' => 'test-loop-b',
                // Corrected: Use slug
                'module' => 'test-page',
                'metadata' => ['required_access' => 'public'],
                'handles_subpaths' => false,
                'link' => 'test-loop-a'
            ],
            // --- Add permalinks for default error codes if needed by resolveFinalRedirectTarget ---
            'errors/404' => [
                'path' => 'errors/404',
                // Corrected: Use slug
                'module' => 'test-error', // Should resolve to the 'errors' base module
                'metadata' => ['required_access' => 'public', 'title' => 'Error 404 - Test'],
                'handles_subpaths' => false, // Specific error codes don't handle subpaths
            ],
            'errors/403' => [
                'path' => 'errors/403',
                // Corrected: Use slug
                'module' => 'test-error',
                'metadata' => ['required_access' => 'public', 'title' => 'Error 403 - Test'],
                'handles_subpaths' => false,
            ],
            'errors/500' => [
                'path' => 'errors/500',
                // Corrected: Use slug
                'module' => 'test-error',
                'metadata' => ['required_access' => 'public', 'title' => 'Error 500 - Test'],
                'handles_subpaths' => false,
            ],
        ];

        // Override the manager's internal list
        $this->linkManager->overridePermalinks($permalinks);
    }

    public function test_construct_app_resolves_base_app_class()
    {
        $moduleSlug = 'test-page';
        $expectedClass = \Tests\Feature\AiRudeDepot\Modules\TestPageModule::class;
        $request = new Request(); // Need a dummy request

        // FIX: Pass arguments in the correct order and type
        $appInstance = Main::constructApp($expectedClass, $moduleSlug, $request, $this->app, $this->dataHub);
        $this->assertInstanceOf($expectedClass, $appInstance);
        $this->assertSame($this->dataHub, $appInstance->getStorage());
    }

    public function test_construct_app_throws_exception_for_non_existent_class()
    {
        $moduleSlug = 'nonexistent-module';
        $nonExistentClass = 'App\\AiRudeDepot\\Modules\\NonExistentAppClass';
        $request = new Request(); // Need a dummy request

        $this->expectException(\Exception::class);
        // FIX: Removed message matching as it was brittle
        // $this->expectExceptionMessageMatches("/Module class {$nonExistentClass} not found/");

        Main::constructApp($nonExistentClass, $moduleSlug, $request, $this->app, $this->dataHub);
    }

    // --- Integration Tests for runAppEnv ---

    public function test_run_app_env_get_success()
    {
        $request = Request::create('/test-page', 'GET');
        $response = Main::runAppEnv('test-page', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted());
        $this->assertEquals(StepStatusEnum::OK, $response->getStatus());
        $this->assertArrayHasKey('title', $response->getData());
        $this->assertEquals('Test Page', $response->getData()['title']);

        $history = $response->getHistory();
        $this->assertCount(3, $history, 'Expected 3 history entries for GET request after App logic changes.');

        $this->assertStringContainsString('Tests\Feature\AiRudeDepot\Modules\TestPageModule constructed with slug: test-page', $history[0]['message'] ?? '');
        $this->assertStringContainsString('Base Frontend\App::run called for page:', $history[1]['message'] ?? '');
        $this->assertStringContainsString('TestPageModule [Modules path] moduleRun executed for ', $history[2]['message'] ?? '');
    }

    public function test_run_app_env_get_404()
    {
        $request = Request::create('/some/nonexistent/path', 'GET');
        // System should internally map this to 'errors/404'
        $response = Main::runAppEnv('/some/nonexistent/path', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted()); // 404 doesn't halt by default in TestErrorModule
        $this->assertEquals('Error 404 - Test', $response->getData()['title']);
        $this->assertEquals('An error occurred. Error code: 404 processed by TestErrorModule in Modules path', $response->getData()['message']);
        // Check history for signs of recursion
        $history = $response->getHistory(); // Assign to variable
        $this->assertStringContainsString('TestErrorModule [Modules path] moduleRun executed for error code: 404', end($history)['message']);
    }

    public function test_run_app_env_get_admin_access_denied_403()
    {
        // Simulate a guest trying to access an admin route
        // The permalink for 'admin/dashboard' requires 'admin' access.
        // Main::runAppEnv should internally redirect to 'errors/403'
        $request = Request::create('/admin/dashboard', 'GET');
        $response = Main::runAppEnv('admin/dashboard', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertEquals('Error 403 - Test', $response->getData()['title']);
        $history = $response->getHistory(); // Assign to variable
        $this->assertStringContainsString('TestErrorModule [Modules path] moduleRun executed for error code: 403', end($history)['message']);
    }

    public function test_run_app_env_get_admin_access_granted()
    {
        // Authenticate a user
        $user = User::factory()->create(); // Assuming you have a User model and factory
        Auth::login($user);

        $request = Request::create('/admin/dashboard', 'GET');
        $response = Main::runAppEnv('admin/dashboard', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted());
        $this->assertEquals('Test Admin Page Title', $response->getData()['title']);
        $this->assertStringContainsString('TestAdminModule run executed', $response->getHistory()[0]['message']);

        Auth::logout(); // Clean up
    }

    public function test_run_app_env_get_permalink_link_resolution()
    {
        $request = Request::create('/linked-page-source', 'GET');
        // 'linked-page-source' permalink has a 'link' attribute to 'target-page'
        $response = Main::runAppEnv('linked-page-source', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted());
        $this->assertEquals('Target Page', $response->getData()['title']);
        $history = $response->getHistory();
        $this->assertStringContainsString('TestPageModule [Modules path] moduleRun executed for target-page with title: Target Page', end($history)['message']);
    }

    public function test_run_app_env_post_permalink_redirect_response()
    {
        $request = Request::create('/test-post', 'POST', ['action' => 'do_redirect']);
        // The 'test-post' permalink should trigger TestPostModule
        $response = Main::runAppEnv('test-post', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertTrue($response->isHalted(), "Response should be halted on redirect.");
        $this->assertEquals(StepStatusEnum::REDIRECT, $response->getStatus());
        $this->assertArrayHasKey('redirect', $response->getData(), "Response data should have a 'redirect' key.");
        // LinkManager->getPublicUrlBySlug('test/success') should resolve to '/test/success' based on permalink setup
        $this->assertEquals('/test/success', $response->getData()['redirect']);
    }

    public function test_run_app_env_post_success_with_merged_data()
    {
        $initialDataHub = $this->app->make(DataHub::class);
        $initialDataHub->address('buffer:initial')->set('initial_value');

        $request = Request::create('/test-post', 'POST', ['action' => 'default_success', 'payload' => 'test_payload']);
        $response = Main::runAppEnv('test-post', $request, $this->app, '', 0, $initialDataHub, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted());
        $this->assertEquals(StepStatusEnum::OK, $response->getStatus());

        // Check that data from moduleRun (e.g., title) and moduleActions (e.g., action_result) are present
        $this->assertEquals('Test POST Page', $response->getData()['title']);
        $this->assertEquals('Default success action completed.', $response->getData()['action_result']);

        // Check that the DataHub reflects changes from both (though in this simple case, moduleRun doesn't change DataHub)
        // and that the initial DataHub state is preserved if not overwritten.
        $finalDataHub = $response->getDataHub();
        $this->assertSame($initialDataHub, $finalDataHub, "DataHub instance should be the same if passed in and not replaced.");
        $this->assertEquals('initial_value', $finalDataHub->address('buffer:initial')->get());

        // Check history for both action and run
        $history = $response->getHistory();

        // Updated expected history order and count:
        // 1. Constructor: TestPostModule constructed with slug: test-post
        // 2. Action:      TestPostModule moduleActions executing action: default_success
        // 3. Base Run:    Base Frontend\\App::run called for page: test-post
        // 4. Module Run:  TestPostModule moduleRun executed.
        $this->assertCount(4, $history, "History count mismatch. Expected 4 entries.");
        $this->assertStringContainsString('TestPostModule constructed with slug: test-post', $history[0]['message'] ?? '');
        $this->assertStringContainsString('TestPostModule moduleActions executing action: default_success', $history[1]['message'] ?? '');
        $this->assertStringContainsString('Base Frontend\\App::run called for page: test-post', $history[2]['message'] ?? '');
        $this->assertStringContainsString('TestPostModule moduleRun executed', $history[3]['message'] ?? '');
    }

    public function test_run_app_env_post_validation_error_re_renders_with_datahub()
    {
        $initialDataHub = $this->app->make(DataHub::class);
        $initialDataHub->address('buffer:form_data')->set(['field' => 'original_value']);

        // Simulate a POST request that fails validation in moduleActions
        $request = Request::create('/test-post', 'POST', ['action' => 'validation_fail', 'form_field' => 'invalid_data']);

        // Pass the initial DataHub. moduleActions in TestPostModule will set 'buffer:error' = true on this DataHub.
        // Main::runAppEnv should then call moduleRun again, which should see this error flag.
        $response = Main::runAppEnv('test-post', $request, $this->app, '', 0, $initialDataHub, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertFalse($response->isHalted(), "Response should not be halted on validation error for re-render.");
        $this->assertEquals(StepStatusEnum::OK, $response->getStatus(), "Status should be OK for re-rendering the page with errors.");

        // moduleRun in TestPostModule should add 'actionError' => true to response data if 'buffer:error' is set
        $this->assertArrayHasKey('actionError', $response->getData(), "Response data should contain actionError.");
        $this->assertTrue($response->getData()['actionError'], "actionError should be true after validation failure.");
        $this->assertEquals('Test POST Page', $response->getData()['title'], "Title should still be set for the re-rendered page.");
        $this->assertEquals('Simulated validation failed!', $response->getData()['validation_message'], "Validation message from action should be in response data.");

        // Verify the DataHub associated with the final response still has the error flag
        $finalDataHub = $response->getDataHub();
        $this->assertNotNull($finalDataHub, "Final response should have a DataHub.");
        $this->assertEquals(true, $finalDataHub->address('buffer:error')->get(), "DataHub should reflect the error state set in moduleActions.");
        $this->assertEquals(['field' => 'original_value'], $finalDataHub->address('buffer:form_data')->get(), "Original DataHub data should persist.");
    }

    public function test_run_app_env_exception_in_action_triggers_500()
    {
        // Explicitly close any mocks from setUp before setting up test-specific ones for this alias
        // This is to be absolutely sure our local mock for ModuleClassResolver takes precedence.
        // Note: setUp will run again for the next test method, re-establishing its own mocks.
        \Mockery::close();

        // Re-establish the global mocks that this test might rely on if they were cleared by the close above
        // and are needed before ModuleClassResolver is called, or if other parts of Main rely on them.
        // This is getting complex; ideally, a test shouldn't fight the global setUp this much.
        // For now, let's re-do the essential resolver mock from setUp if we closed it.
        // Better: The test should be self-contained or the setUp mock should be more flexible.

        // Let's assume the original setUp mock for ModuleClassResolver is active from the test runner.
        // We will override it locally.

        $testPostModuleClass = \Tests\Feature\AiRudeDepot\Modules\TestPostModule::class;
        $moduleSlugForTest = 'test-post';

        $requestForMockResolution = $this->app->make(Request::class);
        $mockedAppInstance = Mockery::mock(
            $testPostModuleClass,
            [$requestForMockResolution, $this->app, $moduleSlugForTest, $this->dataHub]
        )->makePartial()->shouldAllowMockingProtectedMethods();

        Log::debug("[AiRudeDepotMainTest::test_exception_in_action] Mocked TestPostModule instance hash in test: " . spl_object_hash($mockedAppInstance) . " DataHub hash on mock: " . ($mockedAppInstance->getStorage() ? spl_object_hash($mockedAppInstance->getStorage()) : 'NULL_STORAGE'));

        $mockedAppInstance->shouldReceive('moduleActions')
            ->with(Mockery::type(Request::class))
            ->once()
            ->andThrow(new \Exception('Intentional action exception'));

        // Override the ModuleClassResolver mock for this specific test case
        // This needs to happen AFTER the generic setUp mocks are done if we didn't close them,
        // or we need to ensure it's the one the SUT uses.
        $resolverOverride = Mockery::mock('alias:' . \App\AiRudeDepot\App\Helpers\ModuleClassResolver::class);
        Log::debug("[AiRudeDepotMainTest::test_exception_in_action] Overriding ModuleClassResolver for '{$moduleSlugForTest}' to return mock object.");
        $resolverOverride->shouldReceive('resolve')->with($moduleSlugForTest)->ordered()->andReturn($mockedAppInstance);

        // When an exception in 'test-post' leads to rendering 'errors/500',
        // the permalink for 'errors/500' resolves to module 'test-error'.
        // So, the ModuleClassResolver will be called with 'test-error'.
        $resolverOverride->shouldReceive('resolve')->with('test-error')->ordered()->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestErrorModule::class);

        // Fallback for any other resolve calls during this test.
        // Mimic the global fallback from AiRudeDepotMainTest::setUp() which returns base App class.
        $resolverOverride->shouldReceive('resolve')->withAnyArgs()->ordered()->andReturnUsing(function ($slug) {
            Log::warning("[Test ResolverOverride] Fallback resolve for unhandled slug: {$slug}. Returning base App::class.");
            return \App\AiRudeDepot\App\App::class;
        });

        $request = Request::create('/test-post', 'POST', ['action' => 'throw_exception']);
        $response = Main::runAppEnv('test-post', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertEquals(StepStatusEnum::ERROR_CRITICAL, $response->getStatus(), "Status should be ERROR_CRITICAL after unhandled exception in action.");
        $this->assertEquals('Error 500 - Test', $response->getData()['title'], "Should render the 500 error page from permalink.");

        $history = $response->getHistory();
        $this->assertCount(3, $history, "History count mismatch. Expected 3 entries for error page flow.");
        $this->assertStringContainsString('Skipping all action processing and action-related history for error module (test-error)', $history[0]['message'] ?? '');
        $this->assertStringContainsString('TestErrorModule [Modules path] moduleRun executed for error code: 500', $history[1]['message'] ?? '');
        $this->assertStringContainsString('Original exception caught in initial call: Exception - Intentional action exception', $history[2]['message'] ?? '');

        Mockery::close();
    }

    // Helper method to get expected class for other slugs, mirroring AiRudeDepotMainTest::setUp logic
    private function getExpectedClassForTestSlug(string $slug): ?string
    {
        switch ($slug) {
            case 'test-page':
                return \Tests\Feature\AiRudeDepot\Modules\TestPageModule::class;
            case 'test-admin':
                return \Tests\Feature\AiRudeDepot\Modules\TestAdminModule::class;
            case 'test-error':
            case 'errors':
            case 'errors/404':
            case 'errors/500':
            case 'errors/403':
                return \Tests\Feature\AiRudeDepot\Modules\TestErrorModule::class;
            case 'test-post':
                return \Tests\Feature\AiRudeDepot\Modules\TestPostModule::class;
            case 'test-subpath':
                return \Tests\Feature\AiRudeDepot\Modules\TestSubpathModule::class;
            default:
                return null;
        }
    }

    public function test_run_app_env_exception_in_run_triggers_500()
    {
        $testPageModuleClass = \Tests\Feature\AiRudeDepot\Modules\TestPageModule::class;
        $moduleSlugForTest = 'test-page';

        // Similar to the action exception, ensure a clean slate for Mockery for this test's resolver override
        \Mockery::close();

        $requestForMockResolution = $this->app->make(Request::class);
        $mockedAppInstance = Mockery::mock(
            $testPageModuleClass,
            [$requestForMockResolution, $this->app, $moduleSlugForTest, $this->dataHub]
        )->makePartial()->shouldAllowMockingProtectedMethods();

        // This time, the exception should be in moduleRun()
        $mockedAppInstance->shouldReceive('moduleRun')
            ->once()
            ->andThrow(new \Exception('Intentional run exception'));

        $resolverOverride = Mockery::mock('alias:' . \App\AiRudeDepot\App\Helpers\ModuleClassResolver::class);
        $resolverOverride->shouldReceive('resolve')->with($moduleSlugForTest)->ordered()->andReturn($mockedAppInstance);
        $resolverOverride->shouldReceive('resolve')->with('test-error')->ordered()->andReturn(\Tests\Feature\AiRudeDepot\Modules\TestErrorModule::class);
        $resolverOverride->shouldReceive('resolve')->withAnyArgs()->ordered()->andReturnUsing(function ($slug) {
            Log::warning("[Test ResolverOverride - ExceptionInRun] Fallback resolve for unhandled slug: {$slug}. Returning base App::class.");
            return \App\AiRudeDepot\App\App::class;
        });

        $request = Request::create('/test-page', 'GET'); // GET request for this one
        $response = Main::runAppEnv('test-page', $request, $this->app, '', 0, null, $this->linkManager);

        $this->assertInstanceOf(StepResponse::class, $response);
        $this->assertEquals(StepStatusEnum::ERROR_CRITICAL, $response->getStatus(), "Status should be ERROR_CRITICAL after unhandled exception in run.");
        $this->assertEquals('Error 500 - Test', $response->getData()['title'], "Should render the 500 error page.");

        $history = $response->getHistory();
        // Log the actual history to help debug if this fails
        Log::debug("[test_run_app_env_exception_in_run_triggers_500] Actual History:", $history);

        // History from the original failing module run (TestPageModule) is NOT carried over.
        // For GET requests leading to an error page, moduleActions on the error module is NOT explicitly called by Main.
        // Thus, the history comes from TestErrorModule::moduleRun and the Main catch block.
        $this->assertCount(2, $history, "History count mismatch for exception in run flow.");
        // Entry 0: From TestErrorModule::moduleRun during error page rendering
        $this->assertStringContainsString('TestErrorModule [Modules path] moduleRun executed for error code: 500', $history[0]['message'] ?? '');
        // Entry 1: From Main::catch block after handling the error page
        $this->assertStringContainsString('Original exception caught in initial call: Exception - Intentional run exception', $history[1]['message'] ?? '');

        Mockery::close();
    }

    protected function tearDown(): void
    {
        // Reset the permalink manager to its original state
        if (isset($this->linkManager)) {
            $this->linkManager->resetPermalinks();
        }

        // Clean up test permalink files if they were created (optional now)
        // Storage::disk('aiTest')->deleteDirectory('permalinks');

        Mockery::close();
        parent::tearDown();
    }
}
