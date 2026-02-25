<?php

declare(strict_types=1);

namespace App\Search;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

abstract class AbstractSearchAlgorithm implements SearchAlgorithmInterface
{
    protected array $documents = [];
    protected array $parameters = [];
    protected Logger $logger;
    protected bool $isIndexed = false;
    protected WordLists $wordLists;
    protected KeywordRating $keywordRating;
    protected bool $fileSplittingEnabled = false;
    protected int $fileChunkSize = 200;

    public function __construct(array $parameters = [])
    {
        $this->parameters = $parameters;
        $this->logger = new Logger(static::class);
        $this->logger->pushHandler(new StreamHandler('php://stdout', Logger::DEBUG));
        $this->wordLists = new WordLists($parameters['lists_dir'] ?? 'config/word_lists');
        $this->keywordRating = new KeywordRating($parameters['config_dir'] ?? 'config');
        $this->fileSplittingEnabled = $parameters['file_splitting']['enabled'] ?? false;
        $this->fileChunkSize = $parameters['file_splitting']['chunk_size'] ?? 200;
    }

    public function getParameters(): array
    {
        return $this->parameters;
    }

    public function setParameters(array $parameters): void
    {
        $this->parameters = $parameters;
    }

    protected function validateIndexed(): void
    {
        if (!$this->isIndexed) {
            throw new \RuntimeException('Documents must be indexed before searching');
        }
    }

    protected function validateDocuments(array $documents): void
    {
        if (empty($documents)) {
            throw new \RuntimeException('Documents array cannot be empty');
        }

        foreach ($documents as $path => $content) {
            if (!is_string($path) || !is_string($content)) {
                throw new \RuntimeException('Documents must be an array of strings');
            }
        }
    }

    protected function validateQuery(string $query): void
    {
        if (empty(trim($query))) {
            throw new \RuntimeException('Search query cannot be empty');
        }
    }

    protected function validateLimit(int $limit): void
    {
        if ($limit < 1) {
            throw new \RuntimeException('Limit must be greater than 0');
        }
    }

    protected function validatePath(string $path): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0777, true)) {
            throw new \RuntimeException("Cannot create directory: $dir");
        }
    }

    protected function logIndexing(int $count): void
    {
        $this->logger->info('Documents indexed', [
            'count' => $count,
            'algorithm' => $this->getName()
        ]);
    }

    protected function logSearch(string $query, array $results): void
    {
        $this->logger->info('Search completed', [
            'query' => $query,
            'results' => count($results),
            'algorithm' => $this->getName()
        ]);
    }

    protected function logModelOperation(string $operation, string $path): void
    {
        $this->logger->info("Model $operation", [
            'path' => $path,
            'algorithm' => $this->getName()
        ]);
    }

    protected function splitFileContent(string $content, string $filePath): array
    {
        if (!$this->fileSplittingEnabled) {
            return [$filePath => $content];
        }

        $lines = explode("\n", $content);
        $totalLines = count($lines);
        $chunks = [];
        
        if ($totalLines <= $this->fileChunkSize) {
            return [$filePath => $content];
        }

        // Calculate number of chunks
        $numChunks = ceil($totalLines / $this->fileChunkSize);
        
        // Split into chunks
        for ($i = 0; $i < $numChunks; $i++) {
            $start = $i * $this->fileChunkSize;
            $length = ($i === $numChunks - 1) ? $totalLines - $start : $this->fileChunkSize;
            
            $chunkContent = implode("\n", array_slice($lines, $start, $length));
            $chunkPath = sprintf("%s.part%d", $filePath, $i + 1);
            
            $chunks[$chunkPath] = $chunkContent;
        }

        return $chunks;
    }

    protected function groupSearchResults(array $results): array
    {
        if (!$this->fileSplittingEnabled) {
            return $results;
        }

        $groupedResults = [];
        foreach ($results as $result) {
            $filePath = $result['path'];
            $basePath = preg_replace('/\.part\d+$/', '', $filePath);
            
            if (!isset($groupedResults[$basePath])) {
                $groupedResults[$basePath] = [
                    'path' => $basePath,
                    'score' => 0,
                    'matches' => [],
                    'parts' => []
                ];
            }

            $groupedResults[$basePath]['score'] += $result['score'];
            $groupedResults[$basePath]['matches'] = array_merge(
                $groupedResults[$basePath]['matches'],
                $result['matches']
            );
            $groupedResults[$basePath]['parts'][] = [
                'part' => $filePath,
                'score' => $result['score']
            ];
        }

        // Sort by score
        uasort($groupedResults, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        return array_values($groupedResults);
    }

    protected function preprocessDocument(string $document): array
    {
        // Приводим к нижнему регистру
        $document = mb_strtolower($document);

        // Удаляем специальные символы
        $document = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $document);

        // Разбиваем на слова
        $words = preg_split('/\s+/', $document, -1, PREG_SPLIT_NO_EMPTY);

        // Удаляем стоп-слова и применяем веса
        $processedWords = [];
        foreach ($words as $word) {
            if (is_string($word) && !$this->wordLists->isStopWord($word)) {
                // Получаем базовый вес из списков слов
                $baseWeight = $this->wordLists->getTermWeight($word);
                
                // Получаем рейтинг ключевого слова
                $keywordRating = $this->keywordRating->getRating($word);
                
                // Комбинируем веса
                $finalWeight = $baseWeight * (1 + ($keywordRating / 10));
                
                // Добавляем слово нужное количество раз
                for ($i = 0; $i < ceil($finalWeight); $i++) {
                    $processedWords[] = (string)$word;
                }
            }
        }

        return $processedWords;
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

    protected function getContext(string $line, array $lines): string
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

    protected function extractTags(string $content): array
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
            $words = $this->preprocessDocument($content);
            $tags['keywords'] = array_slice($words, 0, 5);
        }

        // Добавляем теги из специализированных списков
        foreach ($this->wordLists->getAllLists() as $listName => $words) {
            if ($listName !== 'stop_words') {
                foreach ($words as $word) {
                    if (is_string($word) && stripos($content, $word) !== false) {
                        $tags['keywords'][] = $word;
                        // Увеличиваем рейтинг для часто используемых терминов
                        $this->keywordRating->updateRating($word, 0.1);
                    }
                }
            }
        }

        $tags['keywords'] = array_unique($tags['keywords']);
        return $tags;
    }

    public function getKeywordStats(): array
    {
        return [
            'top_keywords' => $this->keywordRating->getTopKeywords(10),
            'suggestions' => $this->keywordRating->getKeywordSuggestions(''),
            'categories' => $this->keywordRating->getKeywordsByCategory(
                array_keys($this->wordLists->getAllLists())
            )
        ];
    }

    public function adjustKeywordRatings(): void
    {
        $this->keywordRating->adjustRatingsBySuccessRate();
        $this->keywordRating->applyDecay();
    }
} 