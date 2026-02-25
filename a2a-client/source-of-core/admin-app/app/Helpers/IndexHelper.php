<?php

namespace App\Helpers;

use Illuminate\Support\Facades\File;

class IndexHelper
{
    /**
     * Resolve index files based on configuration, include and exclude group filters.
     *
     * @param array $configObject Configuration array loaded from JSON.
     * @param array $includeGroups List of group names to include.
     * @param array $excludeGroups List of group names to exclude.
     * @return array Array of resolved index file info (name, path, relativePath, baseIndexDirectoryRelative).
     */
    public static function resolveIndexFiles(array $configObject, array $includeGroups = [], array $excludeGroups = []): array
    {
        $resolved = [];

        if (!isset($configObject['indexingWorkflow']) || !is_array($configObject['indexingWorkflow'])) {
            return $resolved;
        }

        $workflow = $configObject['indexingWorkflow'];
        $scanGroups = $workflow['scanGroups'] ?? [];
        $definedGroups = $workflow['groups'] ?? [];

        // Expand include groups
        $expandedInclude = [];
        foreach ($includeGroups as $grp) {
            $clean = trim($grp, '"\\');
            if (isset($definedGroups[$clean])) {
                $groupVal = $definedGroups[$clean];
                if (is_array($groupVal)) {
                    foreach ($groupVal as $name) {
                        $expandedInclude[] = trim($name, '"\\');
                    }
                } else {
                    $expandedInclude[] = trim($groupVal, '"\\');
                }
            } else {
                $expandedInclude[] = $clean;
            }
        }

        // Expand exclude groups
        $expandedExclude = [];
        foreach ($excludeGroups as $grp) {
            $clean = trim($grp, '"\\');
            if (isset($definedGroups[$clean])) {
                $groupVal = $definedGroups[$clean];
                if (is_array($groupVal)) {
                    foreach ($groupVal as $name) {
                        $expandedExclude[] = trim($name, '"\\');
                    }
                } else {
                    $expandedExclude[] = trim($groupVal, '"\\');
                }
            } else {
                $expandedExclude[] = $clean;
            }
        }

        foreach ($scanGroups as $group) {
            $groupName = $group['name'] ?? null;
            if (!$groupName) {
                continue;
            }
            // Filter include/exclude
            if (count($expandedInclude) > 0 && !in_array($groupName, $expandedInclude, true)) {
                continue;
            }
            if (count($expandedExclude) > 0 && in_array($groupName, $expandedExclude, true)) {
                continue;
            }

            $indexFileConfig = $group['indexFile'] ?? null;
            if (!$indexFileConfig || !is_string($indexFileConfig)) {
                continue;
            }

            // Remove .json extension
            $baseDir = preg_replace('/\.json$/', '', $indexFileConfig);
            // Absolute path from project root
            $absDir = base_path($baseDir);

            if (File::exists($absDir) && File::isDirectory($absDir)) {
                $files = File::allFiles($absDir);
                foreach ($files as $file) {
                    $filename = $file->getFilename();
                    if (preg_match('/\.index\.json$/', $filename)) {
                        $fullPath = $file->getRealPath();
                        $resolved[] = [
                            'name' => $groupName . '/' . $filename,
                            'path' => $fullPath,
                            'relativePath' => ltrim(str_replace(base_path(), '', $fullPath), '/\\'),
                            'baseIndexDirectoryRelative' => $baseDir,
                        ];
                    }
                }
            }
        }

        return $resolved;
    }

    /**
     * Search entries across resolved index files for a query.
     *
     * @param array $resolvedIndexFiles Array of index file info as returned by resolveIndexFiles.
     * @param string $query Search query string.
     * @param array $searchFields Fields of each entry to search in.
     * @param bool $caseSensitive Whether search is case-sensitive.
     * @return array Matched entries.
     */
    public static function searchIndexFiles(array $resolvedIndexFiles, string $query, array $searchFields = [], bool $caseSensitive = false): array
    {
        $allMatches = [];

        foreach ($resolvedIndexFiles as $fileInfo) {
            $data = JsonHelper::loadFileWithComments($fileInfo['path']);
            if (isset($data['entries']) && is_array($data['entries'])) {
                foreach ($data['entries'] as $entry) {
                    if (self::matchesQuery($entry, $query, $searchFields, $caseSensitive)) {
                        $allMatches[] = $entry;
                    }
                }
            }
        }

        return $allMatches;
    }

    /**
     * Determine if an entry matches the search query.
     *
     * @param array $entry Single index entry data.
     * @param string $query Query string.
     * @param array $searchFields Fields to consider in the entry.
     * @param bool $caseSensitive Whether the search is case-sensitive.
     * @return bool True if any field contains the query.
     */
    private static function matchesQuery(array $entry, string $query, array $searchFields, bool $caseSensitive): bool
    {
        foreach ($searchFields as $field) {
            if (!array_key_exists($field, $entry)) {
                continue;
            }
            $value = $entry[$field];
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } else {
                $value = (string) $value;
            }

            if ($caseSensitive) {
                if (strpos($value, $query) !== false) {
                    return true;
                }
            } else {
                if (stripos($value, $query) !== false) {
                    return true;
                }
            }
        }

        return false;
    }
} 