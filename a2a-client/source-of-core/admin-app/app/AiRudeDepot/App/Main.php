<?php

namespace App\AiRudeDepot\App;

use App\AiRudeDepot\App\Helpers\ModuleClassResolver;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;
use App\AiRudeDepot\Managers\PermanentLinkManager;
use App\AiRudeDepot\Storage\DataHub;
use Exception;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class Main
{
    private const MAX_RECURSION_DEPTH = 10;
    private const MAX_PERMALINK_RESOLUTION_DEPTH = 15;

    public static function runAppEnv(
        string                $initialModuleSlugOrPath,
        Request               $request,
        Application           $app,
        ?string               $initialPagePath = '',
        int                   $recursionDepth = 0,
        ?DataHub              $existingDataHub = null,
        ?PermanentLinkManager $linkManager = null,
        ?array                $permalinkDataFromRunner = null
    ): StepResponse
    {
        if ($recursionDepth >= self::MAX_RECURSION_DEPTH) {
            $errorResponse = new StepResponse();
            $errorResponse->addData('message', 'Error: Maximum request processing depth reached. Configured limit: ' . self::MAX_RECURSION_DEPTH);
            $errorResponse->addHistory('Maximum recursion depth reached.', 'critical');
            $errorResponse->setStatus(StepStatusEnum::ERROR_CRITICAL);
            $errorResponse->halt();
            return $errorResponse;
        }

        $response = new StepResponse();
        if ($existingDataHub instanceof DataHub) {
            $response->setDataHub($existingDataHub);
        }

        $appInstance = null;
        $linkManager = $linkManager ?? $app->make(PermanentLinkManager::class);

        $moduleSlugPart = trim($initialModuleSlugOrPath, '/');
        $pagePathPart = trim($initialPagePath, '/');

        if (!empty($pagePathPart)) {
            $effectiveOriginalRequestPath = !empty($moduleSlugPart) ? $moduleSlugPart . '/' . $pagePathPart : $pagePathPart;
        } else {
            $effectiveOriginalRequestPath = $moduleSlugPart;
        }
        if (empty($effectiveOriginalRequestPath) && ($request->path() === '/' || $request->path() === '' || $initialPagePath === 'index')) {
            $effectiveOriginalRequestPath = 'index';
        }
        if (empty($effectiveOriginalRequestPath) && !empty($initialPagePath) && $initialPagePath !== 'index') {
            $effectiveOriginalRequestPath = trim($initialPagePath, '/');
        }
        if (empty($effectiveOriginalRequestPath)) {
            $effectiveOriginalRequestPath = 'index';
        }

        $finalPermalink = $permalinkDataFromRunner;
        $moduleSlug = null;
        $simplePageIdentifier = null;
        $pagePathForAccessCheck = $effectiveOriginalRequestPath;
        $resolvedPermalink = null;

        if ($finalPermalink) {
            $moduleSlug = $finalPermalink['module'];
            $pagePathForAccessCheck = $finalPermalink['path'] ?? $effectiveOriginalRequestPath;
            $simplePageIdentifier = $finalPermalink['page'] ?? basename(trim($pagePathForAccessCheck, '/'));
            if (empty($simplePageIdentifier) && ($pagePathForAccessCheck === 'index' || $pagePathForAccessCheck === '/')) {
                $simplePageIdentifier = 'index';
            }
            $resolvedPermalink = $finalPermalink;
        } else {
            $currentSlug = $effectiveOriginalRequestPath;
            $resolutionLoopDepth = 0;

            while ($resolutionLoopDepth < self::MAX_RECURSION_DEPTH) {
                $currentPermalink = $linkManager->getPermalink($currentSlug);

                if (!$currentPermalink) {
                    break;
                }
                $resolvedPermalink = $currentPermalink;

                if (isset($currentPermalink['link']) && !empty($currentPermalink['link'])) {
                    $previousSlug = $currentSlug;
                    $currentSlug = Str::startsWith($currentPermalink['link'], '/') ? ltrim($currentPermalink['link'], '/') : $currentPermalink['link'];
                    if ($currentSlug === $previousSlug) {
                        return self::runAppEnv('errors/508', $request, $app, '', 0, null, $linkManager, null);
                    }
                    $resolutionLoopDepth++;
                } else {
                    break;
                }
            }

            if ($resolutionLoopDepth >= self::MAX_RECURSION_DEPTH) {
                return self::runAppEnv('errors/508', $request, $app, '', 0, null, $linkManager, null);
            }

            if (!$resolvedPermalink) {
                return self::runAppEnv('errors/404', $request, $app, '', 0, null, $linkManager, null);
            }

            $requiredAccess = $resolvedPermalink['metadata']['required_access'] ?? 'public';
            $pagePathForAccessCheck = $resolvedPermalink['path'];
            $moduleSlug = $resolvedPermalink['module'];

            $simplePageIdentifier = $resolvedPermalink['page'] ?? basename(trim($resolvedPermalink['path'], '/'));
            if (empty($simplePageIdentifier) && ($resolvedPermalink['path'] === 'index' || $resolvedPermalink['path'] === '/')) {
                $simplePageIdentifier = 'index';
            }

            if ($requiredAccess === 'admin' && !Auth::check()) {
                return self::runAppEnv('errors', $request, $app, '403', $recursionDepth + 1, $existingDataHub, $linkManager, null);
            }
        }

        try {
            $appInstance = null;
            $runResponse = null;
            $storageLoadAttempted = false;

            $resolvedTarget = ModuleClassResolver::resolve($moduleSlug);

            if (is_object($resolvedTarget)) {
                if ($resolvedTarget instanceof App) {
                    $appInstance = $resolvedTarget;
                    if ($existingDataHub && $appInstance->getStorage() !== $existingDataHub) {
                        // Minimal log for a potentially significant state mismatch
                        Log::warning("[runAppEnv] Pre-built instance resolver DataHub mismatch.");
                    }
                } else {
                    Log::critical("[runAppEnv] ModuleClassResolver returned non-App object for '{$moduleSlug}'.");
                    // Fall through to allow error handling to take over
                }
            } elseif (is_string($resolvedTarget) && $resolvedTarget !== App::class && class_exists($resolvedTarget)) {
                $appInstance = self::constructApp($resolvedTarget, $moduleSlug, $request, $app, $existingDataHub);
            } else {
                $storageLoadAttempted = true;
                $potentialClassName = Str::studly($moduleSlug);
                $storageFileName = $potentialClassName . '.php';
                $fullStoragePath = storage_path('ai/' . $moduleSlug . '/code/' . $storageFileName);

                if (File::exists($fullStoragePath)) {
                    require_once $fullStoragePath;
                    $fullStorageClassName = 'App\\AiRudeDepot\\Modules\\' . $potentialClassName;
                    if (class_exists($fullStorageClassName)) {
                        $appInstance = self::constructApp($fullStorageClassName, $moduleSlug, $request, $app, $existingDataHub);
                    } else {
                        Log::critical("[runAppEnv] Required storage file '{$storageFileName}' but class '{$fullStorageClassName}' not found.");
                    }
                } else {
                    // This is a common case, not necessarily an error if MCR was supposed to handle it.
                }
            }

            $actionResponse = null;
            if ($appInstance instanceof App) {
                if ($resolvedPermalink) {
                    $appInstance->getStorage()->address('buffer:app.permalink_data')->set($resolvedPermalink);
                }

                if ($request->isMethod('post')) {
                    try {
                        $actionResponse = $appInstance->moduleActions($request);
                        if ($actionResponse->isHalted() || $actionResponse->getStatus() === StepStatusEnum::REDIRECT) {
                            return $actionResponse;
                        }
                        $existingDataHub = $actionResponse->getDataHub() ?? $existingDataHub;
                    } catch (Throwable $actionError) {
                        Log::critical("[runAppEnv] Error during moduleActions for '{$moduleSlug}'.", [
                            'error_message' => $actionError->getMessage(),
                            'trace_snippet' => Str::limit($actionError->getTraceAsString(), 250)
                        ]);
                        throw $actionError;
                    }
                }

                try {
                    $runResponse = $appInstance->run($simplePageIdentifier);
                } catch (Throwable $runError) {
                    Log::critical("[runAppEnv] Error during module run for '{$moduleSlug}'.", [
                        'error_message' => $runError->getMessage(),
                        'trace_snippet' => Str::limit($runError->getTraceAsString(), 250)
                    ]);
                    throw $runError;
                }
            } else {
                Log::critical("[runAppEnv] Failed to construct App instance for '{$moduleSlug}'.", [
                    'resolvedTarget' => is_object($resolvedTarget) ? get_class($resolvedTarget) : $resolvedTarget,
                    'storageLoadAttempted' => $storageLoadAttempted
                ]);
                $runResponse = new StepResponse();
                $runResponse->setStatus(StepStatusEnum::ERROR);
                $runResponse->addHistory("Failed to load module: {$moduleSlug}", 'critical');
                $runResponse->halt();
            }

            $finalAssembledResponse = new StepResponse();

            if ($request->isMethod('post')) {
                if ($runResponse) {
                    $finalAssembledResponse->merge($runResponse);
                }
                if ($actionResponse && $actionResponse !== $runResponse) {
                    $finalAssembledResponse->merge($actionResponse);
                }
                $dataHubToUse = $actionResponse?->getDataHub() ?? $runResponse?->getDataHub() ?? $existingDataHub ?? $app->make(DataHub::class);
                if ($dataHubToUse) {
                    $finalAssembledResponse->setDataHub($dataHubToUse);
                }
            } else {
                if ($runResponse) {
                    $finalAssembledResponse->merge($runResponse);
                    $dataHubToUse = $runResponse->getDataHub() ?? $existingDataHub ?? $app->make(DataHub::class);
                    if ($dataHubToUse) {
                        $finalAssembledResponse->setDataHub($dataHubToUse);
                    }
                } else {
                    $finalAssembledResponse->halt();
                }
            }

            if (!$finalAssembledResponse->isHalted()) {
                $outputData = $finalAssembledResponse->getData()['output'] ?? null;
                if (isset($outputData['redirect']) && is_string($outputData['redirect'])) {
                    $finalAssembledResponse->setStatus(StepStatusEnum::REDIRECT);
                    $finalAssembledResponse->addData('redirect', $outputData['redirect']);
                } elseif ($finalAssembledResponse->getStatus() === null) {
                    $finalAssembledResponse->setStatus(StepStatusEnum::OK);
                }
            }
            return $finalAssembledResponse;
        } catch (Throwable $e) {
            Log::critical("[runAppEnv] Unhandled exception in '{$effectiveOriginalRequestPath}'.", [
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace_snippet' => Str::limit($e->getTraceAsString(), 500)
            ]);

            if ($recursionDepth + 1 < self::MAX_RECURSION_DEPTH) {
                $errorCodeToUse = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
                if ($errorCodeToUse < 400) $errorCodeToUse = 500;

                $errorDataHub = $existingDataHub ?? $app->make(DataHub::class);
                $errorDataHub->address('buffer:error_context')->set([
                    'exception_class' => get_class($e),
                    'message' => $e->getMessage(),
                ]);

                $errorPageResponse = self::runAppEnv(
                    'errors',
                    $request,
                    $app,
                    (string)$errorCodeToUse,
                    $recursionDepth + 1,
                    $errorDataHub,
                    $linkManager,
                    null
                );

                $errorPageResponse->addHistory(
                    "Original exception caught in initial call: " . get_class($e) . " - " . $e->getMessage(),
                    'critical',
                    []
                );
                return $errorPageResponse;
            } else {
                Log::critical("[runAppEnv] Max recursion depth reached while handling exception for '{$effectiveOriginalRequestPath}'.");
                $response = new StepResponse();
                $response->addData('message', 'Critical error: Maximum recursion depth reached during error handling.');
                $response->addHistory('Max recursion depth reached during exception handling', 'critical');
                $response->halt();
                return $response;
            }
        }
    }

    public static function constructApp(
        string      $targetClassName,
        string      $moduleSlug,
        Request     $request,
        Application $app,
        ?DataHub    $existingDataHub = null
    ): App
    {
        $dataHubToUse = $existingDataHub;
        if (!$dataHubToUse) {
            $dataHubToUse = $app->make(DataHub::class);
            if (!$dataHubToUse) {
                throw new Exception("Failed to resolve DataHub from container for module '{$moduleSlug}'.");
            }
        }

        try {
            $instance = $app->make($targetClassName, [
                'moduleSlug' => $moduleSlug,
                'DataHub' => $dataHubToUse,
            ]);
        } catch (Throwable $e) {
            Log::critical("[Main::constructApp] Exception during app->make for {$targetClassName}", [
                'moduleSlug' => $moduleSlug,
                'error_message' => $e->getMessage(),
                'trace_snippet' => Str::limit($e->getTraceAsString(), 250)
            ]);
            throw new Exception("Failed to construct App instance '{$targetClassName}' for module '{$moduleSlug}'. Original error: " . $e->getMessage(), 0, $e);
        }
        return $instance;
    }

    private static function resolveFinalRedirectTarget(
        string               $slug,
        Request              $request,
        Application          $app,
        PermanentLinkManager $linkManager,
        array                $visited = [],
        int                  $depth = 0
    ): array
    {
        $normalizedSlug = trim($slug, '/');

        if ($depth >= self::MAX_PERMALINK_RESOLUTION_DEPTH) {
            return ['error' => true, 'error_slug' => 'errors/500', 'slug' => 'errors/500', 'permalink' => null, 'halt' => true, 'message' => 'Maximum request processing depth reached'];
        }

        if (in_array($normalizedSlug, $visited)) {
            return ['error' => true, 'error_slug' => 'errors/500', 'slug' => 'errors/500', 'permalink' => null, 'halt' => true, 'message' => 'Request processing loop detected'];
        }
        $visited[] = $normalizedSlug;

        try {
            $permalink = $linkManager->getPermalink($normalizedSlug);

            if (!$permalink) {
                if ($normalizedSlug === 'errors/404') {
                    Log::critical("[resolveFinalRedirectTarget] Critical: errors/404 permalink itself not found!");
                    return ['error' => true, 'error_slug' => 'errors/500', 'slug' => 'errors/500', 'permalink' => null, 'halt' => true, 'message' => 'Critical: Could not find 404 error page definition.'];
                }
                return self::resolveFinalRedirectTarget('errors/404', $request, $app, $linkManager, $visited, $depth + 1);
            }

            if (!empty($permalink['link'])) {
                $linkedSlug = trim($permalink['link'], '/');
                return self::resolveFinalRedirectTarget($linkedSlug, $request, $app, $linkManager, $visited, $depth + 1);
            }
            return ['error' => false, 'slug' => $normalizedSlug, 'permalink' => $permalink, 'halt' => false, 'message' => null];

        } catch (Throwable $e) {
            Log::critical("[resolveFinalRedirectTarget] Exception during resolution for '{$normalizedSlug}'.", [
                'error_message' => $e->getMessage(),
                'trace_snippet' => Str::limit($e->getTraceAsString(), 250)
            ]);
            if ($normalizedSlug === 'errors/500') {
                Log::critical("[resolveFinalRedirectTarget] Critical: Exception while resolving errors/500 itself!");
                return ['error' => true, 'error_slug' => 'errors/500', 'slug' => 'errors/500', 'permalink' => null, 'halt' => true, 'message' => 'Critical: Exception resolving 500 error page.'];
            }
            return self::resolveFinalRedirectTarget('errors/500', $request, $app, $linkManager, $visited, $depth + 1);
        }
    }
}
