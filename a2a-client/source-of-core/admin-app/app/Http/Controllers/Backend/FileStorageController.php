<?php

namespace App\Http\Controllers\Backend;

use App\AiRudeDepot\Managers\StorageNavigator;
use App\Helpers\ArrayHelper;
use App\Helpers\FileHelper;
use App\Helpers\LogHelper;
use App\Helpers\PathHelper;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Common\AdminController;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use InvalidArgumentException;

class FileStorageController extends AdminController
{
    private string $basePath;

    public function __construct()
    {
        // Абсолютный путь к хранилищу (используется в StorageNavigator)
        $this->basePath = storage_path('ai');
    }

    /**
     * Render VueFlow component.
     *
     * @param Request $request
     * @param Application $appRoot
     * @return \Inertia\Response
     */
    public function vueflow(Request $request, Application $appRoot)
    {
        return Inertia::render('VueFlow/Index');
    }

    /**
     * Get file system items.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function fileSelector(Request $request): JsonResponse
    {
        $directory = $this->getRequestValue($request, 'directory', 'directory!');
        $itemType = $this->getRequestValue($request, 'itemType', 'directory');

        try {
            // Validate directory path
            if (!PathHelper::isValid($directory)) {
                throw new InvalidArgumentException('Invalid directory path');
            }

            // Check if directory exists and is accessible
            if (!FileHelper::isAccessible($directory)) {
                throw new InvalidArgumentException('Directory is not accessible');
            }

            $navigator = new StorageNavigator($directory, $itemType);

            LogHelper::debug('FileStorageController::fileSelector', 'Successfully retrieved file system items', [
                'directory' => $directory,
                'itemType' => $itemType
            ]);

            return $this->adminSuccess([
                'items' => $navigator->itemsList(true),
                'breadcrumbs' => $navigator->parentsList(true),
                'currentItem' => $navigator->getFormattedCurrentItem(),
                'parent' => $navigator->parent() ? $navigator->parent(true) : null
            ]);

        } catch (InvalidArgumentException $e) {
            LogHelper::warning('FileStorageController::fileSelector', 'Failed to retrieve file system items', [
                'error' => $e->getMessage(),
                'directory' => $directory,
                'itemType' => $itemType
            ]);

            return $this->adminError($e->getMessage());
        }
    }
}

