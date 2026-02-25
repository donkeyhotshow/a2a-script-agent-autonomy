<?php

namespace App\AiRudeDepot\Processors\DataProcessor\Php;

use Illuminate\Support\Facades\Log;

class WalkForAssetUrls
{
    /**
     * Recursively traverses the data structure and transforms relative asset URLs.
     *
     * @param mixed &$data The data structure (array or object) to process by reference.
     * @return void
     */
    public static function process(&$data): void
    {
        Log::debug("[AssetUrlProcessor] process() called. " . print_r($data, true));

        if (!is_array($data)) {
            // Not an array or object, nothing to process further down this branch
            return;
        }

        // Use array_walk_recursive if it's simpler, but manual recursion gives more control
        foreach ($data as $key => &$value) { // Process by reference
            if (is_array($value)) {
                // Check if this node represents an Image component BEFORE recursing
                if (self::isImageComponentNode($value)) {
                    Log::debug("[AssetUrlProcessor] Found Image node, attempting transform:", [$value]);
                    self::transformImageSrc($value); // Modify $value by reference
                    Log::debug("[AssetUrlProcessor] Image node after transform:", [$value]);
                }
                // Recurse into the sub-array/object
                self::process($value);
            } elseif (is_object($value)) {
                // If objects are possible, handle them similarly (convert to array or use object properties)
                // For simplicity, assuming primarily arrays based on JSON structure
                // If objects need handling: $tempArray = (array)$value; self::process($tempArray); $value = (object)$tempArray;
            }
        }
        // Ensure reference is released after loop
        unset($value);

        Log::debug("[AssetUrlProcessor] process() finished.");
    }

    /**
     * Checks if a node represents an Image component definition.
     *
     * @param array $node
     * @return bool
     */
    private static function isImageComponentNode(array $node): bool
    {
        return isset($node['type']) && $node['type'] === 'Image' && isset($node['props']['src']);
    }

    /**
     * Transforms the 'src' property within an Image component node if it's a relative path.
     *
     * @param array &$node The Image component node (passed by reference).
     * @return void
     */
    private static function transformImageSrc(array &$node): void
    {
        $originalSrc = $node['props']['src'] ?? null;
        if (empty($originalSrc)) {
            Log::debug("[AssetUrlProcessor] transformImageSrc: empty originalSrc.");
            return; // No src to transform
        }

        // Check if it's already an absolute URL or potentially transformed
        if (str_starts_with($originalSrc, '/') || str_starts_with($originalSrc, 'http')) {
            Log::debug("[AssetUrlProcessor] transformImageSrc: src already absolute/external: " . $originalSrc);
            return; // Assume it's already a valid URL
        }

        // Assume src is "moduleName/path/to/asset.jpg"
        $publicUrl = '/storage/assets/' . ltrim($originalSrc, '/');
        Log::debug("[AssetUrlProcessor] Transforming '{$originalSrc}' -> '{$publicUrl}'");
        $node['props']['src'] = $publicUrl;
    }
}
