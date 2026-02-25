<?php

namespace App\Http\Controllers\Common;

use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\ResponseHelper;
use App\Helpers\UserHelper;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Auth;

abstract class AdminController extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Get the authenticated user.
     *
     * @return \App\Models\User|null
     */
    protected function getAuthUser()
    {
        return Auth::user();
    }

    /**
     * Check if the authenticated user is an administrator.
     *
     * @return bool
     */
    protected function isAdministrator(): bool
    {
        $user = $this->getAuthUser();
        return $user && UserHelper::isAdministrator($user);
    }

    /**
     * Check if the authenticated user is an owner.
     *
     * @return bool
     */
    protected function isOwner(): bool
    {
        $user = $this->getAuthUser();
        return $user && UserHelper::isOwner($user);
    }

    /**
     * Authorize an action for the authenticated user.
     *
     * @param string $ability
     * @param mixed $arguments
     * @return void
     */
    protected function authorizeAction(string $ability, $arguments = null): void
    {
        $user = $this->getAuthUser();
        if (!$user) {
            LogHelper::warning('AdminController::authorizeAction', 'Unauthorized access attempt', [
                'ability' => $ability,
                'arguments' => $arguments
            ]);
            abort(401, 'Unauthorized');
        }

        $this->authorize($ability, $arguments);
    }

    /**
     * Return a success response with admin-specific data.
     *
     * @param mixed $data
     * @param string $message
     * @param int $status
     * @return JsonResponse
     */
    protected function adminSuccess($data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'user' => [
                'id' => $this->getAuthUser()?->id,
                'is_administrator' => $this->isAdministrator(),
                'is_owner' => $this->isOwner()
            ]
        ];

        return ResponseHelper::json($response, $status);
    }

    /**
     * Return an error response with admin-specific data.
     *
     * @param string $message
     * @param mixed $errors
     * @param int $status
     * @return JsonResponse
     */
    protected function adminError(string $message = 'Error', $errors = null, int $status = 400): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'user' => [
                'id' => $this->getAuthUser()?->id,
                'is_administrator' => $this->isAdministrator(),
                'is_owner' => $this->isOwner()
            ]
        ];

        return ResponseHelper::json($response, $status);
    }

    /**
     * Get admin-specific request data.
     *
     * @param Request $request
     * @param array $keys
     * @return array
     */
    protected function getAdminRequestData(Request $request, array $keys): array
    {
        $data = $this->getRequestValues($request, $keys);
        $data['updated_by'] = $this->getAuthUser()?->id;
        return $data;
    }
}
