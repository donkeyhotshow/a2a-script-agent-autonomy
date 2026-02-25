<?php

declare(strict_types=1);

namespace App\Search;

use Phpml\Math\Statistic\Mean;
use Phpml\Math\Statistic\StandardDeviation;

class Word2VecSearcher extends AbstractSearchAlgorithm
{
    private array $wordVectors = [];
    private array $documentVectors = [];
    private int $vectorSize;

    public function __construct(array $config = [])
    {
        parent::__construct($config);
        $this->vectorSize = $config['vector_size'] ?? 100;
    }

    public function getName(): string
    {
        return 'word2vec';
    }

    public function getDescription(): string
    {
        return 'Word2Vec based semantic search algorithm';
    }

    public function indexDocuments(array $documents): void
    {
        $this->validateDocuments($documents);
        $this->documents = $documents;

        // Генерируем случайные векторы для слов (в реальном приложении здесь будет обученная модель)
        $this->initializeWordVectors($documents);
        
        // Создаем векторы для документов
        foreach ($documents as $path => $content) {
            $this->documentVectors[$path] = $this->documentToVector($content);
        }

        $this->isIndexed = true;
        $this->logIndexing(count($documents));
    }

    public function search(string $query, int $limit = 5): array
    {
        $this->validateIndexed();
        $this->validateQuery($query);
        $this->validateLimit($limit);

        $queryVector = $this->documentToVector($query);
        $scores = [];

        foreach ($this->documentVectors as $path => $vector) {
            $similarity = $this->cosineSimilarity($queryVector, $vector);
            if ($similarity > 0) {
                $scores[$path] = $similarity;
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
            'wordVectors' => $this->wordVectors,
            'documentVectors' => $this->documentVectors,
            'parameters' => $this->parameters
        ];

        if (!file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT))) {
            throw new \RuntimeException("Failed to save model to: $path");
        }
    }

    public function loadModel(string $path): void
    {
        $data = json_decode(file_get_contents($path), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Failed to load Word2Vec model');
        }
        $this->documents = $data['documents'] ?? [];
        $this->wordVectors = $data['wordVectors'] ?? [];
        $this->documentVectors = $data['documentVectors'] ?? [];
        $this->parameters = $data['parameters'] ?? [];
        $this->isIndexed = true;
    }

    private function initializeWordVectors(array $documents): void
    {
        $words = [];
        foreach ($documents as $content) {
            $words = array_merge($words, $this->preprocessDocument($content));
        }
        $words = array_unique($words);

        foreach ($words as $word) {
            $this->wordVectors[$word] = $this->generateRandomVector();
        }
    }

    private function generateRandomVector(): array
    {
        $vector = [];
        for ($i = 0; $i < $this->vectorSize; $i++) {
            $vector[] = (mt_rand() / mt_getrandmax()) * 2 - 1; // Случайное число от -1 до 1
        }
        return $this->normalizeVector($vector);
    }

    private function documentToVector(string $document): array
    {
        $words = $this->preprocessDocument($document);
        if (empty($words)) {
            return array_fill(0, $this->vectorSize, 0);
        }

        $vector = array_fill(0, $this->vectorSize, 0);
        $count = 0;

        foreach ($words as $word) {
            if (isset($this->wordVectors[$word])) {
                for ($i = 0; $i < $this->vectorSize; $i++) {
                    $vector[$i] += $this->wordVectors[$word][$i];
                }
                $count++;
            }
        }

        if ($count > 0) {
            for ($i = 0; $i < $this->vectorSize; $i++) {
                $vector[$i] /= $count;
            }
        }

        return $this->normalizeVector($vector);
    }

    private function normalizeVector(array $vector): array
    {
        $norm = 0;
        foreach ($vector as $value) {
            $norm += $value * $value;
        }
        $norm = sqrt($norm);

        if ($norm > 0) {
            foreach ($vector as &$value) {
                $value /= $norm;
            }
        }

        return $vector;
    }

    private function cosineSimilarity(array $vec1, array $vec2): float
    {
        $dotProduct = 0;
        $norm1 = 0;
        $norm2 = 0;

        for ($i = 0; $i < $this->vectorSize; $i++) {
            $dotProduct += $vec1[$i] * $vec2[$i];
            $norm1 += $vec1[$i] * $vec1[$i];
            $norm2 += $vec2[$i] * $vec2[$i];
        }

        if ($norm1 == 0 || $norm2 == 0) {
            return 0;
        }

        return $dotProduct / (sqrt($norm1) * sqrt($norm2));
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