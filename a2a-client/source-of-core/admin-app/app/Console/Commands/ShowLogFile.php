<?php

namespace App\Console\Commands;

use App\Hooks\FileFacade as File;
use Exception;
use Illuminate\Console\Command;

class ShowLogFile extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'show:log {logName? : The name of the log file to display (optional, defaults to laravel.log)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Display the contents of the laravel.log file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $logPath = storage_path('logs/' . $this->argument('logName') . '.log');

        if (!File::exists($logPath)) {
            $this->error('Log file does not exist at: ' . $logPath);
            return 1; // Indicate error
        }

        try {
            $content = File::get($logPath);
            // Output content line by line to avoid potential formatting issues
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                $this->line($line);
            }
            $this->info("\n--- End of log file ---");
            return 0; // Indicate success
        } catch (Exception $e) {
            $this->error('Error reading log file: ' . $e->getMessage());
            return 1; // Indicate error
        }
    }
}
