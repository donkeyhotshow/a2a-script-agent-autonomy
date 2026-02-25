<?php

declare(strict_types=1);

namespace App\Search;

class FastTextSearcher extends AbstractSearchAlgorithm
{
    private array $wordVectors = [];
    private array $subwordVectors = [];
    private int $vectorSize;
    private int $minN;
    private int $maxN;

    public function __construct(array $config = [])
    {
        parent::__construct($config);
        $this->vectorSize = $config['vector_size'] ?? 100;
        $this->minN = $config['min_n'] ?? 3;
        $this->maxN = $config['max_n'] ?? 6;
    }

    public function loadModel(string $path): void
    {
        $data = json_decode(file_get_contents($path), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Failed to load FastText model');
        }
        $this->documents = $data['documents'] ?? [];
        $this->wordVectors = $data['word_vectors'] ?? [];
        $this->subwordVectors = $data['subword_vectors'] ?? [];
        $this->parameters = $data['parameters'] ?? [];
        $this->isIndexed = true;
    }

    protected function searchImplementation(string $query, int $limit): array
    {
        $queryVector = $this->getQueryVector($query);
        $results = [];

        foreach ($this->documents as $path => $content) {
            $docVector = $this->getDocumentVector($content);
            $similarity = $this->cosineSimilarity($queryVector, $docVector);
            
            if ($similarity > 0) {
                $results[] = [
                    'path' => $path,
                    'relevance' => $similarity,
                    'matches' => $this->findMatches($query, $content)
                ];
            }
        }

        usort($results, fn($a, $b) => $b['relevance'] <=> $a['relevance']);
        return array_slice($results, 0, $limit);
    }

    private function getQueryVector(string $query): array
    {
        $words = $this->preprocessDocument($query);
        return $this->averageVectors($words);
    }

    private function getDocumentVector(string $content): array
    {
        $words = $this->preprocessDocument($content);
        return $this->averageVectors($words);
    }

    private function averageVectors(array $words): array
    {
        $vector = array_fill(0, $this->vectorSize, 0);
        $count = 0;

        foreach ($words as $word) {
            $wordVector = $this->getWordVector($word);
            for ($i = 0; $i < $this->vectorSize; $i++) {
                $vector[$i] += $wordVector[$i];
            }
            $count++;
        }

        if ($count > 0) {
            for ($i = 0; $i < $this->vectorSize; $i++) {
                $vector[$i] /= $count;
            }
        }

        return $vector;
    }

    private function getWordVector(string $word): array
    {
        if (isset($this->wordVectors[$word])) {
            return $this->wordVectors[$word];
        }

        // Если слова нет в словаре, используем подстроки
        $subwords = $this->getSubwords($word);
        $vector = array_fill(0, $this->vectorSize, 0);
        $count = 0;

        foreach ($subwords as $subword) {
            if (isset($this->subwordVectors[$subword])) {
                for ($i = 0; $i < $this->vectorSize; $i++) {
                    $vector[$i] += $this->subwordVectors[$subword][$i];
                }
                $count++;
            }
        }

        if ($count > 0) {
            for ($i = 0; $i < $this->vectorSize; $i++) {
                $vector[$i] /= $count;
            }
        }

        return $vector;
    }

    private function getSubwords(string $word): array
    {
        $subwords = [];
        $word = '<' . $word . '>'; // Добавляем специальные символы

        for ($n = $this->minN; $n <= $this->maxN; $n++) {
            for ($i = 0; $i <= strlen($word) - $n; $i++) {
                $subwords[] = substr($word, $i, $n);
            }
        }

        return $subwords;
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

    public function getName(): string
    {
        return 'fasttext';
    }

    public function getDescription(): string
    {
        return 'FastText based semantic search algorithm';
    }

    public function getParameters(): array
    {
        return $this->parameters ?? [];
    }

    public function setParameters(array $parameters): void
    {
        $this->parameters = $parameters;
    }

    public function indexDocuments(array $documents): void
    {
        $this->validateDocuments($documents);
        $this->documents = $documents;

        // Инициализируем векторы для слов
        $words = [];
        foreach ($documents as $content) {
            $words = array_merge($words, $this->preprocessDocument($content));
        }
        $words = array_unique($words);

        foreach ($words as $word) {
            if (!isset($this->wordVectors[$word])) {
                $this->wordVectors[$word] = $this->generateRandomVector();
            }
        }

        // Инициализируем векторы для подстрок
        foreach ($words as $word) {
            $subwords = $this->getSubwords($word);
            foreach ($subwords as $subword) {
                if (!isset($this->subwordVectors[$subword])) {
                    $this->subwordVectors[$subword] = $this->generateRandomVector();
                }
            }
        }

        $this->isIndexed = true;
        $this->logIndexing(count($documents));
    }

    private function generateRandomVector(): array
    {
        $vector = [];
        for ($i = 0; $i < $this->vectorSize; $i++) {
            $vector[] = (mt_rand() / mt_getrandmax()) * 2 - 1; // Случайное число от -1 до 1
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

    public function search(string $query, int $limit = 5): array
    {
        $this->validateIndexed();
        $this->validateQuery($query);
        $this->validateLimit($limit);
        return $this->searchImplementation($query, $limit);
    }

    public function saveModel(string $path): void
    {
        $this->validatePath($path);
        $this->logModelOperation('saving', $path);
        $data = [
            'documents' => $this->documents,
            'word_vectors' => $this->wordVectors,
            'subword_vectors' => $this->subwordVectors,
            'parameters' => $this->parameters
        ];
        if (!file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT))) {
            throw new \RuntimeException("Failed to save model to: $path");
        }
    }
} 