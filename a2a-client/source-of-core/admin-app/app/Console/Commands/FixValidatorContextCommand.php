<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;
use Illuminate\Support\Facades\File;

class FixValidatorContextCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:validator-context';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix TypeError in ErrorDetectedEvent constructor by ensuring context is always an array';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing ErrorDetectedEvent context issues in PHP files...');
        
        // Get all PHP files in the app directory
        $finder = new Finder();
        $finder->files()
               ->name('*.php')
               ->in(app_path());
        
        $filesFixed = 0;
        $issuesFixed = 0;
        
        foreach ($finder as $file) {
            $filePath = $file->getRealPath();
            $content = file_get_contents($filePath);
            
            // First ensure the constructor always handles non-array contexts
            if (strpos($filePath, 'ValidateModuleJsonCommand.php') !== false) {
                $oldConstructor = 'public function __construct($commandOrModuleName, string $filePath, string $jsonPath, string $errorSlug, string $message = \'\', array $context = [], ?string $componentType = null)';
                $newConstructor = 'public function __construct($commandOrModuleName, string $filePath, string $jsonPath, string $errorSlug, string $message = \'\', $context = [], ?string $componentType = null)';
                
                if (strpos($content, $oldConstructor) !== false) {
                    $content = str_replace($oldConstructor, $newConstructor, $content);
                    $this->comment("Modified constructor signature in: " . basename($filePath));
                    
                    // Also ensure context is handled as array inside the constructor
                    if (strpos($content, '$this->context = is_array($context) ? $context : [];') === false) {
                        $content = str_replace(
                            '$this->context = $context;', 
                            '$this->context = is_array($context) ? $context : [];', 
                            $content
                        );
                    }
                    $issuesFixed++;
                }
            }
            
            // Look for direct instantiations of ErrorDetectedEvent
            if (preg_match_all('/(new\s+(?:\\\\App\\\\Console\\\\Commands\\\\)?ErrorDetectedEvent\s*\()([^)]+)(\))/', $content, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE)) {
                $newContent = $content;
                $offset = 0;
                
                foreach ($matches as $match) {
                    $fullMatch = $match[0][0];
                    $fullMatchPos = $match[0][1];
                    $argsStr = $match[2][0];
                    
                    // Split the arguments
                    $args = $this->parseArguments($argsStr);
                    
                    if (count($args) >= 6) {
                        $contextArg = $args[5];
                        
                        // Only modify if context argument is not already an array or a variable
                        if ((substr($contextArg, 0, 1) === '"' && substr($contextArg, -1) === '"') || 
                            (substr($contextArg, 0, 1) === "'" && substr($contextArg, -1) === "'")) {
                            
                            // Replace the string context with an empty array
                            $args[5] = '[]';
                            $newArgsStr = implode(', ', $args);
                            
                            $newFullMatch = $match[1][0] . $newArgsStr . $match[3][0];
                            $newContent = substr_replace(
                                $newContent, 
                                $newFullMatch, 
                                $fullMatchPos + $offset, 
                                strlen($fullMatch)
                            );
                            
                            $offset += strlen($newFullMatch) - strlen($fullMatch);
                            $issuesFixed++;
                        }
                    }
                }
                
                if ($newContent !== $content) {
                    $content = $newContent;
                }
            }
            
            // If content has been modified, save the file
            if ($content !== file_get_contents($filePath)) {
                file_put_contents($filePath, $content);
                $this->info("Fixed file: " . basename($filePath));
                $filesFixed++;
            }
        }
        
        // Also fix all places that call methods which create an ErrorDetectedEvent
        $this->fixIndirectCalls();
        
        $this->info("Fix completed! Modified $filesFixed files with $issuesFixed fixes.");
        
        return Command::SUCCESS;
    }
    
    /**
     * Parse the arguments from a method call
     * This is a simple parser that handles basic cases like strings and arrays
     */
    private function parseArguments(string $argsStr): array
    {
        $args = [];
        $currentArg = '';
        $inSingleQuote = false;
        $inDoubleQuote = false;
        $bracketLevel = 0;
        
        for ($i = 0; $i < strlen($argsStr); $i++) {
            $char = $argsStr[$i];
            
            if ($char === "'" && !$inDoubleQuote) {
                $inSingleQuote = !$inSingleQuote;
                $currentArg .= $char;
            } elseif ($char === '"' && !$inSingleQuote) {
                $inDoubleQuote = !$inDoubleQuote;
                $currentArg .= $char;
            } elseif (($char === '[' || $char === '(' || $char === '{') && !$inSingleQuote && !$inDoubleQuote) {
                $bracketLevel++;
                $currentArg .= $char;
            } elseif (($char === ']' || $char === ')' || $char === '}') && !$inSingleQuote && !$inDoubleQuote) {
                $bracketLevel--;
                $currentArg .= $char;
            } elseif ($char === ',' && !$inSingleQuote && !$inDoubleQuote && $bracketLevel === 0) {
                $args[] = trim($currentArg);
                $currentArg = '';
            } else {
                $currentArg .= $char;
            }
        }
        
        if (!empty($currentArg)) {
            $args[] = trim($currentArg);
        }
        
        return $args;
    }
    
    /**
     * Fix methods that indirectly create ErrorDetectedEvent objects
     */
    private function fixIndirectCalls()
    {
        // Fix the dispatchValidationEvent method in ModuleJsonProcessor trait
        $filePath = app_path('Console/Commands/Helpers/ModuleValidate/ModuleJsonProcessor.php');
        if (File::exists($filePath)) {
            $content = file_get_contents($filePath);
            
            // Add a check to ensure context is always an array
            if (strpos($content, '// Ensure context is an array') === false) {
                $pattern = '/\$context = \$eventData; \/\/ Pass the whole original array as context/';
                $replacement = '$context = $eventData; // Pass the whole original array as context' . PHP_EOL . PHP_EOL . '        // Ensure context is an array' . PHP_EOL . '        if (!is_array($context)) {' . PHP_EOL . '            $context = [];' . PHP_EOL . '        }';
                
                $newContent = preg_replace($pattern, $replacement, $content);
                
                if ($newContent !== $content) {
                    file_put_contents($filePath, $newContent);
                    $this->info("Fixed dispatchValidationEvent in ModuleJsonProcessor.php");
                }
            }
        }
    }
}
