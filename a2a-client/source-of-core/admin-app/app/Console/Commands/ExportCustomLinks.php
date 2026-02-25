<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

// Ensure Config facade is imported

// Optional: for logging errors

class ExportCustomLinks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'links:export';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Exports the resolved custom links from config/customlinks.php as JSON';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // The config('customlinks.links') should automatically load and resolve base_path()
        // from your config/customlinks.php file.
        $links = Config::get('customlinks.links');

        if (is_null($links)) {
            $errorMessage = 'config/customlinks.php not found or the "links" key is missing/empty.';
            $this->error($errorMessage);
            Log::error($errorMessage); // Optional: log to Laravel log
            return Command::FAILURE;
        }

        if (!is_array($links)) {
            $errorMessage = 'The "links" key in config/customlinks.php is not an array.';
            $this->error($errorMessage);
            Log::error($errorMessage); // Optional: log to Laravel log
            return Command::FAILURE;
        }

        if (empty($links)) {
            $this->warn('No links found in config/customlinks.php to export.');
            $this->line(json_encode([], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)); // Output empty JSON array
            return Command::SUCCESS;
        }

        $this->line(json_encode($links, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        return Command::SUCCESS;
    }
}
