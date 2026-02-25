<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

use App\Hooks\FileFacade as File;
use Illuminate\Support\Carbon;
use Illuminate\Console\OutputStyle;

class ModuleValidationLogHelper
{
    protected string $logFilePath;
    protected string $archiveFilePath;
    protected ?OutputStyle $output;

    public function __construct(?OutputStyle $output = null)
    {
        $this->logFilePath = storage_path('logs/module-validator.log');
        $this->archiveFilePath = storage_path('logs/module-validator.log.bak');
        $this->output = $output;
        $this->initialize();
    }

    /**
     * Initializes the log file: archives the old one and clears the current one.
     */
    public function initialize(): void
    {
        $dir = dirname($this->logFilePath);
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        if (File::exists($this->logFilePath)) {
            // Archive existing log file by renaming or copying then clearing
            // Using copy and then put to clear, to avoid issues with file locks if renaming fails
            File::copy($this->logFilePath, $this->archiveFilePath);
            File::put($this->logFilePath, 'Log initialized at ' . Carbon::now()->toDateTimeString() . "\n");
        } else {
            // Create an empty log file with a header
            File::put($this->logFilePath, 'Log initialized at ' . Carbon::now()->toDateTimeString() . "\n");
        }
    }

    /**
     * Logs a message to the dedicated validation log file.
     *
     * @param string $level (e.g., 'DEBUG', 'INFO', 'WARN', 'ERROR')
     * @param string $message The main log message.
     * @param array $context Optional context data to include.
     */
    public function log(string $level, string $message, array $context = []): void
    {
        $timestamp = Carbon::now()->toDateTimeString();
        // Simple context formatting for readability in a plain text file
        $contextString = '';
        if (!empty($context)) {
            // Convert arrays/objects in context to JSON strings for better readability
            $formattedContext = array_map(function($value) {
                return (is_array($value) || is_object($value)) ? json_encode($value) : $value;
            }, $context);
            $contextString = ' | Context: ' . json_encode($formattedContext); // Main context array as JSON
        }

        $logEntry = sprintf("[%s] %s: %s%s\n",
            $timestamp,
            strtoupper($level),
            $message,
            $contextString
        );

        try {
            File::append($this->logFilePath, $logEntry);
        } catch (\Exception $e) {
            if ($this->output) {
                $this->output->writeln("<error>Failed to write to log file {$this->logFilePath}: {$e->getMessage()}</error>");
            }
            // Fallback to Laravel's default logger if custom file logging fails
            \Illuminate\Support\Facades\Log::channel(config('logging.default'))->error("Failed to write to custom log [{$this->logFilePath}]: {$message}", $context);
        }
    }

    public function logDebug(string $message, array $context = []): void
    {
        $this->log('DEBUG', $message, $context);
    }

    public function logInfo(string $message, array $context = []): void
    {
        $this->log('INFO', $message, $context);
    }

    public function logWarning(string $message, array $context = []): void
    {
        $this->log('WARN', $message, $context);
    }

    public function logError(string $message, array $context = []): void
    {
        $this->log('ERROR', $message, $context);
    }

    /**
     * Get the full path to the log file
     * 
     * @return string The full path to the log file
     */
    public static function getLogFilePath(): string
    {
        return storage_path('logs/module-validator.log');
    }
}
