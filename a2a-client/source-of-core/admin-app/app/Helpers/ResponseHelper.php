<?php

namespace App\Helpers;

class ResponseHelper
{
    /**
     * Format a success response.
     *
     * @param mixed $data
     * @param string $message
     * @param array $meta
     * @param array $headers
     * @return array
     */
    public static function success($data, string $message = 'Operation successful', array $meta = [], array $headers = []): array
    {
        return [
            'status' => 'success',
            'message' => $message,
            'data' => $data,
            'meta' => $meta,
            'headers' => $headers,
        ];
    }

    /**
     * Format an error response.
     *
     * @param string $message
     * @param int $code
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function error(string $message, int $code = 400, array $errors = [], array $headers = []): array
    {
        return [
            'status' => 'error',
            'message' => $message,
            'code' => $code,
            'errors' => $errors,
            'headers' => $headers,
        ];
    }

    /**
     * Format a not found response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function notFound(string $message = 'Resource not found', array $errors = [], array $headers = []): array
    {
        return self::error($message, 404, $errors, $headers);
    }

    /**
     * Format an unauthorized response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function unauthorized(string $message = 'Unauthorized', array $errors = [], array $headers = []): array
    {
        return self::error($message, 401, $errors, $headers);
    }

    /**
     * Format a forbidden response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function forbidden(string $message = 'Forbidden', array $errors = [], array $headers = []): array
    {
        return self::error($message, 403, $errors, $headers);
    }

    /**
     * Format a validation error response.
     *
     * @param array $errors
     * @param string $message
     * @param array $headers
     * @return array
     */
    public static function validationError(array $errors, string $message = 'Validation failed', array $headers = []): array
    {
        return self::error($message, 422, $errors, $headers);
    }

    /**
     * Format a server error response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function serverError(string $message = 'Internal server error', array $errors = [], array $headers = []): array
    {
        return self::error($message, 500, $errors, $headers);
    }

    /**
     * Format a JSON response.
     *
     * @param mixed $data
     * @param int $status
     * @param array $headers
     * @return array
     */
    public static function json($data, int $status = 200, array $headers = []): array
    {
        return [
            'status' => $status,
            'data' => $data,
            'headers' => array_merge(['Content-Type' => 'application/json'], $headers),
        ];
    }

    /**
     * Format a download response.
     *
     * @param string $path
     * @param string $name
     * @param array $headers
     * @return array
     */
    public static function download(string $path, string $name = null, array $headers = []): array
    {
        return [
            'status' => 200,
            'path' => $path,
            'name' => $name,
            'headers' => array_merge([
                'Content-Type' => 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="' . ($name ?: basename($path)) . '"',
            ], $headers),
        ];
    }

    /**
     * Format a file response.
     *
     * @param string $path
     * @param string $name
     * @param array $headers
     * @return array
     */
    public static function file(string $path, string $name = null, array $headers = []): array
    {
        return [
            'status' => 200,
            'path' => $path,
            'name' => $name,
            'headers' => array_merge([
                'Content-Type' => mime_content_type($path),
                'Content-Disposition' => 'inline; filename="' . ($name ?: basename($path)) . '"',
            ], $headers),
        ];
    }

    /**
     * Format a view response.
     *
     * @param string $view
     * @param array $data
     * @param int $status
     * @param array $headers
     * @return array
     */
    public static function view(string $view, array $data = [], int $status = 200, array $headers = []): array
    {
        return [
            'status' => $status,
            'view' => $view,
            'data' => $data,
            'headers' => $headers,
        ];
    }

    /**
     * Format a stream response.
     *
     * @param resource $stream
     * @param int $status
     * @param array $headers
     * @return array
     */
    public static function stream($stream, int $status = 200, array $headers = []): array
    {
        return [
            'status' => $status,
            'stream' => $stream,
            'headers' => $headers,
        ];
    }

    /**
     * Format a no content response.
     *
     * @param array $headers
     * @return array
     */
    public static function noContent(array $headers = []): array
    {
        return [
            'status' => 204,
            'headers' => $headers,
        ];
    }

    /**
     * Format a created response.
     *
     * @param mixed $data
     * @param string $message
     * @param array $meta
     * @param array $headers
     * @return array
     */
    public static function created($data, string $message = 'Resource created successfully', array $meta = [], array $headers = []): array
    {
        return self::success($data, $message, $meta, array_merge(['Location' => $meta['location'] ?? ''], $headers));
    }

    /**
     * Format an accepted response.
     *
     * @param mixed $data
     * @param string $message
     * @param array $meta
     * @param array $headers
     * @return array
     */
    public static function accepted($data, string $message = 'Request accepted', array $meta = [], array $headers = []): array
    {
        return self::success($data, $message, $meta, $headers);
    }

    /**
     * Format a bad request response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function badRequest(string $message = 'Bad request', array $errors = [], array $headers = []): array
    {
        return self::error($message, 400, $errors, $headers);
    }

    /**
     * Format a too many requests response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function tooManyRequests(string $message = 'Too many requests', array $errors = [], array $headers = []): array
    {
        return self::error($message, 429, $errors, $headers);
    }

    /**
     * Format a service unavailable response.
     *
     * @param string $message
     * @param array $errors
     * @param array $headers
     * @return array
     */
    public static function serviceUnavailable(string $message = 'Service unavailable', array $errors = [], array $headers = []): array
    {
        return self::error($message, 503, $errors, $headers);
    }

    /**
     * Format a paginated response.
     *
     * @param mixed $data
     * @param int $total
     * @param int $perPage
     * @param int $currentPage
     * @param string $message
     * @param array $headers
     * @return array
     */
    public static function paginated($data, int $total, int $perPage, int $currentPage, string $message = 'Operation successful', array $headers = []): array
    {
        $lastPage = ceil($total / $perPage);
        $meta = [
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'from' => ($currentPage - 1) * $perPage + 1,
                'to' => min($currentPage * $perPage, $total),
            ],
        ];
        return self::success($data, $message, $meta, $headers);
    }

    /**
     * Validate response data.
     *
     * @param mixed $data
     * @return bool
     */
    public static function validateData($data): bool
    {
        return is_array($data);
    }

    /**
     * Merge multiple responses.
     *
     * @param array $responses
     * @return array
     */
    public static function mergeResponses(array ...$responses): array
    {
        $result = [];
        foreach ($responses as $response) {
            $result = array_merge_recursive($result, $response);
        }
        return $result;
    }

    /**
     * Format a redirect response.
     *
     * @param string $url
     * @param int $status
     * @param array $headers
     * @return array
     */
    public static function formatRedirect(string $url, int $status = 302, array $headers = []): array
    {
        return [
            'status' => $status,
            'url' => $url,
            'headers' => array_merge(['Location' => $url], $headers),
        ];
    }

    /**
     * Validate special data.
     *
     * @param mixed $data
     * @return bool
     */
    public static function validateSpecialData($data): bool
    {
        return true;
    }

    /**
     * Format special data.
     *
     * @param array $specialData
     * @return array
     */
    public static function formatSpecialData(array $specialData): array
    {
        return $specialData;
    }
}
