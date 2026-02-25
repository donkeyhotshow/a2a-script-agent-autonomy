<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class FixValidatorComponentTypeCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:validator-component-type';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix TypeError in ErrorDetectedEvent constructor by ensuring componentType is always a string or null';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing ErrorDetectedEvent component type issues...');
        
        // Fix the ModuleJsonProcessor.php file
        $filePath = app_path('Console/Commands/Helpers/ModuleValidate/ModuleJsonProcessor.php');
        if (File::exists($filePath)) {
            $content = file_get_contents($filePath);
            
            // Remove $context = $eventData and use a more targeted approach
            $pattern = '/private function dispatchValidationEvent\(array \$eventData\): void\s*{[^}]+new \\\\App\\\\Console\\\\Commands\\\\ErrorDetectedEvent\s*\([^)]+\);/s';
            
            $replacement = 'private function dispatchValidationEvent(array $eventData): void
    {
        $commandInstance = $this; // \'this\' is the command instance that uses the trait

        // Extract details from $eventData to construct the appropriate event
        $moduleName = $eventData[\'module\'] ?? \'unknown_module\';
        $filePath = $eventData[\'file\'] ?? \'unknown_file\';
        $jsonPath = $eventData[\'path\'] ?? \'unknown_path\';
        $errorSlug = $eventData[\'error_type\'] ?? \'generic_error\';
        $message = $eventData[\'message\'] ?? \'\'; // Ensure message exists
        $componentType = $eventData[\'component\'] ?? null;

        // Create a clean context array without the main fields to avoid duplication
        $context = array_diff_key($eventData, array_flip([\'module\', \'file\', \'path\', \'error_type\', \'message\', \'component\']));

        // Ensure context is an array
        if (!is_array($context)) {
            $context = [];
        }
        
        // Ensure componentType is a string or null
        if (!is_string($componentType) && !is_null($componentType)) {
            $componentType = null;
        }

        // TODO: Differentiate SystemErrorDetectedEvent vs ErrorDetectedEvent if needed
        // For now, all are treated as ErrorDetectedEvent
        
        $eventToDispatch = new \\App\\Console\\Commands\\ErrorDetectedEvent(
            $commandInstance, // The command instance itself
            $moduleName,
            $filePath,
            $jsonPath,
            $errorSlug,
            $message,
            $context,
            $componentType
        );';
            
            $newContent = preg_replace($pattern, $replacement, $content);
            
            if ($newContent !== $content) {
                file_put_contents($filePath, $newContent);
                $this->info('Fixed dispatchValidationEvent in ModuleJsonProcessor.php');
            } else {
                $this->warn('Could not find the pattern to replace in ModuleJsonProcessor.php');
            }
        } else {
            $this->error('File not found: ' . $filePath);
        }
        
        return Command::SUCCESS;
    }
}
