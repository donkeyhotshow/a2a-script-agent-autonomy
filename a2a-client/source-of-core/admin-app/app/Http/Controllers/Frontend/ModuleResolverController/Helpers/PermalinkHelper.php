<?php

namespace App\Http\Controllers\Frontend\ModuleResolverController\Helpers;

use Illuminate\Support\Facades\Log;

// NOTE: New Helper class
class PermalinkHelper
{
    /**
     * Проверяет валидность структуры пермалинка.
     *
     * @param mixed $permalink Данные пермалинка из PermanentLinkManager
     * @param string $pathForLog Путь для логов
     * @return bool
     */
    public static function isValidPermalink($permalink, string $pathForLog): bool
    {
        if (!is_array($permalink) || empty($permalink)) {
            Log::debug("[PermalinkHelper::isValidPermalink] Permalink not array or empty", ['path' => $pathForLog]);
            return false;
        }
        if (!isset($permalink['module']) || !isset($permalink['path']) || !isset($permalink['metadata'])) {
            Log::debug("[PermalinkHelper::isValidPermalink] Missing required keys (module, path, metadata)", ['path' => $pathForLog, 'keys' => array_keys($permalink)]);
            return false;
        }
        if (!is_array($permalink['metadata'])) {
            Log::debug("[PermalinkHelper::isValidPermalink] Metadata is not an array", ['path' => $pathForLog, 'type' => gettype($permalink['metadata'])]);
            return false;
        }
        return true;
    }
}
