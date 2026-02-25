<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * @deprecated Эта служба устарела и должна быть заменена функциональностью из libs/search-indexer.
 *               Подлежит рефакторингу или удалению.
 */
class SearchService
{
    /**
     * Cache TTL in seconds
     */
    private const CACHE_TTL = 3600; // 1 hour

    /**
     * Minimum word length for fuzzy search
     */
    private const MIN_WORD_LENGTH = 3;

    /**
     * Maximum Levenshtein distance for fuzzy search
     */
    private const MAX_LEVENSHTEIN_DISTANCE = 2;

    /**
     * Index a document for search
     *
     * @param array $document
     * @return bool
     */
    public function indexDocument(array $document): bool
    {
        try {
            DB::table('search_index')->insert([
                'document_id' => $document['id'],
                'title' => $document['title'] ?? '',
                'content' => $document['content'] ?? '',
                'metadata' => json_encode($document['metadata'] ?? []),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Clear search cache after indexing
            $this->clearSearchCache();

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to index document: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Search for documents
     *
     * @param string $query
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @param string $sortBy
     * @param string $sortDirection
     * @param bool $useFuzzy
     * @return array
     */
    public function search(
        string $query,
        array $filters = [],
        int $page = 1,
        int $perPage = 15,
        string $sortBy = 'relevance',
        string $sortDirection = 'desc',
        bool $useFuzzy = false
    ): array {
        $cacheKey = $this->generateCacheKey($query, $filters, $page, $perPage, $sortBy, $sortDirection, $useFuzzy);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use (
            $query,
            $filters,
            $page,
            $perPage,
            $sortBy,
            $sortDirection,
            $useFuzzy
        ) {
            try {
                $searchQuery = DB::table('search_index')
                    ->select([
                        'id',
                        'document_id',
                        'title',
                        'content',
                        'metadata',
                        'created_at',
                        'updated_at'
                    ]);

                // Split query into words and search for each
                $words = explode(' ', $query);
                $searchQuery->where(function ($query) use ($words) {
                    foreach ($words as $word) {
                        $query->orWhere(function ($q) use ($word) {
                            $q->where('title', 'LIKE', '%' . $word . '%')
                              ->orWhere('content', 'LIKE', '%' . $word . '%');
                        });
                    }
                });

                if ($useFuzzy) {
                    $this->applyFuzzySearch($searchQuery, $query);
                }

                // Apply filters if any
                foreach ($filters as $key => $value) {
                    $searchQuery->where("metadata->'{$key}'", $value);
                }

                // Apply sorting
                if ($sortBy === 'relevance') {
                    // For relevance sorting, we'll use a simple count of matches
                    $searchQuery->orderByRaw('
                        (LENGTH(title) - LENGTH(REPLACE(LOWER(title), LOWER(?), ""))) +
                        (LENGTH(content) - LENGTH(REPLACE(LOWER(content), LOWER(?), "")))
                        ' . $sortDirection,
                        [$query, $query]
                    );
                } else {
                    $searchQuery->orderBy($sortBy, $sortDirection);
                }

                // Get total count for pagination
                $total = $searchQuery->count();

                // Apply pagination
                $results = $searchQuery->skip(($page - 1) * $perPage)
                    ->take($perPage)
                    ->get();

                // Add highlighting to results
                $results = $this->addHighlighting($results, $query);

                // Create paginator
                $paginator = new LengthAwarePaginator(
                    $results,
                    $total,
                    $perPage,
                    $page,
                    ['path' => request()->url(), 'query' => request()->query()]
                );

                return [
                    'data' => $results,
                    'pagination' => [
                        'total' => $total,
                        'per_page' => $perPage,
                        'current_page' => $page,
                        'last_page' => $paginator->lastPage(),
                        'from' => $paginator->firstItem(),
                        'to' => $paginator->lastItem(),
                    ]
                ];
            } catch (\Exception $e) {
                Log::error('Search failed: ' . $e->getMessage());
                return [
                    'data' => [],
                    'pagination' => [
                        'total' => 0,
                        'per_page' => $perPage,
                        'current_page' => $page,
                        'last_page' => 0,
                        'from' => null,
                        'to' => null,
                    ]
                ];
            }
        });
    }

    /**
     * Remove a document from the search index
     *
     * @param int $documentId
     * @return bool
     */
    public function removeFromIndex(int $documentId): bool
    {
        try {
            DB::table('search_index')
                ->where('document_id', $documentId)
                ->delete();

            // Clear search cache after removal
            $this->clearSearchCache();

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to remove document from index: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Apply fuzzy search to the query
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param string $searchTerm
     */
    private function applyFuzzySearch($query, string $searchTerm): void
    {
        $words = explode(' ', $searchTerm);
        $conditions = [];

        foreach ($words as $word) {
            if (strlen($word) >= self::MIN_WORD_LENGTH) {
                $conditions[] = "(
                    LOWER(title) LIKE LOWER(?) OR
                    LOWER(content) LIKE LOWER(?)
                )";
                $query->addBinding(['%' . $word . '%', '%' . $word . '%']);
            }
        }

        if (!empty($conditions)) {
            $query->whereRaw('(' . implode(' OR ', $conditions) . ')');
        }
    }

    /**
     * Add highlighting to search results
     *
     * @param \Illuminate\Support\Collection $results
     * @param string $query
     * @return \Illuminate\Support\Collection
     */
    private function addHighlighting($results, string $query): \Illuminate\Support\Collection
    {
        $words = explode(' ', $query);
        $highlightTag = '<mark>';

        return $results->map(function ($result) use ($words, $highlightTag) {
            $result->highlighted_title = $this->highlightText($result->title, $words, $highlightTag);
            $result->highlighted_content = $this->highlightText($result->content, $words, $highlightTag);
            return $result;
        });
    }

    /**
     * Highlight matching words in text
     *
     * @param string $text
     * @param array $words
     * @param string $highlightTag
     * @return string
     */
    private function highlightText(string $text, array $words, string $highlightTag): string
    {
        foreach ($words as $word) {
            if (strlen($word) >= self::MIN_WORD_LENGTH) {
                $pattern = '/\b(' . preg_quote($word, '/') . ')\b/i';
                $replacement = $highlightTag . '$1</mark>';
                $text = preg_replace($pattern, $replacement, $text);
            }
        }
        return $text;
    }

    /**
     * Generate cache key for search results
     *
     * @param string $query
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @param string $sortBy
     * @param string $sortDirection
     * @param bool $useFuzzy
     * @return string
     */
    private function generateCacheKey(
        string $query,
        array $filters,
        int $page,
        int $perPage,
        string $sortBy,
        string $sortDirection,
        bool $useFuzzy
    ): string {
        return 'search_' . md5(json_encode([
            'query' => $query,
            'filters' => $filters,
            'page' => $page,
            'per_page' => $perPage,
            'sort_by' => $sortBy,
            'sort_direction' => $sortDirection,
            'use_fuzzy' => $useFuzzy
        ]));
    }

    /**
     * Clear all search cache
     */
    private function clearSearchCache(): void
    {
        Cache::tags(['search'])->flush();
    }
} 