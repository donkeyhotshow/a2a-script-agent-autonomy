<?php

declare(strict_types=1);

namespace App\Search;

class WordLists
{
    private array $lists = [];
    private string $listsDir;

    public function __construct(string $listsDir = 'config/word_lists')
    {
        $this->listsDir = dirname(__DIR__, 2) . '/' . $listsDir;
        $this->loadLists();
    }

    private function loadLists(): void
    {
        if (!is_dir($this->listsDir)) {
            return;
        }

        $files = glob($this->listsDir . '/*.json');
        foreach ($files as $file) {
            $name = basename($file, '.json');
            $content = json_decode(file_get_contents($file), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($content)) {
                $this->lists[$name] = $content;
            }
        }
    }

    public function getList(string $name): array
    {
        return $this->lists[$name] ?? [];
    }

    public function getAllLists(): array
    {
        return $this->lists;
    }

    public function addList(string $name, array $words): void
    {
        $this->lists[$name] = $words;
        $this->saveList($name);
    }

    public function removeList(string $name): void
    {
        if (isset($this->lists[$name])) {
            unset($this->lists[$name]);
            $this->deleteList($name);
        }
    }

    private function saveList(string $name): void
    {
        if (!is_dir($this->listsDir)) {
            mkdir($this->listsDir, 0777, true);
        }

        $file = $this->listsDir . '/' . $name . '.json';
        file_put_contents($file, json_encode($this->lists[$name], JSON_PRETTY_PRINT));
    }

    private function deleteList(string $name): void
    {
        $file = $this->listsDir . '/' . $name . '.json';
        if (file_exists($file)) {
            unlink($file);
        }
    }

    public function getBoostedTerms(): array
    {
        return array_merge(
            $this->getList('tech_terms'),
            $this->getList('business_terms'),
            $this->getList('security_terms'),
            $this->getList('documentation_terms'),
            $this->getList('testing_terms')
        );
    }

    public function getStopWords(): array
    {
        return $this->getList('stop_words');
    }

    public function isStopWord(string $word): bool
    {
        return in_array(strtolower($word), $this->getStopWords());
    }

    public function isBoostedTerm(string $word): bool
    {
        return in_array(strtolower($word), $this->getBoostedTerms());
    }

    public function getTermWeight(string $word): float
    {
        $word = strtolower($word);
        if ($this->isStopWord($word)) {
            return 0.0;
        }
        if ($this->isBoostedTerm($word)) {
            return 2.0;
        }
        return 1.0;
    }
}