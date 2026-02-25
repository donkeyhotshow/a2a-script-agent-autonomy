<?php

namespace App\Helpers;

class ScriptHelper extends Helper
{
    /**
     * Get script directory
     */
    public static function getScriptDir(): string
    {
        return base_path('script');
    }

    /**
     * Get script file path
     */
    public static function getScriptPath(string $script): string
    {
        return self::join(self::getScriptDir(), $script);
    }

    /**
     * Check if script exists
     */
    public static function scriptExists(string $script): bool
    {
        return self::exists(self::getScriptPath($script));
    }

    /**
     * Get script content
     */
    public static function getScriptContent(string $script): string
    {
        return self::get(self::getScriptPath($script));
    }

    /**
     * Execute script
     */
    public static function executeScript(string $script, array $args = []): array
    {
        $scriptPath = self::getScriptPath($script);
        if (!self::exists($scriptPath)) {
            throw new \RuntimeException("Script not found: {$script}");
        }

        $command = "powershell -ExecutionPolicy Bypass -File \"{$scriptPath}\"";
        if (!empty($args)) {
            $command .= ' ' . implode(' ', array_map('escapeshellarg', $args));
        }

        exec($command, $output, $returnCode);
        
        return [
            'output' => $output,
            'code' => $returnCode,
            'success' => $returnCode === 0
        ];
    }

    /**
     * Get script metadata
     */
    public static function getScriptMetadata(string $script): array
    {
        $scriptPath = self::getScriptPath($script);
        if (!self::exists($scriptPath)) {
            return [];
        }

        return [
            'name' => self::basename($scriptPath),
            'path' => $scriptPath,
            'size' => self::size($scriptPath),
            'modified' => self::lastModified($scriptPath),
            'created' => self::created($scriptPath),
            'permissions' => self::permissions($scriptPath),
            'owner' => self::owner($scriptPath),
            'group' => self::group($scriptPath),
            'mime' => self::mimeType($scriptPath),
        ];
    }

    /**
     * List scripts in directory
     */
    public static function listScripts(string $directory = ''): array
    {
        $dir = self::join(self::getScriptDir(), $directory);
        if (!self::isDirectory($dir)) {
            return [];
        }

        return self::files($dir);
    }

    /**
     * Get script dependencies
     */
    public static function getScriptDependencies(string $script): array
    {
        $content = self::getScriptContent($script);
        $dependencies = [];
        
        // Find dot-sourced scripts
        if (preg_match_all('/\.\s*([\'"])(.+?)\1/', $content, $matches)) {
            $dependencies = array_merge($dependencies, $matches[2]);
        }
        
        // Find imported modules
        if (preg_match_all('/Import-Module\s+([\'"])(.+?)\1/', $content, $matches)) {
            $dependencies = array_merge($dependencies, $matches[2]);
        }

        return array_unique($dependencies);
    }

    /**
     * Validate script
     */
    public static function validateScript(string $script): array
    {
        $errors = [];
        $scriptPath = self::getScriptPath($script);
        
        if (!self::exists($scriptPath)) {
            $errors[] = "Script not found: {$script}";
            return $errors;
        }

        // Check file permissions
        if (!self::isReadable($scriptPath)) {
            $errors[] = "Script is not readable: {$script}";
        }

        // Check PowerShell syntax
        $command = "powershell -Command \"Get-Command -Syntax '{$scriptPath}'\" 2>&1";
        exec($command, $output, $returnCode);
        
        if ($returnCode !== 0) {
            $errors[] = "PowerShell syntax error in script: {$script}";
            $errors[] = implode("\n", $output);
        }

        return $errors;
    }

    /**
     * Get script documentation
     */
    public static function getScriptDocumentation(string $script): array
    {
        $content = self::getScriptContent($script);
        $doc = [
            'description' => '',
            'parameters' => [],
            'examples' => [],
            'notes' => []
        ];

        // Extract comment-based documentation
        if (preg_match('/<#\s*(.*?)\s*#>/s', $content, $matches)) {
            $comment = $matches[1];
            
            // Extract description
            if (preg_match('/\.DESCRIPTION\s*(.*?)(?=\.|$)/s', $comment, $desc)) {
                $doc['description'] = trim($desc[1]);
            }
            
            // Extract parameters
            if (preg_match_all('/\.PARAMETER\s+(\w+)\s*(.*?)(?=\.|$)/s', $comment, $params)) {
                foreach ($params[1] as $i => $param) {
                    $doc['parameters'][$param] = trim($params[2][$i]);
                }
            }
            
            // Extract examples
            if (preg_match_all('/\.EXAMPLE\s*(.*?)(?=\.|$)/s', $comment, $examples)) {
                $doc['examples'] = array_map('trim', $examples[1]);
            }
            
            // Extract notes
            if (preg_match_all('/\.NOTES\s*(.*?)(?=\.|$)/s', $comment, $notes)) {
                $doc['notes'] = array_map('trim', $notes[1]);
            }
        }

        return $doc;
    }
} 