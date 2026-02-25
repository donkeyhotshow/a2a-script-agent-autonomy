<?php

declare(strict_types=1);

namespace App\Search;

class BM25Searcher extends AbstractSearchAlgorithm
{
    private array $documentLengths = [];
    private array $termFrequencies = [];
    private array $inverseDocumentFrequencies = [];
    private float $k1;
    private float $b;
    private float $avgDocLength;

    public function __construct(array $config = [])
    {
        parent::__construct($config);
        $this->k1 = $config['k1'] ?? 1.5;
        $this->b = $config['b'] ?? 0.75;
    }

    public function getName(): string
    {
        return 'bm25';
    }

    public function getDescription(): string
    {
        return 'BM25 ranking function based search algorithm';
    }

    public function indexDocuments(array $documents): void
    {
        $this->validateDocuments($documents);
        $this->documents = $documents;

        // Вычисляем длины документов
        foreach ($documents as $path => $content) {
            $words = $this->preprocessDocument($content);
            $this->documentLengths[$path] = count($words);
        }

        // Вычисляем среднюю длину документа
        $this->avgDocLength = array_sum($this->documentLengths) / count($this->documentLengths);

        // Вычисляем частоты терминов
        foreach ($documents as $path => $content) {
            $words = $this->preprocessDocument($content);
            $this->termFrequencies[$path] = array_count_values($words);
        }

        // Вычисляем обратные частоты документов
        $documentCount = count($documents);
        $termDocumentCounts = [];

        foreach ($this->termFrequencies as $frequencies) {
            foreach ($frequencies as $term => $count) {
                if (!isset($termDocumentCounts[$term])) {
                    $termDocumentCounts[$term] = 0;
                }
                $termDocumentCounts[$term]++;
            }
        }

        foreach ($termDocumentCounts as $term => $count) {
            $this->inverseDocumentFrequencies[$term] = log(
                ($documentCount - $count + 0.5) / ($count + 0.5) + 1
            );
        }

        $this->isIndexed = true;
        $this->logIndexing(count($documents));
    }

    public function search(string $query, int $limit = 5): array
    {
        $this->validateIndexed();
        $this->validateQuery($query);
        $this->validateLimit($limit);

        $queryTerms = $this->preprocessDocument($query);
        $scores = [];

        foreach ($this->documents as $path => $content) {
            $score = $this->calculateBM25Score($queryTerms, $path);
            if ($score > 0) {
                $scores[$path] = $score;
            }
        }

        arsort($scores);
        $results = array_slice($scores, 0, $limit, true);

        $searchResults = [];
        foreach ($results as $path => $relevance) {
            $content = $this->documents[$path];
            $matches = $this->findMatches($query, $content);
            $tags = $this->extractTags($content);

            $searchResults[] = [
                'path' => $path,
                'relevance' => $relevance,
                'matches' => $matches,
                'tags' => $tags
            ];
        }

        $this->logSearch($query, array_keys($results));
        return $searchResults;
    }

    public function saveModel(string $path): void
    {
        $this->validatePath($path);
        $this->logModelOperation('saving', $path);

        $data = [
            'documents' => $this->documents,
            'document_lengths' => $this->documentLengths,
            'term_frequencies' => $this->termFrequencies,
            'idf' => $this->inverseDocumentFrequencies,
            'avg_doc_length' => $this->avgDocLength,
            'parameters' => $this->parameters,
            'k1' => $this->k1,
            'b' => $this->b
        ];

        if (!file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT))) {
            throw new \RuntimeException("Failed to save model to: $path");
        }
    }

    public function loadModel(string $path): void
    {
        $data = json_decode(file_get_contents($path), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Failed to load BM25 model');
        }

        $this->documents = $data['documents'] ?? [];
        $this->documentLengths = $data['document_lengths'] ?? [];
        $this->termFrequencies = $data['term_frequencies'] ?? [];
        $this->inverseDocumentFrequencies = $data['idf'] ?? [];
        $this->avgDocLength = $data['avg_doc_length'] ?? 0;
        $this->parameters = $data['parameters'] ?? [];
        $this->k1 = $data['k1'] ?? 1.5;
        $this->b = $data['b'] ?? 0.75;
        $this->isIndexed = true;
    }

    private function calculateBM25Score(array $queryTerms, string $docPath): float
    {
        $score = 0;
        $docLength = $this->documentLengths[$docPath] ?? 0;

        foreach ($queryTerms as $term) {
            if (!isset($this->termFrequencies[$docPath][$term])) {
                continue;
            }

            $tf = $this->termFrequencies[$docPath][$term];
            $idf = $this->inverseDocumentFrequencies[$term] ?? 0;

            // BM25 формула
            $numerator = $tf * ($this->k1 + 1);
            $denominator = $tf + $this->k1 * (1 - $this->b + $this->b * ($docLength / $this->avgDocLength));
            
            $score += $idf * ($numerator / $denominator);
        }

        return $score;
    }

    protected function findMatches(string $query, string $content): array
    {
        $matches = [];
        $queryWords = $this->preprocessDocument($query);
        $contentLines = explode("\n", $content);

        foreach ($contentLines as $line) {
            foreach ($queryWords as $word) {
                if (is_string($word) && stripos($line, $word) !== false) {
                    // Записываем использование ключевого слова
                    $this->keywordRating->recordUsage($word, true);
                    
                    $matches[] = [
                        'field' => 'content',
                        'value' => trim($line),
                        'context' => $this->getContext($line, $contentLines)
                    ];
                }
            }
        }

        return array_slice($matches, 0, 3); // Ограничиваем количество совпадений
    }
} 