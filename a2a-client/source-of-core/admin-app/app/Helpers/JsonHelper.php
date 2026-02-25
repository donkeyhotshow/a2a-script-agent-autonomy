<?php

namespace App\Helpers;

use Exception;
use Illuminate\Support\Facades\File;

class JsonHelper
{
    /**
     * Extract file paths from section data (typically decoded JSON).
     *
     * @param mixed $sectionData The data (usually an array) to extract paths from.
     * @return array An array containing 'files' and 'errors'.
     */
    public static function extractFilePaths($sectionData): array
    {
        $result = [
            'files' => [],
            'errors' => []
        ];

        if (!is_array($sectionData)) {
            return $result;
        }

        if (ArrayHelper::isList($sectionData)) {
            $allStrings = true;
            foreach ($sectionData as $item) {
                if (!is_string($item)) {
                    $allStrings = false;
                    break;
                }
            }
            if ($allStrings) {
                $result['files'] = $sectionData;
                return $result;
            }
        }

        $extractPathsRecursive = function ($data, $pathPrefix = []) use (&$extractPathsRecursive, &$result) {
            if (!is_array($data)) {
                $path = implode('/', $pathPrefix);
                $result['errors'][] = "Некорректный формат для пути '{$path}'. Ожидается массив, получено " . gettype($data);
                return;
            }

            foreach ($data as $key => $value) {
                $currentPathPrefix = is_numeric($key) && !empty($pathPrefix) ? $pathPrefix : array_merge($pathPrefix, [$key]);
                
                if (is_array($value)) {
                    if (ArrayHelper::isList($value)) {
                        foreach ($value as $filePath) {
                            if (is_string($filePath)) {
                                $fullPath = implode('/', array_filter($pathPrefix)) . '/' . $filePath;
                                $result['files'][] = trim($fullPath, '/');
                            } else {
                                $pathString = implode('/', $pathPrefix);
                                $result['errors'][] = "Некорректный файловый путь в '{$pathString}'. Ожидается строка, получено " . gettype($filePath);
                            }
                        }
                    } else {
                        $extractPathsRecursive($value, $currentPathPrefix);
                    }
                } else if (is_string($value)) {
                    $keyPathForFile = $pathPrefix;
                    if(!is_numeric($key)){
                        $keyPathForFile = $currentPathPrefix;
                    }
                    $fullPath = implode('/', array_filter($keyPathForFile)) . '/' . $value;
                    $result['files'][] = trim($fullPath, '/');
                } else {
                    $pathString = implode('/', $currentPathPrefix);
                    $result['errors'][] = "Некорректное значение в '{$pathString}'. Ожидается строка или массив, получено " . gettype($value);
                }
            }
        };

        $extractPathsRecursive($sectionData, []);
        return $result;
    }

    /**
     * Encode data to JSON string.
     *
     * @param mixed $data Data to encode.
     * @param int $options JSON encoding options.
     * @return string JSON string.
     */
    public static function encode($data, int $options = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE): string
    {
        return json_encode($data, $options);
    }

    /**
     * Decode JSON string to array.
     *
     * @param string $json JSON string to decode.
     * @return array Decoded data.
     * @throws Exception If JSON is invalid.
     */
    public static function decode(string $json): array
    {
        try {
            return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new Exception("Failed to decode JSON: " . $e->getMessage());
        }
    }

    /**
     * Load and decode JSON from a file.
     *
     * @param string $path Path to the JSON file.
     * @return array Decoded data.
     * @throws Exception If file not found or JSON invalid.
     */
    public static function loadFile(string $path): array
    {
        if (!file_exists($path)) {
            throw new Exception("JSON file not found: {$path}");
        }

        $content = file_get_contents($path);
        if ($content === false) {
            throw new Exception("Failed to read JSON file: {$path}");
        }

        try {
            return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new Exception("Failed to decode JSON from {$path}: " . $e->getMessage());
        }
    }

    /**
     * Load and decode JSON from a file, ignoring comments.
     *
     * @param string $path Path to the JSON file.
     * @return array Decoded data.
     * @throws Exception If file not found or JSON invalid.
     */
    public static function loadFileInstructions(string $path): array
    {
        if (!file_exists($path)) {
            throw new Exception("JSON file not found: {$path}");
        }

        $content = file_get_contents($path);
        if ($content === false) {
            throw new Exception("Failed to read JSON file: {$path}");
        }

        // Remove comments
        $content = preg_replace('!/\*.*?\*/!s', '', $content);
        $content = preg_replace('/\n\s*\/\/[^\n]*/', '', $content);

        try {
            return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new Exception("Failed to decode JSON from {$path}: " . $e->getMessage());
        }
    }

    /**
     * Save data as JSON to a file.
     *
     * @param string $path Path to save the JSON file.
     * @param mixed $data Data to save.
     * @param int $options JSON encoding options.
     * @return bool True on success, false on failure.
     */
    public static function saveFile(string $path, $data, int $options = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE): bool
    {
        $directory = dirname($path);
        if (!file_exists($directory)) {
            if (!mkdir($directory, 0775, true)) {
                return false;
            }
        }

        $json = self::encode($data, $options);
        return file_put_contents($path, $json) !== false;
    }

    /**
     * Check if a string is valid JSON.
     *
     * @param string $json String to check.
     * @return bool True if valid JSON, false otherwise.
     */
    public static function isValid(string $json): bool
    {
        try {
            json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            return true;
        } catch (\JsonException $e) {
            return false;
        }
    }

    /**
     * Get JSON error message.
     *
     * @param int $errorCode JSON error code.
     * @return string Error message.
     */
    public static function getErrorMessage(int $errorCode): string
    {
        switch ($errorCode) {
            case JSON_ERROR_DEPTH:
                return 'Maximum stack depth exceeded';
            case JSON_ERROR_STATE_MISMATCH:
                return 'Underflow or the modes mismatch';
            case JSON_ERROR_CTRL_CHAR:
                return 'Unexpected control character found';
            case JSON_ERROR_SYNTAX:
                return 'Syntax error, malformed JSON';
            case JSON_ERROR_UTF8:
                return 'Malformed UTF-8 characters, possibly incorrectly encoded';
            case JSON_ERROR_RECURSION:
                return 'One or more recursive references in the value to be encoded';
            case JSON_ERROR_INF_OR_NAN:
                return 'One or more NAN or INF values in the value to be encoded';
            case JSON_ERROR_UNSUPPORTED_TYPE:
                return 'A value of a type that cannot be encoded was given';
            default:
                return 'Unknown error';
        }
    }

    /**
     * Merge two JSON objects/arrays.
     *
     * @param array $array1 First array.
     * @param array $array2 Second array.
     * @return array Merged array.
     */
    public static function merge(array $array1, array $array2): array
    {
        return ArrayHelper::mergeRecursiveOverwrite($array1, $array2);
    }

    /**
     * Get a value from a JSON object using dot notation.
     *
     * @param array $data JSON data.
     * @param string $path Dot notation path.
     * @param mixed $default Default value if path not found.
     * @return mixed Value at path or default.
     */
    public static function get(array $data, string $path, $default = null)
    {
        $keys = explode('.', $path);
        $current = $data;

        foreach ($keys as $key) {
            if (!is_array($current) || !array_key_exists($key, $current)) {
                return $default;
            }
            $current = $current[$key];
        }

        return $current;
    }

    /**
     * Set a value in a JSON object using dot notation.
     *
     * @param array $data JSON data.
     * @param string $path Dot notation path.
     * @param mixed $value Value to set.
     * @return array Modified data.
     */
    public static function set(array $data, string $path, $value): array
    {
        $keys = explode('.', $path);
        $current = &$data;

        foreach ($keys as $key) {
            if (!isset($current[$key]) || !is_array($current[$key])) {
                $current[$key] = [];
            }
            $current = &$current[$key];
        }

        $current = $value;
        return $data;
    }

    /**
     * Check if a path exists in a JSON object.
     *
     * @param array $data JSON data.
     * @param string $path Dot notation path.
     * @return bool True if path exists.
     */
    public static function has(array $data, string $path): bool
    {
        return self::get($data, $path, null) !== null;
    }

    /**
     * Remove a value from a JSON object using dot notation.
     *
     * @param array $data JSON data.
     * @param string $path Dot notation path.
     * @return array Modified data.
     */
    public static function remove(array $data, string $path): array
    {
        $keys = explode('.', $path);
        $current = &$data;

        foreach ($keys as $i => $key) {
            if (!isset($current[$key])) {
                return $data;
            }

            if ($i === count($keys) - 1) {
                unset($current[$key]);
            } else {
                $current = &$current[$key];
            }
        }

        return $data;
    }

    /**
     * Get all paths in a JSON object.
     *
     * @param array $data JSON data.
     * @param string $prefix Current path prefix.
     * @return array Array of paths.
     */
    public static function paths(array $data, string $prefix = ''): array
    {
        $paths = [];

        foreach ($data as $key => $value) {
            $currentPath = $prefix ? $prefix . '.' . $key : $key;
            $paths[] = $currentPath;

            if (is_array($value)) {
                $paths = array_merge($paths, self::paths($value, $currentPath));
            }
        }

        return $paths;
    }

    /**
     * Get all values in a JSON object.
     *
     * @param array $data JSON data.
     * @return array Array of values.
     */
    public static function values(array $data): array
    {
        $values = [];

        foreach ($data as $value) {
            if (is_array($value)) {
                $values = array_merge($values, self::values($value));
            } else {
                $values[] = $value;
            }
        }

        return $values;
    }

    /**
     * Get all keys in a JSON object.
     *
     * @param array $data JSON data.
     * @param string $prefix Current path prefix.
     * @return array Array of keys.
     */
    public static function keys(array $data, string $prefix = ''): array
    {
        $keys = [];

        foreach ($data as $key => $value) {
            $currentKey = $prefix ? $prefix . '.' . $key : $key;
            $keys[] = $currentKey;

            if (is_array($value)) {
                $keys = array_merge($keys, self::keys($value, $currentKey));
            }
        }

        return $keys;
    }

    /**
     * Filter a JSON object by a callback function.
     *
     * @param array $data JSON data.
     * @param callable $callback Callback function.
     * @return array Filtered data.
     */
    public static function filter(array $data, callable $callback): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $filtered = self::filter($value, $callback);
                if (!empty($filtered)) {
                    $result[$key] = $filtered;
                }
            } else if ($callback($value, $key)) {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Map a JSON object using a callback function.
     *
     * @param array $data JSON data.
     * @param callable $callback Callback function.
     * @return array Mapped data.
     */
    public static function map(array $data, callable $callback): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $result[$key] = self::map($value, $callback);
            } else {
                $result[$key] = $callback($value, $key);
            }
        }

        return $result;
    }

    /**
     * Reduce a JSON object using a callback function.
     *
     * @param array $data JSON data.
     * @param callable $callback Callback function.
     * @param mixed $initial Initial value.
     * @return mixed Reduced value.
     */
    public static function reduce(array $data, callable $callback, $initial = null)
    {
        $result = $initial;

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $result = self::reduce($value, $callback, $result);
            } else {
                $result = $callback($result, $value, $key);
            }
        }

        return $result;
    }

    /**
     * Sort a JSON object by keys.
     *
     * @param array $data JSON data.
     * @param bool $recursive Whether to sort recursively.
     * @return array Sorted data.
     */
    public static function sortKeys(array $data, bool $recursive = true): array
    {
        ksort($data);

        if ($recursive) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = self::sortKeys($value, true);
                }
            }
        }

        return $data;
    }

    /**
     * Sort a JSON object by values.
     *
     * @param array $data JSON data.
     * @param bool $recursive Whether to sort recursively.
     * @return array Sorted data.
     */
    public static function sortValues(array $data, bool $recursive = true): array
    {
        asort($data);

        if ($recursive) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = self::sortValues($value, true);
                }
            }
        }

        return $data;
    }

    /**
     * Flatten a JSON object into a single level.
     *
     * @param array $data JSON data.
     * @param string $prefix Current path prefix.
     * @return array Flattened data.
     */
    public static function flatten(array $data, string $prefix = ''): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            $currentKey = $prefix ? $prefix . '.' . $key : $key;

            if (is_array($value)) {
                $result = array_merge($result, self::flatten($value, $currentKey));
            } else {
                $result[$currentKey] = $value;
            }
        }

        return $result;
    }

    /**
     * Unflatten a JSON object from a single level.
     *
     * @param array $data Flattened data.
     * @return array Unflattened data.
     */
    public static function unflatten(array $data): array
    {
        $result = [];

        foreach ($data as $path => $value) {
            self::set($result, $path, $value);
        }

        return $result;
    }

    /**
     * Get the difference between two JSON objects.
     *
     * @param array $data1 First data.
     * @param array $data2 Second data.
     * @return array Difference data.
     */
    public static function diff(array $data1, array $data2): array
    {
        $result = [];

        foreach ($data1 as $key => $value) {
            if (!array_key_exists($key, $data2)) {
                $result[$key] = $value;
            } else if (is_array($value) && is_array($data2[$key])) {
                $diff = self::diff($value, $data2[$key]);
                if (!empty($diff)) {
                    $result[$key] = $diff;
                }
            } else if ($value !== $data2[$key]) {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Get the intersection of two JSON objects.
     *
     * @param array $data1 First data.
     * @param array $data2 Second data.
     * @return array Intersection data.
     */
    public static function intersect(array $data1, array $data2): array
    {
        $result = [];

        foreach ($data1 as $key => $value) {
            if (array_key_exists($key, $data2)) {
                if (is_array($value) && is_array($data2[$key])) {
                    $intersect = self::intersect($value, $data2[$key]);
                    if (!empty($intersect)) {
                        $result[$key] = $intersect;
                    }
                } else if ($value === $data2[$key]) {
                    $result[$key] = $value;
                }
            }
        }

        return $result;
    }

    /**
     * Get the union of two JSON objects.
     *
     * @param array $data1 First data.
     * @param array $data2 Second data.
     * @return array Union data.
     */
    public static function union(array $data1, array $data2): array
    {
        $result = $data1;

        foreach ($data2 as $key => $value) {
            if (array_key_exists($key, $result) && is_array($value) && is_array($result[$key])) {
                $result[$key] = self::union($result[$key], $value);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    public static function loadFileWithComments(string $filePath): ?array
    {
        if (!File::exists($filePath)) {
            // Use Laravel's logging or a simple echo for now
            echo "Error: File not found: ".$filePath."\n";
            return null;
        }

        try {
            $jsonContent = File::get($filePath);

            // Remove block comments /* ... */
            $jsonContent = preg_replace('/\/\*.*?\*\//ms', '', $jsonContent);
            // Remove single-line comments // ...
            $jsonContent = preg_replace('/\/\/.*?\n/', "\n", $jsonContent);

            // Decode JSON
            $jsonObject = json_decode($jsonContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                 // Use Laravel's logging or a simple echo for now
                echo "Error processing JSON file ".$filePath.": ".json_last_error_msg()."\n";
                return null;
            }

            return $jsonObject;

        } catch (\Exception $e) {
             // Use Laravel's logging or a simple echo for now
            echo "Error processing JSON file ".$filePath.": ".$e->getMessage()."\n";
            // echo $e->getTraceAsString() . "\n"; // Uncomment for detailed stack trace
            return null;
        }
    }
} 