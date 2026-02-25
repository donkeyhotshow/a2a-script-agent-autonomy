<?php

namespace App\AiRudeDepot\Managers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class StoragePathParser
{
    private const VALID_PREFIXES = [
        'file!', 'model!', 'mysql!', 'dir!', 'directory!', 'session!',
        'buffer:', 'session:', 'output:', 'input:', 'args:', 'props:'
    ];
    private const VALID_BUFFER_TYPES = ['buffer', 'output', 'input', 'args', 'props'];
    // Define valid prefixes
    protected static bool $allowDebug = false;
    protected static bool $allowVerbosity = false; // Buffer types without !

    public static function parse($pathOriginal, $default = false, $diskName = 'ai'): array
    {
        if (!$diskName) $diskName = 'ai';
        $originalPathForError = $pathOriginal; // Keep original for error message
        if (self::$allowDebug)
            \Log::debug('[StoragePathParser::parse] Start parsing', ['original' => $pathOriginal, 'diskName' => $diskName]);

        $path = self::trimsAndFilter($pathOriginal, $diskName);
        if (self::$allowDebug)
            \Log::debug('[StoragePathParser::parse] Path after trimsAndFilter', ['filtered' => $path]);


        if (!is_string($path) || empty($path)) {
            throw new InvalidArgumentException("Path cannot be empty.");
        }

        $isValid = false;
        $detectedType = null;
        $processedPath = $path; // Use a separate var for potentially modified path

        // 1. Check for known explicit prefixes
        foreach (self::VALID_PREFIXES as $prefix) {
            if (strpos($path, $prefix) === 0) {
                $isValid = true;
                $detectedType = rtrim(explode('!', explode(':', $prefix)[0])[0], '!');
                if (self::$allowDebug)
                    \Log::debug('[StoragePathParser::parse] Matched explicit prefix', ['prefix' => $prefix, 'type' => $detectedType]);
                break;
            }
        }

        // 1a. Check for EMPTY prefix ('!') immediately after explicit prefix check
        if (!$isValid && strpos($path, '!') === 0) {
            \Log::error('[StoragePathParser::parse] Path prefix cannot be empty', ['path' => $originalPathForError]);
            throw new InvalidArgumentException("Path prefix cannot be empty in path: {$originalPathForError}");
        }

        // 1b. Check for UNKNOWN prefix ('unknown!') immediately after explicit prefix check
        $separatorPos = strpos($path, '!');
        if (!$isValid && $separatorPos !== false) {
            // Check if the part before '!' is *not* a known prefix ONLY if no valid prefix found yet
            $potentialPrefix = substr($path, 0, $separatorPos + 1);
            $foundInPrefixes = false;
            foreach (self::VALID_PREFIXES as $validPrefix) {
                if ($potentialPrefix === $validPrefix) {
                    $foundInPrefixes = true;
                    break;
                }
            }
            // Throw error only if an explicit prefix was attempted but wasn't known/valid
            if (!$foundInPrefixes) {
                \Log::error('[StoragePathParser::parse] Invalid or unsupported path prefix found', ['prefix' => rtrim($potentialPrefix, '!'), 'path' => $originalPathForError]);
                throw new InvalidArgumentException("Invalid or unsupported path prefix '" . rtrim($potentialPrefix, '!') . "' in path: {$originalPathForError}");
            }
        }

        // 2. If no *valid* explicit prefix was found, check for known implicit types
        if (!$isValid) {
            if (self::$allowDebug)
                \Log::debug('[StoragePathParser::parse] No valid explicit prefix found. Checking implicit types...');
            // Buffer types (e.g., 'buffer' or 'buffer:key')
            foreach (self::VALID_BUFFER_TYPES as $bufferType) {
                // Adjusted regex to anchor at the start and allow trailing content
                if (preg_match('/^' . preg_quote($bufferType, '/') . '(:|$)/', $path)) {
                    $isValid = true;
                    $detectedType = $bufferType;
                    break;
                }
            }
            // Session type
            if (!$isValid && preg_match('/^session(:|!|$)/', $path)) {
                $isValid = true;
                $detectedType = 'session';
            }
            // MySQL table names (implicit)
            if (!$isValid && self::isMysql($path)) {
                $isValid = true;
                $detectedType = 'mysql';
                $processedPath = 'mysql!' . $path;
            }
            // Model names (implicit)
            if (!$isValid && self::isModel($path)) {
                $isValid = true;
                $detectedType = 'model';
                $processedPath = 'model!' . $path;
            }
            // Dir/Directory (Implicit check added here - was previously only explicit)
            // Check if it looks like a directory path but missing the prefix
            if (!$isValid && strpos($path, '/') !== false && !preg_match('/^[a-zA-Z0-9_-]+(!|:)/', $path)) {
                // Basic check: contains '/' and doesn't look like it has another prefix attempt
                // A more robust check might involve checking if the path *exists* as a directory
                // For now, we'll keep the implicit file check below as the primary fallback for paths with '/'

                // If it matches the structure of dir!path or directory!path without the prefix explicitly
                if (preg_match('/^[a-zA-Z0-9\/\.\-\_\@]+$/', $path) && is_dir(storage_path($diskName . '/' . $path))) {
                    // This is potentially risky, as it checks the filesystem.
                    // Consider if this implicit directory check is desired.
                    // If we enable this, we might mistakenly classify some file paths as directories.
                    // Let's keep it commented out for now and rely on explicit dir!/directory!
                    // $isValid = true;
                    // $detectedType = 'directory';
                    // $processedPath = 'directory!' . $path;
                }
            }

            // Implicit file check (moved here, made stricter)
            if (!$isValid && strpos($path, '/') !== false) {
                // Check if it contains '/' AND does *not* have 'prefix!' or 'prefix:' structure at the start.
                if (!preg_match('/^[a-zA-Z0-9_-]+(!|:)/', $path)) {
                    $isValid = true;
                    $detectedType = 'file';
                    // Add prefix only if it doesn't already exist
                    if (strpos($processedPath, 'file!') !== 0) {
                        $processedPath = 'file!' . $processedPath; // Use processedPath here
                    }
                    if (self::$allowDebug)
                        \Log::debug('[StoragePathParser::parse] Matched implicit file type');
                } else {
                    if (self::$allowDebug)
                        \Log::debug('[StoragePathParser::parse] Path contains \'/\' but also a prefix-like structure, not treating as implicit file.');
                }
            }


            if ($isValid && $detectedType !== 'file') { // Log match only if not file (file logs separately)
                if (self::$allowDebug)
                    \Log::debug('[StoragePathParser::parse] Matched implicit type', ['type' => $detectedType]);
            }
        }

        // 3. If still not valid, check for IMPLICIT file type (moved down, was overriding prefix errors)
        if (!$isValid && strpos($path, '/') !== false) {
            // Check if it contains '/' AND does *not* have 'prefix!' or 'prefix:' structure at the start.
            if (!preg_match('/^[a-zA-Z0-9_-]+(!|:)/', $path)) {
                $isValid = true;
                $detectedType = 'file';
                // Add prefix only if it doesn't already exist
                if (strpos($processedPath, 'file!') !== 0) {
                    $processedPath = 'file!' . $processedPath; // Use processedPath here
                }
                if (self::$allowDebug)
                    \Log::debug('[StoragePathParser::parse] Matched implicit file type');
            } else {
                if (self::$allowDebug)
                    \Log::debug('[StoragePathParser::parse] Path contains \'/\' but also a prefix-like structure, not treating as implicit file.');
            }
        }

        // 6. Final validation check
        if (!$isValid || $detectedType === null) {
            \Log::error('[StoragePathParser::parse] Could not determine storage type', ['path' => $path, 'original' => $originalPathForError, 'isValid' => $isValid, 'detectedType' => $detectedType]); // Log type
            throw new InvalidArgumentException("Could not determine storage type for path: " . $originalPathForError);
        }

        // Proceed using $detectedType and $processedPath
        switch ($detectedType) {
            case 'mysql':
                return self::processMysql($processedPath); // Use potentially modified path
            case 'model':
                return self::processModel($processedPath); // Use potentially modified path
            case 'dir':
            case 'directory':
                return self::processDir($processedPath);
            case 'buffer':
                // Add cases for other buffer types, delegate to processBuffer
            case 'output':
            case 'input':
            case 'args':
            case 'props':
                return self::processBuffer($processedPath);
            case 'session':
                return self::processSession($processedPath);
            case 'file':
                return self::processFile($processedPath, $default, $diskName); // Use potentially modified path
            default:
                // This case should technically be unreachable due to the final validation check
                throw new InvalidArgumentException("[Should not happen] Unsupported detected path type: " . $detectedType . " for original path: " . $originalPathForError);
        }
    }

    private static function trimsAndFilter($content, $diskName)
    {
        $initialContent = $content;
        $content = trim($content);
        $content = str_replace('\\', '/', $content);

        if (substr($content, -5) === '.json') {
            $content = substr($content, 0, -5);
        }

        // Simplified: Only add 'file!' if '/' exists and NO '!' exists anywhere
        if (strpos($content, '/') !== false && strpos($content, '!') === false) {
            // Add prefix only if it doesn't already exist (double check)
            if (strpos($content, 'file!') !== 0) {
                $content = 'file!' . $content;
            }
        }

        // Проверка на абсолютный путь к хранилищу
        // Use Storage facade to get the root path for the specified disk
        try {
            $storageRootPath = str_replace('\\', '/', Storage::disk($diskName)->path(''));
        } catch (InvalidArgumentException $e) {
            // Handle cases where the disk might not be configured - log and potentially re-throw or fallback
            Log::error("[StoragePathParser::trimsAndFilter] Disk '{$diskName}' not configured.", ['exception' => $e->getMessage()]);
            // Depending on desired behavior, either throw or maybe default to 'ai' disk path?
            // For now, let's throw to make misconfigurations obvious.
            throw new InvalidArgumentException("Disk [{$diskName}] not configured during path parsing.", 0, $e);
        }

        if (strpos($content, $storageRootPath) === 0) {
            // Это абсолютный путь к хранилищу
            $relativePath = substr($content, strlen($storageRootPath));
            $relativePath = ltrim($relativePath, '/'); // Ensure relative path doesn't start with /

            // Проверяем, был ли путь к модели
            if (file_exists(app_path('Models/' . basename($relativePath) . '.php'))) {
                return 'model!' . basename($relativePath);
            }

            // Проверяем, относится ли этот путь к MySQL таблице
            if (strpos($relativePath, 'test_') === 0 || strpos($relativePath, 'mysql_') === 0) {
                return 'mysql!' . basename($relativePath);
            }

            // Если не модель и не mysql, то предполагаем что это файл
            // Add file! prefix only if needed
            if (strpos($relativePath, '/') !== false && strpos($relativePath, 'file!') !== 0) {
                return 'file!' . $relativePath;
            }

            // Return relative path, potentially without prefix if it was just the root
            return (strpos($relativePath, '!') === false && strpos($relativePath, ':') === false) ? $relativePath : 'file!' . $relativePath;
        }

        $storagePrefix = storage_path($diskName . '/') . "directory!";
        if (strpos($content, $storagePrefix) === 0) {
            $content = substr($content, strlen($storagePrefix));
        } else {
            $storagePrefix = storage_path($diskName . '/') . "file!";
            if (strpos($content, $storagePrefix) === 0) {
                $content = substr($content, strlen($storagePrefix));
            }
        }
        if (self::$allowDebug)
            \Log::debug('[StoragePathParser::trimsAndFilter]', ['initial' => $initialContent, 'final' => trim($content)]);
        return trim($content);
    }

    public static function isMysql($path): bool
    {
        // Проверяем прямое указание mysql
        if (strpos($path, 'mysql!') === 0) {
            return true;
        }

        // Проверка на названия таблиц
        if (preg_match('/^(test_|mysql_)[a-zA-Z0-9_]+$/', $path) && !strpos($path, '/')) {
            return true;
        }

        return false;
    }

    public static function isModel($path): bool
    {
        // Проверяем прямое указание модели
        if (strpos($path, 'model!') === 0) {
            return true;
        }

        // Проверяем, является ли это именем модели
        if (preg_match('/^[A-Z][a-zA-Z0-9_]*$/', $path) && !strpos($path, '/')) {
            $modelPath = app_path('Models/' . $path . '.php');
            if (file_exists($modelPath)) {
                return true;
            }
        }

        return false;
    }

    protected static function processMysql(string $path): array
    {
        Log::debug('[StoragePathParser::processMysql] Processing MySQL path', ['path' => $path]);
        $originalPath = $path;
        $parameters = [];
        $keyPath = [];
        $operation = null;
        $storagePath = null;
        $label = null;

        // Remove the mysql! prefix
        $path = substr($path, strlen('mysql!'));

        // Check for and parse query string parameters first (if any)
        $queryPos = strpos($path, '?');
        if ($queryPos !== false) {
            $queryString = substr($path, $queryPos + 1);
            parse_str($queryString, $parameters);
            $path = substr($path, 0, $queryPos);
            Log::debug('[StoragePathParser::processMysql] Parsed query string', ['path_base' => $path, 'query' => $queryString, 'params' => $parameters]);
        }

        // Split the remaining path by '/'
        $pathSegments = explode('/', $path);
        $storagePath = array_shift($pathSegments); // First segment is the table name
        $label = $storagePath; // Default label is table name

        // Handle path segments *if* no query string parameters were found for operation/where
        if (empty($parameters['operation']) && !empty($pathSegments)) {
            Log::debug('[StoragePathParser::processMysql] Processing path segments', ['segments' => $pathSegments]);
            $segmentOperation = strtolower(array_shift($pathSegments));

            if (in_array($segmentOperation, ['find', 'where', 'count', 'insert', 'update', 'delete'])) {
                $parameters['operation'] = $segmentOperation;
                Log::debug('[StoragePathParser::processMysql] Found operation in path segment', ['operation' => $segmentOperation]);

                switch ($segmentOperation) {
                    case 'find':
                        if (!empty($pathSegments)) {
                            $parameters['id'] = array_shift($pathSegments);
                            $label = $parameters['id']; // Label becomes the ID for find
                            Log::debug('[StoragePathParser::processMysql] Parsed ID for find', ['id' => $parameters['id']]);
                        }
                        break;
                    case 'where':
                        $whereParams = [];
                        // Expecting key/value pairs in segments
                        while (count($pathSegments) >= 2) {
                            $key = array_shift($pathSegments);
                            $value = array_shift($pathSegments);
                            $whereParams[$key] = $value;
                        }
                        if (!empty($whereParams)) {
                            $parameters['where'] = $whereParams;
                            // Generate label from where conditions
                            $labelParts = [];
                            foreach ($whereParams as $k => $v) {
                                $labelParts[] = $k . '=' . $v;
                            }
                            $label = implode('&', $labelParts); // Create a label like column=value&...
                            Log::debug('[StoragePathParser::processMysql] Parsed where conditions', ['where' => $parameters['where']]);
                        }
                        // If count is also present after where, handle it
                        if (!empty($pathSegments) && strtolower($pathSegments[0]) === 'count') {
                            // This case isn't explicitly handled by the `model!` format,
                            // maybe `mysql!table/count/where/col/val` is better? Let's stick to simpler for now.
                            // Consider adjusting if this pattern is needed.
                            array_shift($pathSegments); // Consume 'count' if needed
                        }
                        break;
                    case 'count':
                        // If 'where' follows 'count', parse it
                        if (!empty($pathSegments) && strtolower($pathSegments[0]) === 'where') {
                            array_shift($pathSegments); // Consume 'where'
                            $whereParams = [];
                            while (count($pathSegments) >= 2) {
                                $key = array_shift($pathSegments);
                                $value = array_shift($pathSegments);
                                $whereParams[$key] = $value;
                            }
                            if (!empty($whereParams)) {
                                $parameters['where'] = $whereParams;
                                Log::debug('[StoragePathParser::processMysql] Parsed where conditions for count', ['where' => $parameters['where']]);
                            }
                        } // else: just count the whole table
                        $label = 'count';
                        break;
                    // Operations like insert, update, delete usually don't take key info from path segments
                    // The data comes via set(), and context (like ID for update/delete) might come from a previous find/where or parameters.
                    // We'll just set the operation based on the segment.
                    case 'insert':
                    case 'update':
                    case 'delete':
                        $label = $segmentOperation;
                        break;
                }
            } else {
                // If the first segment wasn't a known operation, put it back (maybe it's part of table name?)
                array_unshift($pathSegments, $segmentOperation);
                Log::debug('[StoragePathParser::processMysql] First path segment not a recognized operation', ['segment' => $segmentOperation]);
            }
        }

        // Handle keyPath if present (separated by :)
        $colonPos = strpos(implode('/', $pathSegments), ':'); // Check remaining segments for keyPath
        if ($colonPos !== false) {
            // Reconstruct the path part before the colon, and extract key path after
            $remainingPathString = implode('/', $pathSegments);
            $keyPathString = substr($remainingPathString, $colonPos + 1);
            $keyPath = explode('.', $keyPathString);
            $label = end($keyPath) ?: $label; // Update label to last key path segment
            // The path part before the colon might need reconciliation if segments were parsed above
            // For simplicity now, assume keyPath comes after table name if no operation segments were parsed
            if (empty($parameters['operation'])) {
                $pathBase = substr($remainingPathString, 0, $colonPos);
                // This might overwrite storagePath if it contained segments... needs careful thought
                // Example: mysql!table/part1:key.path -> storagePath = table/part1 ?
                // For now, let's assume keyPath only applies simply: mysql!table:key.path
                Log::debug('[StoragePathParser::processMysql] Found keyPath', ['keyPath' => $keyPath, 'label' => $label]);
            } else {
                Log::warning('[StoragePathParser::processMysql] KeyPath found after operation segments, parsing might be ambiguous', ['remaining' => $remainingPathString]);
                // Potentially parse keyPath even if operation segments exist?
                $keyPath = explode('.', $keyPathString);
                $label = end($keyPath) ?: $label; // Update label to last key path segment
            }
        }


        $result = [
            'storagePath' => $storagePath,
            'keyPath' => $keyPath,
            'pathName' => $originalPath,
            'moduleName' => 'Mysql',
            'parameters' => $parameters,
            'label' => $label,
            'original_path' => $originalPath
        ];

        Log::debug('[StoragePathParser::processMysql] Parsed result', $result);
        return $result;
    }

    protected static function processModel(string $path): array
    {
        Log::debug('Model processing (new path logic)', ['path' => $path]);
        $path = str_replace('model!', '', $path);

        // Separate key path if present (using ':')
        $keyPathStr = null;
        $keyPath = [];
        $originalPathForReconstruction = $path; // Store before stripping keyPath
        if (strpos($path, ':') !== false) {
            list($path, $keyPathStr) = explode(':', $path, 2);
            $keyPath = explode('.', $keyPathStr);
        }

        // Split remaining path by '/'
        $segments = explode('/', $path);
        $modelName = array_shift($segments); // First part is always the model name
        // REMOVE operation determination here, module will infer from method call
        // $operation = 'all'; // Default operation
        $parameters = [];
        $determinedOperation = 'all'; // Keep track locally for parameter building

        // Determine parameters from segments
        if (!empty($segments)) {
            $potentialOperationSegment = strtolower($segments[0]);
            switch ($potentialOperationSegment) {
                case 'find':
                    if (isset($segments[1])) {
                        $determinedOperation = 'find';
                        $parameters['id'] = $segments[1];
                    } else {
                        Log::warning('Model path parsing: "find" segment specified without ID.', ['path' => $path]);
                    }
                    break;
                case 'where':
                    $determinedOperation = 'where';
                    $parameters['where'] = [];
                    for ($i = 1; $i < count($segments); $i += 2) {
                        if (isset($segments[$i + 1])) {
                            $parameters['where'][$segments[$i]] = $segments[$i + 1];
                        } else {
                            Log::warning('Model path parsing: "where" segment has odd number of sub-segments.', ['path' => $path]);
                        }
                    }
                    if (empty($parameters['where'])) {
                        Log::warning('Model path parsing: "where" segment specified but no conditions found.', ['path' => $path]);
                        $determinedOperation = 'all'; // Revert if 'where' is invalid
                    }
                    break;
                case 'count':
                    $determinedOperation = 'count';
                    $parameters['operation'] = 'count'; // Set operation parameter specifically for count
                    Log::debug('[Parser::processModel] COUNT detected', ['path' => $path, 'parameters_set' => $parameters]); // ++ LOGGING ++
                    // Handle where clauses after count: e.g., /count/where/col/val
                    if (isset($segments[1]) && strtolower($segments[1]) === 'where') {
                        $parameters['where'] = [];
                        for ($i = 2; $i < count($segments); $i += 2) {
                            if (isset($segments[$i + 1])) {
                                $parameters['where'][$segments[$i]] = $segments[$i + 1];
                            }
                        }
                    }
                    break;
                default:
                    // Assume ID for find shorthand
                    if (count($segments) === 1 && is_numeric($potentialOperationSegment)) {
                        $determinedOperation = 'find';
                        $parameters['id'] = $potentialOperationSegment;
                    } else {
                        Log::warning('Model path parsing: Unknown segment or invalid format after model name.', ['path' => $path, 'segment' => $potentialOperationSegment]);
                    }
                    break;
            }
        }

        // Determine label (still useful)
        $label = $modelName;
        if ($determinedOperation === 'find' && isset($parameters['id'])) {
            $label = $parameters['id'];
        } elseif ($determinedOperation === 'where' && !empty($parameters['where'])) {
            $label = http_build_query(['where' => $parameters['where']]);
        }
        if ($keyPathStr) {
            $label .= ':' . $keyPathStr;
        }

        // Ensure 'operation' parameter is set ONLY for count, REMOVED general setting
        // if ($determinedOperation === 'count') { // Already set inside the switch case
        //    $parameters['operation'] = 'count';
        // }

        $result = [
            'moduleName' => 'Model',
            'storagePath' => $modelName,
            'keyPath' => $keyPath,
            'label' => $label,
            // 'operation' => $operation, // REMOVED
            'parameters' => $parameters,
            'pathName' => 'model!' . $originalPathForReconstruction, // Use original path for reconstruction
        ];

        Log::debug('Model processed (new path logic, no operation key)', ['result' => $result]);
        return $result;
    }

    public static function processDir($path): array
    {
        $parts = explode(':', $path, 2);
        $dirPart = $parts[0];
        $dirParts = explode('!', $dirPart, 2);
        $dirPath = $dirParts[1];

        $keys = isset($parts[1]) ? explode('.', $parts[1]) : [];

        return self::processPath([
            'storagePath' => $dirPath,
            'keyPath' => $keys,
            'pathName' => "directory!$dirPath",
            'moduleName' => 'Directory',
            'label' => $keys ? end($keys) : basename($dirPath)
        ]);
    }

    public static function processPath(array $path): array
    {
        return [
            'storagePath' => $path['storagePath'] ?? '',
            'keyPath' => $path['keyPath'] ?? [],
            'pathName' => $path['pathName'] ?? '',
            'moduleName' => $path['moduleName'] ?? '',
            'parameters' => $path['parameters'] ?? [],
            'filePath' => $path['filePath'] ?? null,
            'label' => $path['label'] ?? ''
        ];
    }

    private static function processBuffer($path): array
    {
        $parts = explode(':', $path, 2);
        $bufferName = $parts[0];
        $keys = isset($parts[1]) ? explode('.', $parts[1]) : [];
        return self::processPath([
            'storagePath' => $bufferName,
            'keyPath' => $keys,
            'pathName' => "buffer!$bufferName",
            'moduleName' => 'Buffer',
            'label' => $keys ? end($keys) : $bufferName
        ]);
    }

    private static function processSession($path): array
    {
        $keys = [];
        $pathPart = '';

        // Extract the part after session: or session!
        if (strpos($path, '!') !== false) {
            $pathPart = substr($path, strpos($path, '!') + 1);
        } elseif (strpos($path, ':') !== false) {
            $pathPart = substr($path, strpos($path, ':') + 1);
        }

        // The entire part becomes the key path
        if (!empty($pathPart)) {
            $keys = explode('.', $pathPart);
        }

        return self::processPath([
            'storagePath' => 'session', // storagePath is always 'session'
            'keyPath' => $keys, // The full path after : or !
            'pathName' => 'session', // pathName is always 'session' for the module instance
            'moduleName' => 'Session',
            'label' => !empty($keys) ? end($keys) : 'session' // Label is last part or 'session'
        ]);
    }

    public static function processFile($path, $default = false, $diskName = 'ai')
    {
        if (self::$allowDebug)
            \Log::debug('[StoragePathParser::processFile] Start', ['path' => $path, 'diskName' => $diskName]);

        $originalPath = $path;
        $keyPath = [];
        $label = null;
        $parameters = [];

        // Remove the 'file!' prefix if present
        if (strpos($path, 'file!') === 0) {
            $path = substr($path, 5);
        }

        // Separate keys from the storage path
        if (strpos($path, ':') !== false) {
            [$storagePath, $keyString] = explode(':', $path, 2);
            $keyPath = explode('.', $keyString);
            $label = end($keyPath);
        } else {
            $storagePath = $path;
            // Use filename as label if no keys specified
            $pathParts = explode('/', $storagePath);
            $label = end($pathParts);
        }

        // Use Storage facade to get the correct absolute path for the disk
        try {
            // Ensure storagePath doesn't have leading/trailing slashes that might interfere
            $trimmedStoragePath = trim($storagePath, '/');
            // Get the disk's root path and combine
            // $filePath = \Illuminate\Support\Facades\Storage::disk($diskName)->path($trimmedStoragePath . '.json'); // OLD approach

            // Robust way: Get disk instance, then build path relative to its root
            $disk = Storage::disk($diskName);
            $filePath = $disk->path($trimmedStoragePath . '.json');

        } catch (InvalidArgumentException $e) {
            Log::error("[StoragePathParser::processFile] Disk '{$diskName}' not configured.", ['exception' => $e->getMessage()]);
            throw new InvalidArgumentException("Disk [{$diskName}] not configured during file path processing.", 0, $e);
        }

        if (self::$allowDebug) {
            \Log::debug('[StoragePathParser::processFile] Processed file path', [
                'original' => $originalPath,
                'diskName' => $diskName,
                'storagePath' => $storagePath,
                'keyPath' => $keyPath,
                'label' => $label,
                'filePath' => $filePath
            ]);
        }

        return [
            'storagePath' => $storagePath,
            'keyPath' => $keyPath,
            'pathName' => 'file!' . $storagePath,
            'moduleName' => 'File',
            'label' => $label,
            'parameters' => $parameters,
            'filePath' => $filePath
        ];
    }

    public static function isPath($path): bool
    {
        if (!is_string($path)) return false;

        $patterns = [
            '/^[a-zA-Z0-9\/._-]+(:[a-zA-Z0-9._-]+)?$/',
            '/^[a-zA-Z0-9_-]+:[a-zA-Z0-9._-]+$/',
            '/^[a-zA-Z0-9\/._-]+:[a-zA-Z0-9._-]+-$/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $path)) {
                return true;
            }
        }

        return false;
    }

    private static function validateFunc($path): bool
    {
        return is_string($path) && !empty($path);
    }

    private static function getPathType($path)
    {
        if (self::isMysql($path)) return 'mysql';
        if (self::isModel($path)) return 'model';
        if (self::isDir($path)) return 'dir';
        if (self::isFile($path)) return 'file';
        if (self::isBuffer($path)) return 'buffer';
        if (self::isSession($path)) return 'session';
        return 'unknown';
    }

    public static function isDir($path): bool
    {
        // Support both 'dir!' and 'directory!' prefixes, and allow more special characters (@)
        return preg_match('/^(dir|directory)!([a-zA-Z0-9\/\.\-\_\@]*)(:[a-zA-Z0-9\.\-\_]+)?$/', $path);
    }

    public static function isFile($path): bool
    {
        return strpos($path, 'file!') === 0 || (strpos($path, '/') !== false && strpos($path, '!') === false && strpos($path, ':') === false);
    }

    public static function isBuffer($path): bool
    {
        return preg_match('/^(buffer|output|input|args|props)([:!][a-zA-Z0-9_-]+)?([\.:][a-zA-Z0-9._-]+)?$/', $path);
    }

    public static function isSession($path): bool
    {
        return preg_match('/^session([:!][a-zA-Z0-9_-]+)?([\.:][a-zA-Z0-9._-]+)?$/', $path);
    }
}
