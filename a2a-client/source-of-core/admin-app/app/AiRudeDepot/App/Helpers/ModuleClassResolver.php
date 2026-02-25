<?php

namespace App\AiRudeDepot\App\Helpers;

use App\AiRudeDepot\App\App as FrontendApp;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use ReflectionClass;
use ReflectionException;

// Use the new base App

// Using Laravel Facade for filesystem operations

// NOTE: This is a new Helper class in the Frontend namespace
class ModuleClassResolver
{
    protected const MODULE_NAMESPACE = 'App\\AiRudeDepot\\Modules';
    // Base namespace for modules
    protected static $moduleMapCache = null;

    // Base path for module files

    /**
     * Resolves the fully qualified class name for a given module slug.
     *
     * @param string $moduleSlug The slug of the module (e.g., 'landing-main-page').
     * @return string The resolved class name or the default FrontendApp.
     */
    public static function resolve(string $moduleSlug): string
    {
        $map = self::getModuleMap();
        // Try direct match first
        $resolvedClass = $map[$moduleSlug] ?? null;

        // If no direct match, try converting slug to StudlyCase and appending 'Module'
        if (!$resolvedClass) {
            $potentialClassName = Str::studly($moduleSlug) . 'Module';
            $fullPotentialClassName = self::MODULE_NAMESPACE . '\\' . $potentialClassName;
            if (isset($map[Str::kebab($potentialClassName)])) { // Check if this class exists in the map derived from file scan
                $resolvedClass = $fullPotentialClassName;
                Log::debug("[ModuleClassResolver::resolve] Found class by convention: '{$moduleSlug}' -> '{$resolvedClass}'");
            }
        }

        // Fallback to default App class
        $resolvedClass = $resolvedClass ?? FrontendApp::class;

        Log::debug("[ModuleClassResolver::resolve] Resolved class for slug '{$moduleSlug}': {$resolvedClass}");
        return $resolvedClass;
    }

    /**
     * Gets or builds the map of module slugs to their PHP class names.
     * Scans the base modules directory for PHP files following naming conventions.
     *
     * @return array [moduleSlug => className]
     */
    protected static function getModuleMap(): array
    {
        if (self::$moduleMapCache !== null) {
            return self::$moduleMapCache;
        }

        $modulesBasePath = self::getModulesBasePath();
        $modules = [];

        if (!File::isDirectory($modulesBasePath)) {
            Log::warning("[ModuleClassResolver] Modules directory not found: {$modulesBasePath}");
            self::$moduleMapCache = $modules;
            return $modules;
        }

        // Scan for *.php files directly within the Modules directory
        $moduleFiles = File::files($modulesBasePath);

        foreach ($moduleFiles as $file) {
            if (strtolower($file->getExtension()) !== 'php') {
                continue; // Skip non-PHP files
            }

            $moduleClassName = $file->getFilenameWithoutExtension(); // e.g., 'LoginFormModule'

            // Construct the fully qualified class name
            $fullClassName = self::MODULE_NAMESPACE . "\\" . $moduleClassName;

            // Check if the class exists and is instantiable (and not abstract)
            if (class_exists($fullClassName)) {
                try {
                    $reflection = new ReflectionClass($fullClassName);
                    if ($reflection->isAbstract() || !$reflection->isSubclassOf(FrontendApp::class)) {
                        Log::debug("[ModuleClassResolver] Skipping non-module class or abstract class: {$fullClassName}");
                        continue; // Skip abstract classes or non-App subclasses
                    }
                } catch (ReflectionException $e) {
                    Log::warning("[ModuleClassResolver] Reflection error for class '{$fullClassName}': " . $e->getMessage());
                    continue; // Skip if reflection fails
                }

                // Derive slug from class name:
                // 'LoginFormModule' -> 'login-form-module' -> 'login-form'
                // 'PageModule' -> 'page-module' -> 'page'
                // 'StandaloneModule' -> 'standalone-module' -> 'standalone-module' (keeps full if no '-module')
                $potentialSlug = Str::kebab($moduleClassName);
                $moduleSlug = Str::endsWith($potentialSlug, '-module')
                    ? Str::beforeLast($potentialSlug, '-module')
                    : $potentialSlug;

                if (isset($modules[$moduleSlug])) {
                    Log::warning("[ModuleClassResolver] Duplicate slug detected: '{$moduleSlug}' mapped to '{$modules[$moduleSlug]}' and '{$fullClassName}'. Using the latter.");
                }

                Log::debug("[ModuleClassResolver] Mapping slug '{$moduleSlug}' to class '{$fullClassName}'");
                $modules[$moduleSlug] = $fullClassName;

            } else {
                // This case might happen if file exists but isn't autoloadable correctly
                Log::warning("[ModuleClassResolver] Class '{$fullClassName}' derived from file '{$file->getFilename()}' not found or not autoloadable.");
            }
        }

        self::$moduleMapCache = $modules;
        Log::debug("[ModuleClassResolver] Built module map", ['count' => count($modules)]);
        return $modules;
    }

    protected static function getModulesBasePath(): string
    {
        return app_path('AiRudeDepot/Modules');
    }
}
