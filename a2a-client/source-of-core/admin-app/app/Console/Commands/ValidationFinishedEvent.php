<?php

namespace App\Console\Commands;

class ValidationFinishedEvent
{
    protected array $stats;

    public function __construct(array $stats = [])
    {
        $this->stats = $stats;
    }

    public function getStats(): array
    {
        return $this->stats;
    }
} 