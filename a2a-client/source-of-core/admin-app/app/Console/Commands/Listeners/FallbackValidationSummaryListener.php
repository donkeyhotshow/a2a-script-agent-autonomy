<?php

namespace App\Console\Commands\Listeners;

use App\Console\Commands\ErrorDetectedEvent;
use App\Console\Commands\ValidationFinishedEvent;
use App\Console\Commands\Helpers\ModuleValidate\ValidationEventCollector;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class FallbackValidationSummaryListener
{
    protected bool $errorWasOutput = false;
    protected array $stats = [
        'files' => 0,
        'components' => 0,
        'errors' => 0,
        'warnings' => 0
    ];

    public function handleErrorDetected(ErrorDetectedEvent $event): void
    {
        $this->errorWasOutput = true;
        $this->stats['errors']++;
    }

    public function handleValidationFinished(ValidationFinishedEvent $event): void
    {
        if (!$this->errorWasOutput) {
            $this->collectStats();
            $this->outputSummary();
            $this->checkLogsForErrors();
        }
    }

    protected function collectStats(): void
    {
        $this->stats = ValidationEventCollector::getStats();
    }

    protected function outputSummary(): void
    {
        echo "\n=== Validation Summary ===\n";
        echo "Files scanned: {$this->stats['files']}\n";
        echo "Components found: {$this->stats['components']}\n";
        echo "Errors detected: {$this->stats['errors']}\n";
        echo "Warnings: {$this->stats['warnings']}\n";
    }

    protected function checkLogsForErrors(): void
    {
        $logPath = storage_path('logs/laravel.log');
        if (File::exists($logPath)) {
            $content = File::get($logPath);
            $lines = explode("\n", $content);
            
            $errorLines = array_filter($lines, function($line) {
                return stripos($line, 'error') !== false || 
                       stripos($line, 'exception') !== false ||
                       stripos($line, 'failed') !== false;
            });

            if (!empty($errorLines)) {
                echo "\n--- Errors in log ---\n";
                foreach ($errorLines as $line) {
                    echo trim($line) . "\n";
                }
            }
        }
    }
} 