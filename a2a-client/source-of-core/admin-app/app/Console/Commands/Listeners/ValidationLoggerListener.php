<?php

namespace App\Console\Commands\Listeners;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Console\Commands\ErrorDetectedEvent;
use App\Hooks\FileFacade as FacadesFile;

/**
 * Listener to log validation errors to a dedicated file
 */
class ValidationLoggerListener
{
    /**
     * @var string The log channel to use
     */
    protected string $logChannel;
    
    /**
     * @var string The log file path
     */
    protected string $logFilePath;
    
    /**
     * Initialize the listener
     */
    public function __construct()
    {
        $this->logChannel = Config::get('logging.default');
        $this->logFilePath = storage_path('logs/validation_errors.log');
    }
    
    /**
     * Handle the error detected event.
     *
     * @param \App\Console\Commands\ErrorDetectedEvent $event
     * @return void
     */
    public function handle(ErrorDetectedEvent $event): void
    {
        try {
            $errorType = $event->errorSlug;
            $filePath = $event->filePath;
            $jsonPath = $event->jsonPath;
            $componentType = $event->componentType ?? 'unknown';
            $message = $event->message ?? 'No message';
            
            // Format the log entry
            $logEntry = [
                'timestamp' => date('Y-m-d H:i:s'),
                'error_type' => $errorType,
                'file' => $filePath,
                'path' => $jsonPath,
                'component' => $componentType,
                'message' => $message,
                'context' => $event->context
            ];
            
            // Log to the configured channel
            Log::channel($this->logChannel)->debug(
                "[ValidationError] {$errorType} in {$filePath} at {$jsonPath}: {$message}"
            );
            
            // Also append to a dedicated log file
            $this->appendToLogFile($logEntry);
            
        } catch (\Throwable $e) {
            // If logging itself fails, log that error to the default channel
            Log::channel($this->logChannel)->error(
                "[ValidationLoggerListener] Failed to log validation error: " . $e->getMessage()
            );
        }
    }
    
    /**
     * Append an entry to the log file
     *
     * @param array $logEntry
     * @return void
     */
    private function appendToLogFile(array $logEntry): void
    {
        $formattedEntry = json_encode($logEntry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
        
        // Create the log file directory if it doesn't exist
        $logDir = dirname($this->logFilePath);
        if (!FacadesFile::isDirectory($logDir)) {
            FacadesFile::makeDirectory($logDir, 0755, true);
        }
        
        // Append to the log file
        FacadesFile::append($this->logFilePath, $formattedEntry);
    }
} 