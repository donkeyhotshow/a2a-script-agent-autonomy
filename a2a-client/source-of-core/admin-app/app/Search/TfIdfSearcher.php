<?php

declare(strict_types=1);

namespace App\Search;

use Phpml\FeatureExtraction\TfIdfTransformer;
use Phpml\Math\Statistic\Mean;
use Phpml\Math\Statistic\StandardDeviation;
use Phpml\Tokenization\WhitespaceTokenizer;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

class TfIdfSearcher implements SearchAlgorithmInterface
{
    private array $documents = [];
    private array $tfIdfVectors = [];
    private TfIdfTransformer $transformer;
    private array $documentIds = [];
    private array $vocabulary = [];
    private Logger $logger;
    private array $config;
    private array $parameters;
    private bool $isIndexed = false;

    public function __construct(array $config = [])
    {
        $this->config = $config;
        $this->transformer = new TfIdfTransformer();
        $this->logger = new Logger('tfidf_searcher');
        $this->logger->pushHandler(new StreamHandler('php://stdout', Logger::DEBUG));
    }

    protected function validateDocuments(array $documents): void
    {
        if (empty($documents)) {
            throw new \InvalidArgumentException('Documents array cannot be empty');
        }

        foreach ($documents as $id => $content) {
            if (!is_string($content)) {
                throw new \InvalidArgumentException("Document content must be a string, got " . gettype($content));
            }
            if (empty($content)) {
                throw new \InvalidArgumentException("Document content cannot be empty for id: $id");
            }
        }
    }

    protected function validateQuery(string $query): void
    {
        if (empty($query)) {
            throw new \InvalidArgumentException('Search query cannot be empty');
        }
    }

    protected function validateLimit(int $limit): void
    {
        if ($limit <= 0) {
            throw new \InvalidArgumentException('Limit must be greater than 0');
        }
    }

    protected function validateIndexed(): void
    {
        if (!$this->isIndexed) {
            throw new \RuntimeException('Documents must be indexed before searching');
        }
    }

    protected function validatePath(string $path): void
    {
        if (empty($path)) {
            throw new \InvalidArgumentException('Path cannot be empty');
        }
    }

    protected function validateParameters(array $required): void
    {
        foreach ($required as $param) {
            if (!isset($this->parameters[$param])) {
                throw new \InvalidArgumentException("Required parameter '{$param}' is not set");
            }
        }
    }

    public function getDescription(): string
    {
        return 'TF-IDF based search algorithm';
    }

    public function indexDocuments(array $documents): void
    {
        $this->validateDocuments($documents);
        $this->validateParameters(['vector_size', 'min_df', 'max_df', 'ngram_range']);

        $this->logger->info('Starting document indexing');

        $this->documents = $documents;
        $tokenizer = new WhitespaceTokenizer();
        $tokenizedDocs = [];
        $this->documentIds = [];
        $this->vocabulary = [];

        // Сначала собираем все уникальные токены
        $allTokens = [];
        foreach ($documents as $content) {
            $tokens = $this->preprocessDocument($content);
            $allTokens = array_merge($allTokens, $tokens);
        }
        $uniqueTokens = array_unique($allTokens);
        sort($uniqueTokens);

        // Создаем словарь
        $this->vocabulary = array_flip($uniqueTokens);

        // Преобразуем документы в векторы частот
        foreach ($documents as $id => $content) {
            $tokens = $this->preprocessDocument($content);
            $vector = array_fill(0, count($this->vocabulary), 0);
            
            foreach ($tokens as $token) {
                if (isset($this->vocabulary[$token])) {
                    $vector[$this->vocabulary[$token]]++;
                }
            }
            
            $tokenizedDocs[] = $vector;
            $this->documentIds[] = $id;
        }

        // Отладочная информация
        $this->logger->debug('Tokenized documents structure:', [
            'sample' => array_slice($tokenizedDocs, 0, 1),
            'types' => array_map('gettype', array_slice($tokenizedDocs[0], 0, 5))
        ]);

        $this->transformer->fit($tokenizedDocs);
        $this->transformer->transform($tokenizedDocs);
        $this->tfIdfVectors = $tokenizedDocs;

        $this->isIndexed = true;
    }

    public function search(string $query, int $limit = 5): array
    {
        $this->validateIndexed();
        $this->validateQuery($query);
        $this->validateLimit($limit);

        $this->logger->info('Starting search', ['query' => $query]);

        $tokenizer = new WhitespaceTokenizer();
        $queryTokens = $tokenizer->tokenize($query);
        
        $processedQuery = $this->preprocessDocument($query);
        $queryVector = [array_fill(0, count($this->vocabulary), 0)];
        foreach ($processedQuery as $token) {
            if (isset($this->vocabulary[$token])) {
                $queryVector[0][$this->vocabulary[$token]]++;
            }
        }
        $this->transformer->transform($queryVector);
        $queryVector = $queryVector[0];

        $scores = [];
        foreach ($this->tfIdfVectors as $i => $vector) {
            $similarity = $this->cosineSimilarity($queryVector, $vector);
            $scores[$this->documentIds[$i]] = $similarity;
        }

        arsort($scores);
        $results = array_slice($scores, 0, $limit, true);

        $searchResults = [];
        $count = 0;
        foreach ($results as $id => $relevance) {
            if ($count >= $limit) {
                break;
            }

            $content = $this->documents[$id];
            $matches = $this->findMatches($query, $content);
            $tags = $this->extractTags($content);

            $searchResults[] = [
                'path' => $id,
                'relevance' => $relevance,
                'matches' => $matches,
                'tags' => $tags
            ];

            $count++;
        }

        $this->logger->info('Search completed', ['results' => count($searchResults)]);
        return $searchResults;
    }

    private function cosineSimilarity(array $vec1, array $vec2): float
    {
        $dotProduct = 0;
        $norm1 = 0;
        $norm2 = 0;

        foreach ($vec1 as $i => $val1) {
            $val2 = $vec2[$i] ?? 0;
            $dotProduct += $val1 * $val2;
            $norm1 += $val1 * $val1;
            $norm2 += $val2 * $val2;
        }

        if ($norm1 == 0 || $norm2 == 0) {
            return 0;
        }

        return $dotProduct / (sqrt($norm1) * sqrt($norm2));
    }

    public function getDocument(int $id): ?string
    {
        return $this->documents[$id] ?? null;
    }

    public function saveModel(string $path): void
    {
        $this->validatePath($path);
        // $this->logModelOperation('saving', $path);

        $data = [
            'documents' => $this->documents,
            'tfIdfVectors' => $this->tfIdfVectors,
            'config' => $this->config,
            'vocabulary' => $this->vocabulary,
            'documentIds' => $this->documentIds
        ];

        if (!file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT))) {
            throw new \RuntimeException("Failed to save model to: $path");
        }

        $this->logger->info('Model saved', ['path' => $path]);
    }

    public function loadModel(string $path): void
    {
        if (!file_exists($path)) {
            throw new \RuntimeException("Model file not found: $path");
        }

        // $this->logModelOperation('loading', $path);
        $data = json_decode(file_get_contents($path), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException("Invalid model file: " . json_last_error_msg());
        }

        $this->documents = $data['documents'];
        $this->tfIdfVectors = $data['tfIdfVectors'];
        $this->config = $data['config'];
        $this->vocabulary = $data['vocabulary'] ?? [];
        $this->documentIds = $data['documentIds'] ?? [];

        // Пересоздаем трансформер и обучаем его
        $this->transformer = new TfIdfTransformer();
        $tokenizedDocs = [];
        foreach ($this->documents as $id => $content) {
            $tokens = $this->preprocessDocument($content);
            $vector = array_fill(0, count($this->vocabulary), 0);
            foreach ($tokens as $token) {
                if (isset($this->vocabulary[$token])) {
                    $vector[$this->vocabulary[$token]]++;
                }
            }
            $tokenizedDocs[] = $vector;
        }
        $this->transformer->fit($tokenizedDocs);

        $this->isIndexed = true;
        $this->logger->info('Model loaded', ['path' => $path]);
    }

    private function preprocessDocument(string $document): array
    {
        $tokenizer = new WhitespaceTokenizer();
        $tokens = $tokenizer->tokenize($document);

        if ($this->parameters['split_camel_case'] ?? false) {
            $tokens = $this->splitCamelCase($tokens);
        }
        if ($this->parameters['split_snake_case'] ?? false) {
            $tokens = $this->splitSnakeCase($tokens);
        }
        if ($this->parameters['remove_special_chars'] ?? false) {
            $tokens = $this->removeSpecialChars($tokens);
        }
        if (isset($this->parameters['min_word_length'])) {
            $tokens = $this->filterByLength($tokens, $this->parameters['min_word_length']);
        }

        return $tokens;
    }

    private function buildVocabulary(array $documents): void
    {
        $this->vocabulary = [];
        $termFrequencies = [];

        foreach ($documents as $doc) {
            foreach ($doc as $term) {
                if (!isset($termFrequencies[$term])) {
                    $termFrequencies[$term] = 0;
                }
                $termFrequencies[$term]++;
            }
        }

        $minDf = $this->parameters['min_df'];
        $maxDf = $this->parameters['max_df'] * count($documents);

        foreach ($termFrequencies as $term => $freq) {
            if ($freq >= $minDf && $freq <= $maxDf) {
                $this->vocabulary[] = $term;
            }
        }

        sort($this->vocabulary);
    }

    private function splitCamelCase(array $tokens): array
    {
        $result = [];
        foreach ($tokens as $token) {
            $result = array_merge($result, preg_split('/(?=[A-Z])/', $token, -1, PREG_SPLIT_NO_EMPTY));
        }
        return $result;
    }

    private function splitSnakeCase(array $tokens): array
    {
        $result = [];
        foreach ($tokens as $token) {
            $result = array_merge($result, explode('_', $token));
        }
        return $result;
    }

    private function removeSpecialChars(array $tokens): array
    {
        return array_map(function($token) {
            return preg_replace('/[^a-zA-Z0-9]/', '', $token);
        }, $tokens);
    }

    private function filterByLength(array $tokens, int $minLength): array
    {
        return array_filter($tokens, function($token) use ($minLength) {
            return strlen($token) >= $minLength;
        });
    }

    private function findMatches(string $query, string $content): array
    {
        $matches = [];
        $queryWords = $this->tokenize($query);
        $contentLines = explode("\n", $content);

        foreach ($contentLines as $line) {
            foreach ($queryWords as $word) {
                if (stripos($line, $word) !== false) {
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

    private function getContext(string $line, array $lines): string
    {
        $lineIndex = array_search($line, $lines);
        if ($lineIndex === false) {
            return '';
        }

        $start = max(0, $lineIndex - 1);
        $end = min(count($lines) - 1, $lineIndex + 1);
        $context = array_slice($lines, $start, $end - $start + 1);

        return implode("\n", $context);
    }

    private function extractTags(string $content): array
    {
        $tags = [
            'keywords' => [],
            'description' => ''
        ];

        // Извлекаем ключевые слова из комментариев
        if (preg_match('/\/\*\*(.*?)\*\//s', $content, $matches)) {
            $comment = $matches[1];
            
            // Извлекаем описание
            if (preg_match('/@description\s+(.*?)(?=@|\*\/)/s', $comment, $descMatch)) {
                $tags['description'] = trim($descMatch[1]);
            }

            // Извлекаем ключевые слова
            if (preg_match('/@keywords\s+(.*?)(?=@|\*\/)/s', $comment, $keywordsMatch)) {
                $tags['keywords'] = array_map('trim', explode(',', $keywordsMatch[1]));
            }
        }

        // Если ключевые слова не найдены, извлекаем их из кода
        if (empty($tags['keywords'])) {
            $tags['keywords'] = array_slice($this->tokenize($content), 0, 5);
        }

        return $tags;
    }

    private function tokenize(string $text): array
    {
        // Приводим к нижнему регистру
        $text = mb_strtolower($text);

        // Удаляем специальные символы
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);

        // Разбиваем на слова
        $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);

        // Удаляем стоп-слова
        $words = array_filter($words, function($word) {
            return strlen($word) > 2 && !in_array($word, $this->getStopWords());
        });

        return array_values($words);
    }

    private function getStopWords(): array
    {
        return [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
            'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
            'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
            'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
            'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
            'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
        ];
    }

    public function getName(): string
    {
        return 'tfidf';
    }

    public function getParameters(): array
    {
        return $this->parameters ?? [];
    }

    public function setParameters(array $parameters): void
    {
        $this->parameters = $parameters;
    }
} 