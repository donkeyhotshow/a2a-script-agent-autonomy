<?php

namespace App\Console\Commands\Helpers\ModuleValidate;

trait PaginationHelper
{
    /**
     * Handles interactive pagination of output
     * 
     * @param array $lines Array of lines to paginate
     * @param int $pageSize Number of lines per page
     * @return void
     */
    protected function paginateInteractive(array $lines, int $pageSize = 25): void
    {
        $totalLines = count($lines);
        $totalPages = ceil($totalLines / $pageSize);
        $currentPage = 1;
        
        if ($totalPages <= 1) {
            // Display all lines at once if they fit on a single page
            foreach ($lines as $line) {
                $this->line($line);
            }
            return;
        }
        
        while ($currentPage <= $totalPages) {
            // Clear screen for better pagination experience
            $this->clearScreen();
            
            // Show page header
            $this->line("<fg=yellow>--- Validation Results: Page {$currentPage} of {$totalPages} ---</>");
            
            // Calculate page bounds
            $start = ($currentPage - 1) * $pageSize;
            $end = min($start + $pageSize, $totalLines);
            
            // Display current page content
            for ($i = $start; $i < $end; $i++) {
                $this->line($lines[$i]);
            }
            
            // Show navigation footer
            $this->line("\n<fg=yellow>Navigation:</> [n]ext page | [p]revious page | [q]uit | [#] go to page #");
            
            // Get user input
            $input = $this->ask("Enter navigation command");
            
            // Process navigation command
            if (strtolower($input) === 'q' || strtolower($input) === 'quit') {
                break; // Exit pagination
            } elseif (strtolower($input) === 'n' || strtolower($input) === 'next') {
                $currentPage = min($currentPage + 1, $totalPages);
            } elseif (strtolower($input) === 'p' || strtolower($input) === 'prev') {
                $currentPage = max($currentPage - 1, 1);
            } elseif (is_numeric($input)) {
                // Go to specific page if valid
                $targetPage = (int) $input;
                if ($targetPage >= 1 && $targetPage <= $totalPages) {
                    $currentPage = $targetPage;
                } else {
                    // Show error message for invalid page number
                    $this->error("Invalid page number. Please enter a number between 1 and {$totalPages}.");
                    sleep(1); // Short pause to show error
                }
            }
        }
    }
    
    /**
     * Attempts to clear the console screen
     * 
     * @return void
     */
    protected function clearScreen(): void
    {
        // Different clear commands for different OSes
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            system('cls');
        } else {
            system('clear');
        }
        
        // Fallback: add some newlines if system() fails
        $this->line(str_repeat(PHP_EOL, 5));
    }
    
    /**
     * Opens a document in the user's preferred viewer if available
     * 
     * @param string $docPath Path to the document
     * @param bool $plainText Whether to show as plain text instead of using external viewer
     * @return bool True if successful, false otherwise
     */
    protected function openDocument(string $docPath, bool $plainText = false): bool
    {
        $fullPath = base_path($docPath);
        
        if (!file_exists($fullPath)) {
            $this->error("Document not found: {$docPath}");
            return false;
        }
        
        if ($plainText || ($this->hasOption('plain-docs') && $this->option('plain-docs'))) {
            // Display document content directly in terminal
            $content = file_get_contents($fullPath);
            
            $this->clearScreen();
            $this->line("<fg=blue>--- Document: {$docPath} ---</>");
            $this->line($content);
            $this->line("\n<fg=yellow>Press Enter to continue</>");
            $this->ask("");
            return true;
        }
        
        // Attempt to open with system default application
        $command = '';
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $command = "start \"\" \"{$fullPath}\"";
        } elseif (PHP_OS === 'Darwin') { // macOS
            $command = "open \"{$fullPath}\"";
        } else { // Linux and others
            $command = "xdg-open \"{$fullPath}\"";
        }
        
        // Try to execute the command
        $result = shell_exec($command);
        return $result !== false;
    }
} 