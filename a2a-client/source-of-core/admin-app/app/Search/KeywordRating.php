<?php

declare(strict_types=1);

namespace App\Search;

class KeywordRating
{
    private array $ratings = [];
    private array $usageStats = [];
    private string $ratingsFile;
    private string $statsFile;
    private float $decayFactor = 0.95; // Фактор затухания рейтинга со временем
    private int $minRating = 1;
    private int $maxRating = 10;

    public function __construct(string $configDir = 'config')
    {
        $this->ratingsFile = $configDir . '/keyword_ratings.json';
        $this->statsFile = $configDir . '/keyword_stats.json';
        $this->loadRatings();
        $this->loadStats();
    }

    private function loadRatings(): void
    {
        if (file_exists($this->ratingsFile)) {
            $data = json_decode(file_get_contents($this->ratingsFile), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $this->ratings = $data;
            }
        }
    }

    private function loadStats(): void
    {
        if (file_exists($this->statsFile)) {
            $data = json_decode(file_get_contents($this->statsFile), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $this->usageStats = $data;
            }
        }
    }

    private function saveRatings(): void
    {
        file_put_contents($this->ratingsFile, json_encode($this->ratings, JSON_PRETTY_PRINT));
    }

    private function saveStats(): void
    {
        file_put_contents($this->statsFile, json_encode($this->usageStats, JSON_PRETTY_PRINT));
    }

    public function getRating(string $keyword): float
    {
        $keyword = strtolower($keyword);
        return $this->ratings[$keyword] ?? $this->minRating;
    }

    public function setRating(string $keyword, float $rating): void
    {
        $keyword = strtolower($keyword);
        $this->ratings[$keyword] = max($this->minRating, min($this->maxRating, $rating));
        $this->saveRatings();
    }

    public function updateRating(string $keyword, float $delta): void
    {
        $keyword = strtolower($keyword);
        $currentRating = $this->getRating($keyword);
        $this->setRating($keyword, $currentRating + $delta);
    }

    public function recordUsage(string $keyword, bool $wasSuccessful): void
    {
        $keyword = strtolower($keyword);
        if (!isset($this->usageStats[$keyword])) {
            $this->usageStats[$keyword] = [
                'total' => 0,
                'successful' => 0,
                'last_used' => time()
            ];
        }

        $this->usageStats[$keyword]['total']++;
        if ($wasSuccessful) {
            $this->usageStats[$keyword]['successful']++;
        }
        $this->usageStats[$keyword]['last_used'] = time();
        $this->saveStats();
    }

    public function getUsageStats(string $keyword): array
    {
        $keyword = strtolower($keyword);
        return $this->usageStats[$keyword] ?? [
            'total' => 0,
            'successful' => 0,
            'last_used' => 0
        ];
    }

    public function getSuccessRate(string $keyword): float
    {
        $stats = $this->getUsageStats($keyword);
        if ($stats['total'] === 0) {
            return 0.0;
        }
        return $stats['successful'] / $stats['total'];
    }

    public function applyDecay(): void
    {
        $currentTime = time();
        foreach ($this->ratings as $keyword => $rating) {
            $lastUsed = $this->usageStats[$keyword]['last_used'] ?? 0;
            $daysSinceLastUse = ($currentTime - $lastUsed) / (24 * 3600);
            
            if ($daysSinceLastUse > 30) { // Применяем затухание после 30 дней неиспользования
                $decay = pow($this->decayFactor, $daysSinceLastUse - 30);
                $this->setRating($keyword, $rating * $decay);
            }
        }
        $this->saveRatings();
    }

    public function getTopKeywords(int $limit = 10): array
    {
        arsort($this->ratings);
        return array_slice($this->ratings, 0, $limit, true);
    }

    public function getKeywordsByCategory(array $categories): array
    {
        $result = [];
        foreach ($categories as $category) {
            if (isset($this->ratings[$category])) {
                $result[$category] = $this->ratings[$category];
            }
        }
        return $result;
    }

    public function adjustRatingsBySuccessRate(): void
    {
        foreach ($this->usageStats as $keyword => $stats) {
            if ($stats['total'] >= 10) { // Минимальное количество использований для корректировки
                $successRate = $this->getSuccessRate($keyword);
                $currentRating = $this->getRating($keyword);
                
                // Корректируем рейтинг на основе успешности, но более мягко
                $adjustment = ($successRate - 0.5) * 0.5; // Уменьшаем влияние корректировки
                $newRating = $currentRating + $adjustment;
                
                // Ограничиваем изменение рейтинга
                $maxChange = 0.5; // Максимальное изменение за одну корректировку
                if (abs($newRating - $currentRating) > $maxChange) {
                    $newRating = $currentRating + ($newRating > $currentRating ? $maxChange : -$maxChange);
                }
                
                $this->setRating($keyword, $newRating);
            }
        }
    }

    public function getKeywordSuggestions(string $prefix, int $limit = 5): array
    {
        $suggestions = [];
        foreach ($this->ratings as $keyword => $rating) {
            if (strpos($keyword, strtolower($prefix)) === 0) {
                $suggestions[$keyword] = $rating;
            }
        }
        arsort($suggestions);
        return array_slice($suggestions, 0, $limit, true);
    }

    public function exportRatings(string $format = 'json'): string
    {
        switch ($format) {
            case 'json':
                return json_encode($this->ratings, JSON_PRETTY_PRINT);
            case 'csv':
                $csv = "keyword,rating\n";
                foreach ($this->ratings as $keyword => $rating) {
                    $csv .= "\"$keyword\",$rating\n";
                }
                return $csv;
            default:
                throw new \InvalidArgumentException("Unsupported format: $format");
        }
    }

    public function importRatings(string $data, string $format = 'json'): void
    {
        switch ($format) {
            case 'json':
                $ratings = json_decode($data, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new \InvalidArgumentException("Invalid JSON data");
                }
                $this->ratings = $ratings;
                break;
            case 'csv':
                $lines = explode("\n", trim($data));
                array_shift($lines); // Пропускаем заголовок
                foreach ($lines as $line) {
                    if (empty($line)) continue;
                    list($keyword, $rating) = str_getcsv($line);
                    $this->setRating($keyword, (float)$rating);
                }
                break;
            default:
                throw new \InvalidArgumentException("Unsupported format: $format");
        }
        $this->saveRatings();
    }
} 