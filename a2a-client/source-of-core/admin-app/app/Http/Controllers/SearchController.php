<?php

namespace App\Http\Controllers;

use App\Services\SearchService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * @deprecated Этот контроллер устарел и должен быть переработан для использования функциональности из libs/search-indexer.
 */
class SearchController extends Controller
{
    // Удалена зависимость от SearchService, так как он устарел.
    // Функциональность поиска будет перенесена на libs/search-indexer.
    public function __construct()
    {
        // Конструктор теперь пуст. Поиск будет реализован через новую библиотеку.
    }

    /**
     * Search for documents
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function search(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'query' => 'required|string|min:1',
                'filters' => 'nullable|array',
                'filters.*' => 'string',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'sort_by' => 'nullable|string|in:relevance,created_at,updated_at,title',
                'sort_direction' => 'nullable|string|in:asc,desc',
                'use_fuzzy' => 'nullable|boolean'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            if ($e->errors()['query'][0] === 'The query field is required.') {
                return response()->json([
                    'error' => 'Search query is required'
                ], 400);
            }
            if (isset($e->errors()['sort_by'])) {
                return response()->json([
                    'error' => 'Invalid sort field. Allowed fields: relevance, created_at, updated_at, title'
                ], 400);
            }
            throw $e;
        }

        $query = $validated['query'];
        $filters = $validated['filters'] ?? [];
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 15);
        $sortBy = $validated['sort_by'] ?? 'relevance';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $useFuzzy = (bool) ($validated['use_fuzzy'] ?? false);

        $results = $this->indexer->search(
            $query,
            $filters,
            $page,
            $perPage,
            $sortBy,
            $sortDirection,
            $useFuzzy
        );

        return response()->json($results);
    }

    /**
     * Index a new document
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $document = $request->validate([
            'id' => 'required|integer',
            'title' => 'required|string',
            'content' => 'required|string',
            'metadata' => 'nullable|array'
        ]);

        $success = $this->indexer->indexDocument($document);

        if (!$success) {
            return response()->json([
                'error' => 'Failed to index document'
            ], 500);
        }

        return response()->json([
            'message' => 'Document indexed successfully'
        ]);
    }

    /**
     * Bulk index documents
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkIndex(Request $request): JsonResponse
    {
        $request->validate([
            'documents' => 'required|array',
            'documents.*.id' => 'required|integer',
            'documents.*.title' => 'required|string',
            'documents.*.content' => 'required|string',
            'documents.*.metadata' => 'nullable|array',
            'batch_size' => 'nullable|integer|min:1|max:1000'
        ]);

        $batchSize = $request->input('batch_size', 100);
        $success = $this->indexer->bulkIndex($request->input('documents'), $batchSize);

        if (!$success) {
            return response()->json([
                'error' => 'Failed to bulk index documents'
            ], 500);
        }

        return response()->json([
            'message' => 'Documents indexed successfully'
        ]);
    }

    /**
     * Remove a document from the index
     *
     * @param int $documentId
     * @return JsonResponse
     */
    public function remove(int $documentId): JsonResponse
    {
        $success = $this->indexer->removeFromIndex($documentId);

        if (!$success) {
            return response()->json([
                'error' => 'Failed to remove document from index'
            ], 500);
        }

        return response()->json([
            'message' => 'Document removed from index successfully'
        ]);
    }

    /**
     * Get information about the current search algorithm
     */
    public function getAlgorithmInfo(): JsonResponse
    {
        try {
            $info = $this->indexer->getAlgorithmInfo();
            
            return response()->json([
                'success' => true,
                'algorithm' => $info
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get algorithm info: ' . $e->getMessage()
            ], 500);
        }
    }
} 