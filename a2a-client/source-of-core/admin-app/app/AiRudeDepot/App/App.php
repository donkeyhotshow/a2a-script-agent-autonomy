<?php

namespace App\AiRudeDepot\App;

use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;
use App\AiRudeDepot\Managers\PermanentLinkManager;
use App\AiRudeDepot\Processors\DataProcessor;
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Import the correct PermanentLinkManager

// NOTE: This is a new version in the Frontend namespace
class App
{
    public $item;
    public $folder;
    public $storage;
    public $environment;
    public $request;
    public $app;
    public $requestType;
    protected StepResponse $response;
    protected string $moduleSlug;
    protected ?DataHub $DataHub;
    protected ?PermanentLinkManager $linkManager;

    public function __construct(
        Request               $request,
        Application           $app,
        string                $moduleSlug,
        ?DataHub              $DataHub = null,
        ?PermanentLinkManager $linkManager = null
    )
    {
        $this->request = $request;
        $this->app = $app;
        $this->moduleSlug = $moduleSlug;
        $this->requestType = $request->method();
        $this->linkManager = $linkManager;

        $this->storage = $DataHub ?? $app->make(DataHub::class);

        $this->storage->address('buffer:history')->remove();
        Log::debug("[" . get_class($this) . "::__construct] Cleared buffer:history on DataHub before creating StepResponse", ['datahub_hash' => spl_object_hash($this->storage)]);

        $this->response = new StepResponse(null, $this->storage);
        $this->response->addData('module', $this->moduleSlug);

        // Conditional history for constructor
        if (!($this->moduleSlug === 'test-error' || Str::startsWith($this->moduleSlug, 'errors/'))) {
            $this->response->addHistory(get_class($this) . ' constructed with slug: ' . $this->moduleSlug);
        }

        if (method_exists($this, 'init')) {
            $this->init();
        }
    }

    public function actions(Request $request): StepResponse
    {
        $this->response->addHistory('Base Frontend\App::actions called');
        // Default: No actions processed, return current response state
        return $this->response;
    }

    public function moduleActions(Request $request): StepResponse
    {
        $moduleSlug = $this->getSlug();
        if ($moduleSlug === 'test-error' || Str::startsWith($moduleSlug, 'errors/')) {
            $this->response->addHistory('Skipping all action processing and action-related history for error module (' . $moduleSlug . ').', 'warning');
            return $this->response; // Return early for error modules
        }

        $this->response->addHistory('[Frontend\App::moduleActions] Run moduleActions');

        if ($request->isMethod('post')) {
            $this->response->addHistory('[Frontend\App::moduleActions] Processing POST request');

            // Prevent action processing within any error module context
            if ($moduleSlug === 'test-error' || Str::startsWith($moduleSlug, 'errors/')) {
                $this->response->addHistory('Skipping action processing in error module context (' . $moduleSlug . ').', 'warning');
            } else {
                foreach ($request->all() as $address => $data) {
                    $this->response->addHistory('[Frontend\App::moduleActions] Processing action for address: ' . $address);
                    if (isset($data['sendTo'])) {
                        // Handle redirection actions
                        if ($data['sendTo'] === 'redirect' && isset($data['payload']['url'])) {
                            $this->response->redirect($data['payload']['url']);
                            return $this->response;
                        }
                        $this->response->addHistory('[Frontend\\App::moduleActions] Action target: ' . $data['sendTo']);

                        // Instantiate Modificator WITH a new StepResponse (not the shared one)
                        $modificator = new DataProcessor($data, $this->storage, new StepResponse());
                        $actionFilePath = $this->getSlug() . "/actions/" . $data['sendTo'];
                        // Call a dedicated method instead of using __call for actions
                        $modResult = $modificator->processActionFile($actionFilePath);
                        $this->response->merge($modResult->response()); // Merge StepResponse from Modificator (now safe, as objects are different)

                        if ($this->response->isHalted()) {
                            return $this->response;
                        }
                        // Check for redirect after action
                        if ($this->response->getStatus() === StepStatusEnum::REDIRECT) {
                            return $this->response;
                        }
                    }
                }
            }
        } else {
            $this->response->addHistory('NOT processing POST actions');
        }

        // If processing POST, often we don't need processProgram (which usually fetches GET data)
        // If processProgram is needed for POST, uncomment the next line.
        // $this->processProgram($this->response);

        return $this->response;
    }

    public function getSlug(): string
    {
        return $this->moduleSlug;
    }

    public function processProgram($response): StepResponse
    {
        $response->addHistory('Base Frontend\App::processProgram called - No program implemented');
        return $response;
    }

    public function run(string $pageIdentifier): StepResponse
    {
        $this->response->setDataHub($this->storage); // Ensure DataHub is set on the internal response

        // Conditional history for run
        if (!($this->moduleSlug === 'test-error' || Str::startsWith($this->moduleSlug, 'errors/'))) {
            $this->response->addHistory('Base Frontend\App::run called for page: ' . $pageIdentifier);
        }

        // <<< ADDED DEBUG LOGGING FOR CLASS CHECK >>>
        Log::debug("[App::run] Checking method_exists for moduleRun", [
            'instance_class' => get_class($this)
        ]);
        // <<< END DEBUG LOGGING >>>

        if (method_exists($this, 'moduleRun')) {
            // Call moduleRun and assign its result back to the instance property
            $returnedResponse = $this->moduleRun($this->response, $pageIdentifier);

            // <<< ADDED DEBUG LOGGING FOR STATUS FROM moduleRun >>>
            if ($returnedResponse instanceof StepResponse) {
                Log::debug('[App::run] Status from moduleRun direct return', [
                    'returned_status_obj_hash' => spl_object_hash($returnedResponse),
                    'status_val' => $returnedResponse->getStatus()->value,
                    'status_name' => $returnedResponse->getStatus()->name
                ]);
            } else {
                Log::warning('[App::run] moduleRun in ' . get_class($this) . ' did not return a StepResponse. Using internal response status.', [
                    'internal_response_hash' => spl_object_hash($this->response),
                    'internal_status_val' => $this->response->getStatus()->value,
                    'internal_status_name' => $this->response->getStatus()->name
                ]);
            }
            // <<< END DEBUG LOGGING >>>

            // Check if moduleRun actually returned a StepResponse, otherwise keep the original $this->response
            if ($returnedResponse instanceof StepResponse) {
                $this->response = $returnedResponse;
            } else {
                // Log a warning if moduleRun didn't return a StepResponse as expected by its type hint
                Log::warning('moduleRun in ' . get_class($this) . ' did not return a StepResponse object.');
            }
        } else {
            // Fallback if moduleRun doesn't exist in the subclass
            $this->response->addData('message', 'Module run method not implemented.');
            $this->response->halt();
        }

        // <<< ADD DIAGNOSTIC LOGGING HERE >>>
        Log::debug("[App::run] Data in \$this->response JUST BEFORE RETURN FROM App::run", [
            'data' => $this->response->getData(),
            'status' => $this->response->getStatus()->name ?? 'null',
            'is_halted' => $this->response->isHalted(),
            'history_count' => count($this->response->getHistory()),
            'module_class' => get_class($this)
        ]);
        // <<< END DIAGNOSTIC LOGGING >>>

        return $this->response;
    }

    /**
     * This method MUST be implemented by subclasses (like PageModule, LayoutModule)
     * to define the core logic for fetching and processing module/page data.
     * It receives the current StepResponse object and should modify it.
     *
     * @param StepResponse $response The response object to add data and history to.
     * @param string $pagePath The specific page path being requested.
     * @return StepResponse|void It can optionally return the modified StepResponse.
     */
    public function moduleRun(StepResponse $response, string $pagePath): StepResponse
    {
        $response->addHistory('Frontend\App::moduleRun called, but not overridden in ' . get_class($this) . '. No page-specific data loaded.', 'warning');
        return $response;
    }

    public function getResponse(): StepResponse
    {
        return $this->response;
    }

    public function getStorage(): DataHub
    {
        return $this->storage;
    }

    // Optional hooks remain the same
}
