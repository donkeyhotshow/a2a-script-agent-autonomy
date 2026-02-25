<?php

namespace App\Http\Controllers\Frontend;

use App\AiRudeDepot\Managers\PermanentLinkManager;
use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\StringHelper;
use App\Http\Controllers\Frontend\ModuleResolverController\Helpers\PermalinkHelper;
use App\Http\Controllers\Frontend\ModuleResolverController\ModuleRunner;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

// NOTE: New controller in Frontend namespace
class ModuleResolverController extends BaseController
{
    protected PermanentLinkManager $linkManager;

    public function __construct(PermanentLinkManager $linkManager)
    {
        $this->linkManager = $linkManager;
    }

    /**
     * Обработка входящего запроса (GET/POST)
     */
    public function handle(Request $request)
    {
        $originalPath = $request->path();
        // Normalize '/', null, or empty path to 'index' for permalink lookup
        $lookupPath = PathHelper::normalize($originalPath);

        LogHelper::debug('Frontend\\Resolver::handle', 'Handling path', [
            'originalPath' => $originalPath,
            'normalizedPath' => $lookupPath
        ]);

        // Always try to get the permalink first for the potentially normalized path
        $permalinkEntry = $this->linkManager->getPermalink($lookupPath);

        if (!PermalinkHelper::isValidPermalink($permalinkEntry, $lookupPath)) {
            LogHelper::warning('Frontend\\Resolver::handle', 'Permalink not found or invalid', [
                'path' => $lookupPath
            ]);
            // Pass the original path to runAndRender for 404 page context if needed
            return ModuleRunner::runAndRender($request, 'errors', '404', $originalPath);
        }

        $moduleSlugFromPermalink = ArrayHelper::get($permalinkEntry, 'module');
        // $lookupPath is already the correct page identifier for the module in most cases
        // If a permalink has a specific 'page' different from its path, that needs to be handled carefully.
        // For now, assume $lookupPath (e.g. 'index', 'test-page') is the $pageIdentifier for Main::runAppEnv.

        LogHelper::debug('Frontend\\Resolver::handle', 'Permalink found, running module', [
            'moduleSlug' => $moduleSlugFromPermalink,
            'lookupPathAsPageIdentifier' => $lookupPath,
            'originalPath' => $originalPath
        ]);

        return ModuleRunner::runAndRender($request, $moduleSlugFromPermalink, $lookupPath, $originalPath, $permalinkEntry);
    }

    // Удалены старые методы processPermalinkFromPath и handleModuleAction, так как логика объединена в handle()
    // Удалены хелперы checkModuleAndPageExists и loadModuleMeta, так как проверка идет через getPermalink
}
