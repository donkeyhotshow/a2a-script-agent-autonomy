<?php

namespace App\Engine\Core;

use App\Helpers\PathHelper;
use App\Helpers\FileHelper;
use App\Helpers\JsonHelper;
use Phpml\Tokenization\WhitespaceTokenizer;
use Phpml\FeatureExtraction\TfIdfTransformer;
use Phpml\FeatureExtraction\TokenCountVectorizer;
use Phpml\Math\Statistic\Mean;
use Phpml\Math\Statistic\StandardDeviation;

class NeuralIndexer
{
    private string $indexPath;
    private array $indexData;
    private array $config;
    private TokenCountVectorizer $vectorizer;
    private TfIdfTransformer $transformer;
    private array $stopWords;

    public function __construct(array $config = [])
    {
        $this->indexPath = PathHelper::getEnginePath('index/neural');
        $this->config = array_merge([
            'min_relevance' => 0.7,
            'max_keywords' => 10,
            'batch_size' => 100,
            'min_word_length' => 3,
            'max_word_length' => 20,
            'min_frequency' => 2
        ], $config);
        
        $this->vectorizer = new TokenCountVectorizer(new WhitespaceTokenizer());
        $this->transformer = new TfIdfTransformer();
        $this->loadStopWords();
        $this->loadIndex();
    }

    private function loadStopWords(): void
    {
        $stopWordsFile = PathHelper::join($this->indexPath, 'stopwords.txt');
        if (FileHelper::exists($stopWordsFile)) {
            $this->stopWords = array_fill_keys(
                array_map('trim', file($stopWordsFile)),
                true
            );
        } else {
            // Default English stop words
            $this->stopWords = array_fill_keys([
                'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
                'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
                'that', 'the', 'to', 'was', 'were', 'will', 'with'
            ], true);
        }
    }

    public function indexFile(string $filePath, array $metadata = []): array
    {
        if (!FileHelper::exists($filePath)) {
            throw new \RuntimeException("File not found: $filePath");
        }

        $content = FileHelper::get($filePath);
        $keywords = $this->extractKeywords($content);
        $embedding = $this->generateEmbedding($content);

        $indexEntry = [
            'file_path' => $filePath,
            'keywords' => $keywords,
            'embedding' => $embedding,
            'metadata' => $metadata,
            'indexed_at' => date('Y-m-d H:i:s')
        ];

        $this->indexData[$filePath] = $indexEntry;
        $this->saveIndex();

        return $indexEntry;
    }

    public function search(string $query, array $options = []): array
    {
        $queryEmbedding = $this->generateEmbedding($query);
        $queryKeywords = $this->extractKeywords($query);

        $results = [];
        foreach ($this->indexData as $filePath => $entry) {
            $relevance = $this->calculateRelevance(
                $queryEmbedding,
                $entry['embedding'],
                $queryKeywords,
                $entry['keywords']
            );

            if ($relevance >= ($options['min_relevance'] ?? $this->config['min_relevance'])) {
                $results[] = [
                    'file_path' => $filePath,
                    'relevance' => $relevance,
                    'metadata' => $entry['metadata']
                ];
            }
        }

        usort($results, function($a, $b) {
            return $b['relevance'] <=> $a['relevance'];
        });

        return array_slice($results, 0, $options['limit'] ?? 10);
    }

    public function batchIndex(array $filePaths, array $metadata = []): array
    {
        $results = [];
        $batch = [];
        
        foreach ($filePaths as $filePath) {
            $batch[] = $filePath;
            
            if (count($batch) >= $this->config['batch_size']) {
                $results = array_merge($results, $this->processBatch($batch, $metadata));
                $batch = [];
            }
        }
        
        if (!empty($batch)) {
            $results = array_merge($results, $this->processBatch($batch, $metadata));
        }
        
        return $results;
    }

    private function processBatch(array $filePaths, array $metadata): array
    {
        $results = [];
        foreach ($filePaths as $filePath) {
            try {
                $results[] = $this->indexFile($filePath, $metadata);
            } catch (\Throwable $e) {
                // Log error and continue
                error_log("Failed to index file: $filePath - " . $e->getMessage());
            }
        }
        return $results;
    }

    private function extractKeywords(string $text): array
    {
        // Preprocess text
        $text = strtolower($text);
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Tokenize
        $tokens = (new WhitespaceTokenizer())->tokenize($text);
        
        // Filter tokens
        $filteredTokens = array_filter($tokens, function($token) {
            $length = mb_strlen($token);
            return $length >= $this->config['min_word_length'] 
                && $length <= $this->config['max_word_length']
                && !isset($this->stopWords[$token]);
        });
        
        // Calculate term frequencies
        $frequencies = array_count_values($filteredTokens);
        
        // Calculate TF-IDF scores
        $this->vectorizer->fit([$text]);
        $this->vectorizer->transform([$text]);
        $this->transformer->fit($this->vectorizer->getVocabulary());
        $this->transformer->transform($this->vectorizer->getVocabulary());
        
        // Get top keywords by TF-IDF score
        arsort($frequencies);
        return array_slice(
            array_keys($frequencies),
            0,
            $this->config['max_keywords']
        );
    }

    private function generateEmbedding(string $text): array
    {
        // Tokenize and preprocess
        $tokens = (new WhitespaceTokenizer())->tokenize(strtolower($text));
        $filteredTokens = array_filter($tokens, function($token) {
            return !isset($this->stopWords[$token]);
        });
        
        // Calculate TF-IDF vector
        $this->vectorizer->fit([$text]);
        $this->vectorizer->transform([$text]);
        $this->transformer->fit($this->vectorizer->getVocabulary());
        $this->transformer->transform($this->vectorizer->getVocabulary());
        
        // Normalize vector
        $vector = $this->transformer->transform($this->vectorizer->getVocabulary())[0];
        $mean = Mean::arithmetic($vector);
        $std = StandardDeviation::population($vector);
        
        return array_map(function($value) use ($mean, $std) {
            return $std != 0 ? ($value - $mean) / $std : 0;
        }, $vector);
    }

    private function calculateRelevance(array $queryEmbedding, array $docEmbedding, array $queryKeywords, array $docKeywords): float
    {
        // Calculate cosine similarity between embeddings
        $dotProduct = 0;
        $queryNorm = 0;
        $docNorm = 0;
        
        foreach ($queryEmbedding as $i => $value) {
            $dotProduct += $value * $docEmbedding[$i];
            $queryNorm += $value * $value;
            $docNorm += $docEmbedding[$i] * $docEmbedding[$i];
        }
        
        $cosineSimilarity = $dotProduct / (sqrt($queryNorm) * sqrt($docNorm));
        
        // Calculate keyword overlap
        $commonKeywords = array_intersect($queryKeywords, $docKeywords);
        $keywordOverlap = count($commonKeywords) / max(count($queryKeywords), count($docKeywords));
        
        // Combine scores (70% embedding similarity, 30% keyword overlap)
        return 0.7 * $cosineSimilarity + 0.3 * $keywordOverlap;
    }

    private function loadIndex(): void
    {
        $indexFile = PathHelper::join($this->indexPath, 'index.json');
        if (FileHelper::exists($indexFile)) {
            $this->indexData = JsonHelper::loadFileInstructions($indexFile);
        } else {
            $this->indexData = [];
        }
    }

    private function saveIndex(): void
    {
        $indexFile = PathHelper::join($this->indexPath, 'index.json');
        FileHelper::putJson($indexFile, $this->indexData);
    }
} 