<?php

namespace App\Http\Controllers\Frontend\ModuleResolverController;

use App\AiRudeDepot\App\Main;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ModuleRunner
{
    public static function runAndRender(Request $request, string $moduleSlug, string $pageIdentifier, ?string $originalRequestPath = null, ?array $permalinkEntry = null)
    {
        Log::debug("[ModuleRunner::runAndRender] Called", [
            'moduleSlug' => $moduleSlug,
            'pageIdentifier' => $pageIdentifier,
            'originalRequestPath' => $originalRequestPath,
            'permalinkEntry_exists' => !is_null($permalinkEntry)
        ]);

        $initialStepResponse = Main::runAppEnv($moduleSlug, $request, app(), $pageIdentifier, 0, null, null, $permalinkEntry);
        $finalStepResponse = $initialStepResponse;

        if ($request->isMethod('POST') && !$initialStepResponse->isHalted()) {
            $outputData = $initialStepResponse->getData('output', []);
            $redirectUrl = $outputData['redirect'] ?? $initialStepResponse->getRedirectUrl();

            if ($redirectUrl) {
                Log::debug("[ModuleRunner] POST Action resulted in redirect", ['url' => $redirectUrl]);
            } else {
                $dataHub = $initialStepResponse->getDataHub();
                if ($dataHub instanceof DataHub) {
                    $actionError = $dataHub->address('buffer:error')->get();
                    Log::debug("[ModuleRunner] POST Action, checking for re-render.", ['actionError' => $actionError]);

                    if ($actionError === true) {
                        Log::debug("[ModuleRunner] Re-rendering page due to actionError=true.");
                        $getRequest = clone $request;
                        $getRequest->setMethod('GET');
                        $finalStepResponse = Main::runAppEnv($moduleSlug, $getRequest, app(), $pageIdentifier, 0, $initialStepResponse, null, $permalinkEntry);
                    }
                } else {
                    Log::error("[ModuleRunner] Could not access DataHub from StepResponse after POST action.");
                }
            }
        }

        $pageSpecificProps = $finalStepResponse->getData();
        if (!is_array($pageSpecificProps)) {
            $pageSpecificProps = [];
        }

        $finalProps = $pageSpecificProps;
        $finalProps['history'] = $finalStepResponse->getHistory();
        $finalProps['console'] = $finalStepResponse->getConsole();
        $finalProps['step_status'] = $finalStepResponse->getStatus()->value;
        $finalProps['is_halted'] = $finalStepResponse->isHalted();

        $component = 'Dynamic/Index';

        Log::debug("[ModuleRunner::runAndRender] Rendering component with props", [
            'component' => $component,
            'prop_keys' => array_keys($finalProps),
            'status' => $finalStepResponse->getStatus()->value,
            'is_halted' => $finalStepResponse->isHalted()
        ]);

        $inertiaResponse = Inertia::render($component, $finalProps);

        $httpStatusCode = 200;
        switch ($finalStepResponse->getStatus()) {
            case StepStatusEnum::ERROR_NOT_FOUND:
                $httpStatusCode = 404;
                break;
            case StepStatusEnum::ERROR_FORBIDDEN:
                $httpStatusCode = 403;
                break;
            case StepStatusEnum::ERROR_CRITICAL:
            case StepStatusEnum::ERROR_UNHANDLED_EXCEPTION:
                $httpStatusCode = 500;
                break;
        }
        if ($finalStepResponse->getRedirectUrl() && $finalStepResponse->getStatus() === StepStatusEnum::REDIRECT) {
            $httpStatusCode = 302;
        }

        Log::debug("[ModuleRunner::runAndRender] Returning Inertia response", ['http_status' => $httpStatusCode]);

        return $inertiaResponse
            ->toResponse($request)
            ->setStatusCode($httpStatusCode);
    }
}
