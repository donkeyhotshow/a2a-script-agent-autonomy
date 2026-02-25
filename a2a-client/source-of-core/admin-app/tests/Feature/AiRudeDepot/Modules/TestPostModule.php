<?php

namespace Tests\Feature\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App as BaseApp;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TestPostModule extends BaseApp
{
    // Handle GET request (show form/page)
    public function moduleRun(StepResponse $response, string $pageIdentifier): StepResponse
    {
        $response->setDataHub($this->storage);
        $response->addData('title', 'Test POST Page');
        $response->addData('content', 'Page content for POST testing.');
        // Include potential error state from DataHub if re-rendering
        $bufferData = $this->storage->address('buffer')->get([]);
        $response->addData('actionError', $bufferData['error'] ?? false);
        $response->addHistory('TestPostModule moduleRun executed.');
        return $response;
    }

    // Handle POST actions
    public function moduleActions(Request $request): StepResponse // Removed StepResponse typehint from param for now
    {
        $action = $request->input('action', 'default_action');
        // Use $this->response which should be initialized by the BaseApp constructor
        // And ensure DataHub is set on it if not already
        if (!$this->response->getDataHub()) {
            $this->response->setDataHub($this->storage);
        }

        $this->response->addHistory('TestPostModule moduleActions executing action: ' . $action);

        switch ($action) {
            case 'validation_fail':
                $this->storage->address('buffer:error')->set(true);
                Log::debug('[TestPostModule::moduleActions] DataHub state after setting error', [
                    'buffer_error' => $this->storage->address('buffer:error')->get(),
                    'datahub_hash' => spl_object_hash($this->storage)
                ]);
                $this->response->addData('validation_message', 'Simulated validation failed!');
                break;
            case 'throw_exception':
                throw new \Exception('Simulated exception in action!');
            case 'do_redirect':
                $this->response->halt();
                $this->response->redirect('/test/success');

                Log::debug('[TestPostModule::moduleActions] Response state for do_redirect BEFORE RETURN', [
                    'action' => $action,
                    'status' => $this->response->getStatus()->name ?? 'null',
                    'is_halted' => $this->response->isHalted(),
                    'redirect_url_from_response_object' => $this->response->getRedirectUrl(),
                    'data_output_redirect' => $this->response->getData()['output']['redirect'] ?? 'NOT SET'
                ]);
                break;
            case 'default_success':
            default:
                $this->response->addData('action_result', 'Default success action completed.');
                break;
        }

        return $this->response;
    }
}
