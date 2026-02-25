<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;

class LogHelper
{
    /**
     * Log a debug message.
     *
     * @param string $context
     * @param string $message
     * @param array $data
     */
    public static function debug(string $context, string $message, array $data = []): void
    {
        Log::debug("{$context} - {$message}", $data);
    }

    /**
     * Log an info message.
     *
     * @param string $context
     * @param string $message
     * @param array $data
     */
    public static function info(string $context, string $message, array $data = []): void
    {
        Log::info("{$context} - {$message}", $data);
    }

    /**
     * Log a warning message.
     *
     * @param string $context
     * @param string $message
     * @param array $data
     */
    public static function warning(string $context, string $message, array $data = []): void
    {
        Log::warning("{$context} - {$message}", $data);
    }

    /**
     * Log an error message.
     *
     * @param string $context
     * @param string $message
     * @param array $data
     */
    public static function error(string $context, string $message, array $data = []): void
    {
        Log::error("{$context} - {$message}", $data);
    }

    /**
     * Log a critical message.
     *
     * @param string $context
     * @param string $message
     * @param array $data
     */
    public static function critical(string $context, string $message, array $data = []): void
    {
        Log::critical("{$context} - {$message}", $data);
    }
} 