<?php

/**
 * Module Searcher
 * 
 * Searches in indexed module files for a specific query
 */

require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/../../../../app/Helpers/Helper.php';

class Searcher
{
    use \StringHelperTrait;
    use \ArrayHelperTrait;
    use \JsonHelperTrait;
    use \FileHelperTrait;
    use \PathHelperTrait;
    
    private $basePath;
    private $enginePath;
    private $indexPath;
    private $modulesPath;
    private $verbose = false;
    
    /**
     * Constructor
     */
    public function __construct()
    {
        $this->setupPaths();
    }
    
    /**
     * Setup paths
     */
    private function setupPaths()
    {
        $this->basePath = dirname(dirname(dirname(dirname(__DIR__))));
        $this->enginePath = $this->join($this->basePath, 'script', 'engine');
        $this->indexPath = $this->join($this->enginePath, 'index');
        $this->modulesPath = $this->join($this->basePath, 'modules');
    }
    
    /**
     * Get all modules
     */
    private function getAllModules()
    {
        if (!$this->isDirectory($this->modulesPath)) {
            $this->log("Modules directory not found: {$this->modulesPath}", 'ERROR');
            return [];
        }
        
        $modules = [];
        $dirs = scandir($this->modulesPath);
        
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') {
                continue;
            }
            
            $dirPath = $this->join($this->modulesPath, $dir);
            if ($this->isDirectory($dirPath)) {
                $modules[] = $dir;
            }
        }
        
        return $modules;
    }
    
    /**
     * Get indexed files
     */
    private function getIndexedFiles($module = null)
    {
        $indexPath = $this->indexPath;
        
        if ($module) {
            $indexPath = $this->join($indexPath, $module);
            
            if (!$this->isDirectory($indexPath)) {
                $this->log("Module index not found: {$module}", 'ERROR');
                return [];
            }
        }
        
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($indexPath, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $this->endsWith($file->getPathname(), '.json')) {
                $files[] = $file->getPathname();
            }
        }
        
        return $files;
    }
    
    /**
     * Search in indexed file
     */
    private function searchInFile($filePath, $query)
    {
        if (!$this->exists($filePath)) {
            return null;
        }
        
        $content = $this->get($filePath);
        $data = $this->decode($content);
        
        if (!$data) {
            return null;
        }
        
        $matches = [];
        $moduleIndexPath = $this->indexPath;
        
        // Extract module from file path
        $relativePath = substr($filePath, strlen($moduleIndexPath) + 1);
        $pathParts = explode('/', $relativePath);
        $module = $pathParts[0];
        
        // Extract indexed file path
        $indexedFilePath = substr($filePath, strlen($this->join($moduleIndexPath, $module)) + 1);
        $indexedFilePath = substr($indexedFilePath, 0, -5); // Remove .json extension
        
        // Check metadata
        if (isset($data['metadata'])) {
            $metadataJson = $this->encode($data['metadata']);
            if (stripos($metadataJson, $query) !== false) {
                $matches[] = [
                    'type' => 'metadata',
                    'path' => $indexedFilePath,
                    'content' => $data['metadata']
                ];
            }
        }
        
        // Check dependencies
        if (isset($data['dependencies']) && !empty($data['dependencies'])) {
            $dependenciesJson = $this->encode($data['dependencies']);
            if (stripos($dependenciesJson, $query) !== false) {
                $matches[] = [
                    'type' => 'dependencies',
                    'path' => $indexedFilePath,
                    'content' => $data['dependencies']
                ];
            }
        }
        
        // Check metrics
        if (isset($data['metrics'])) {
            $metricsJson = $this->encode($data['metrics']);
            if (stripos($metricsJson, $query) !== false) {
                $matches[] = [
                    'type' => 'metrics',
                    'path' => $indexedFilePath,
                    'content' => $data['metrics']
                ];
            }
        }
        
        // Get original file if it exists to check content
        $originalFilePath = $this->join($this->modulesPath, $module, $indexedFilePath);
        if ($this->exists($originalFilePath)) {
            $originalContent = $this->get($originalFilePath);
            if (stripos($originalContent, $query) !== false) {
                // Find matching lines
                $lines = explode("\n", $originalContent);
                $matchingLines = [];
                
                foreach ($lines as $lineNumber => $line) {
                    if (stripos($line, $query) !== false) {
                        $matchingLines[$lineNumber + 1] = $line;
                    }
                }
                
                if (!empty($matchingLines)) {
                    $matches[] = [
                        'type' => 'content',
                        'path' => $indexedFilePath,
                        'content' => $matchingLines
                    ];
                }
            }
        }
        
        if (!empty($matches)) {
            return [
                'module' => $module,
                'file' => $indexedFilePath,
                'matches' => $matches
            ];
        }
        
        return null;
    }
    
    /**
     * Search in a specific module
     */
    private function searchInModule($module, $query)
    {
        $files = $this->getIndexedFiles($module);
        $results = [];
        
        foreach ($files as $file) {
            $fileResult = $this->searchInFile($file, $query);
            if ($fileResult) {
                $results[] = $fileResult;
            }
        }
        
        return $results;
    }
    
    /**
     * Search in all modules
     */
    private function searchInAllModules($query)
    {
        $modules = $this->getAllModules();
        $results = [];
        
        foreach ($modules as $module) {
            $moduleResults = $this->searchInModule($module, $query);
            if (!empty($moduleResults)) {
                $results = array_merge($results, $moduleResults);
            }
        }
        
        return $results;
    }
    
    /**
     * Format results as text
     */
    private function formatResultsAsText($results)
    {
        if (empty($results)) {
            return "No results found.";
        }
        
        $output = "Search Results:\n";
        $output .= "---------------\n\n";
        
        foreach ($results as $result) {
            $output .= "Module: {$result['module']}\n";
            $output .= "File: {$result['file']}\n";
            
            foreach ($result['matches'] as $match) {
                $output .= "  Type: {$match['type']}\n";
                
                if ($match['type'] === 'content') {
                    $output .= "  Matching Lines:\n";
                    foreach ($match['content'] as $lineNumber => $line) {
                        $output .= "    Line {$lineNumber}: " . trim($line) . "\n";
                    }
                } else {
                    $output .= "  Content: " . $this->encode($match['content']) . "\n";
                }
                
                $output .= "\n";
            }
            
            $output .= "---------------\n\n";
        }
        
        return $output;
    }
    
    /**
     * Display log message
     */
    private function log($message, $level = 'INFO')
    {
        if ($this->verbose || $level === 'ERROR') {
            $date = date('Y-m-d H:i:s');
            echo "[{$date}] [{$level}] {$message}" . PHP_EOL;
        }
        
        $logFile = $this->join($this->enginePath, 'log', 'searcher.log');
        $date = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[{$date}] [{$level}] {$message}" . PHP_EOL, FILE_APPEND);
    }
    
    /**
     * Run searcher
     */
    public function run($query, $module = null, $outputFormat = 'json', $verbose = false)
    {
        $this->verbose = $verbose;
        
        if (empty($query)) {
            $this->log("Search query is required", 'ERROR');
            return false;
        }
        
        if ($module) {
            $this->log("Searching for '{$query}' in module: {$module}");
            $results = $this->searchInModule($module, $query);
        } else {
            $this->log("Searching for '{$query}' in all modules");
            $results = $this->searchInAllModules($query);
        }
        
        $this->log("Found " . count($results) . " results");
        
        if ($outputFormat === 'text') {
            return $this->formatResultsAsText($results);
        } else {
            return $this->pretty($results);
        }
    }
} 