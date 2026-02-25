<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use App\Engine\Core\NeuralIndexer;

class IndexDocumentsCommand extends Command
{
    protected $signature = 'search:index 
                            {path? : Path to index} 
                            {--query= : Search query to filter documents}
                            {--include=* : Comma-separated list of indexes to include}
                            {--fields=* : Comma-separated list of fields to search}
                            {--force : Force re-indexing}';

    protected $description = 'Index documents for search';

    private NeuralIndexer $neuralIndexer;
    private array $config;

    public function __construct(NeuralIndexer $neuralIndexer)
    {
        parent::__construct();
        $this->neuralIndexer = $neuralIndexer;
        $this->config = config('search-indexer');
    }

    public function handle()
    {
        $path = $this->argument('path') ?? base_path();
        $query = $this->option('query');
        $includeIndexes = $this->option('include');
        $searchFields = $this->option('fields');
        $force = $this->option('force');

        if (!is_dir($path)) {
            $this->error("Path {$path} does not exist");
            return 1;
        }

        $this->info("Starting indexing...");
        $this->info("Scanning directory: {$path}");

        try {
            $stats = $this->neuralIndexer->indexDirectory($path, $force);
            $this->newLine();
            $this->info('Indexing completed successfully');

            $this->info("Files processed: {$stats['files_processed']}");
            $this->info("Files indexed: {$stats['files_indexed']}");
            $this->info("Files skipped: {$stats['files_skipped']}");
            $this->info("Total chunks created: {$stats['chunks_created']}");
            $this->info("Processing time: {$stats['processing_time']} seconds");

            return 0;
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('Indexing failed: ' . $e->getMessage());
            return 1;
        }
    }

    private function scanDirectory(string $path, ?string $query = null, array $includeIndexes = [], array $searchFields = []): array
    {
        $documents = [];
        $allowedExtensions = $this->config['file_processing']['allowed_extensions'];
        $maxFileSize = $this->config['file_processing']['max_file_size'];
        $excludeDirs = $this->config['file_processing']['exclude_directories'];
        $excludePatterns = $this->config['file_processing']['exclude_patterns'];

        $files = File::allFiles($path);

        foreach ($files as $file) {
            // Get relative path
            $relativePath = Str::after($file->getPathname(), base_path());
            $relativePath = ltrim($relativePath, '\\/');

            // Skip excluded directories
            foreach ($excludeDirs as $dir) {
                if (Str::contains($relativePath, $dir)) {
                    // $this->warn("Skipping excluded directory: {$relativePath}");
                    continue 2;
                }
            }

            // Skip excluded patterns
            foreach ($excludePatterns as $pattern) {
                if (preg_match($pattern, $relativePath)) {
                    // $this->warn("Skipping excluded pattern: {$relativePath}");
                    continue 2;
                }
            }

            // Skip files with disallowed extensions
            if (!in_array($file->getExtension(), $allowedExtensions)) {
                continue;
            }

            // Skip files that are too large
            if ($file->getSize() > $maxFileSize) {
                $this->warn("Skipping large file: {$file->getPathname()}");
                continue;
            }

            // Skip if not in included indexes
            if (!empty($includeIndexes)) {
                $included = false;
                foreach ($includeIndexes as $index) {
                    if (Str::startsWith($relativePath, $index)) {
                        $included = true;
                        break;
                    }
                }
                if (!$included) {
                    continue;
                }
            }

            // Read file content
            $content = File::get($file->getPathname());
            if ($content === false) {
                $this->warn("Could not read file: {$file->getPathname()}");
                continue;
            }

            // Skip empty files
            if (empty(trim($content))) {
                // $this->warn("Skipping empty file: {$file->getPathname()}");
                continue;
            }

            // Filter by query if specified
            if (!empty($query)) {
                $shouldInclude = false;
                foreach ($searchFields as $field) {
                    switch ($field) {
                        case 'path':
                            if (stripos($relativePath, $query) !== false) {
                                $shouldInclude = true;
                            }
                            break;
                        case 'content':
                            if (stripos($content, $query) !== false) {
                                $shouldInclude = true;
                            }
                            break;
                    }
                }
                if (!$shouldInclude) {
                    continue;
                }
            }

            $documents[$relativePath] = $content;
        }

        return $documents;
    }
} 