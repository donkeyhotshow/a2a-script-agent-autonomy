<?php

namespace App\Http\Controllers\Common;

use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\ResponseHelper;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Validator;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Validate the given request with the given rules.
     *
     * @param Request $request
     * @param array $rules
     * @param array $messages
     * @param array $customAttributes
     * @return array
     */
    protected function validateRequest(Request $request, array $rules, array $messages = [], array $customAttributes = []): array
    {
        $validator = Validator::make($request->all(), $rules, $messages, $customAttributes);

        if ($validator->fails()) {
            LogHelper::warning('Controller::validateRequest', 'Validation failed', [
                'errors' => $validator->errors()->toArray()
            ]);
            throw new \Illuminate\Validation\ValidationException($validator);
        }

        return $validator->validated();
    }

    /**
     * Return a success response.
     *
     * @param mixed $data
     * @param string $message
     * @param int $status
     * @return JsonResponse
     */
    protected function success($data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return ResponseHelper::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    /**
     * Return an error response.
     *
     * @param string $message
     * @param mixed $errors
     * @param int $status
     * @return JsonResponse
     */
    protected function error(string $message = 'Error', $errors = null, int $status = 400): JsonResponse
    {
        return ResponseHelper::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $status);
    }

    /**
     * Get a value from the request.
     *
     * @param Request $request
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    protected function getRequestValue(Request $request, string $key, $default = null)
    {
        return ArrayHelper::get($request->all(), $key, $default);
    }

    /**
     * Get multiple values from the request.
     *
     * @param Request $request
     * @param array $keys
     * @return array
     */
    protected function getRequestValues(Request $request, array $keys): array
    {
        $values = [];
        foreach ($keys as $key) {
            $values[$key] = $this->getRequestValue($request, $key);
        }
        return $values;
    }
}










