<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * @deprecated Этот провайдер устарел и должен быть пересмотрен или удален в связи с переходом на libs/search-indexer.
 */
class SearchServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Удалена регистрация SearchService, так как он заменяется libs/search-indexer.
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Publish configuration
        $this->publishes([
            __DIR__.'/../../config/search.php' => config_path('search.php'),
        ], 'search-config');

        // Метод createRequiredDirectories удален, так как управление директориями будет осуществляться новой библиотекой индексатора.
    }
} 