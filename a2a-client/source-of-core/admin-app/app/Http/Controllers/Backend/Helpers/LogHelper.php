<?php

namespace App\Http\Controllers\Backend\Helpers;

use App\Hooks\FileFacade;
use Illuminate\Support\Facades\Log;

class LogHelper
{
    /**
     * Save the installation log
     */
    public function saveLog($log, $type, $action = "Установка")
    {
        $logPath = storage_path('logs/' . $type . '.log');
        $logContent = "[" . date('Y-m-d H:i:s') . "] {$action}:\n";
        $logContent .= implode("\n", $log);
        $logContent .= "\n\n";

        // Append to the log file
        FileFacade::append($logPath, $logContent);

        // Also log to the Laravel log
        Log::info('Installer: Installation completed', ['log' => $log]);
    }
}
