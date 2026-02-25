<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\ScriptProcessor;
use App\Helpers\ScriptHelper;

class ScriptProcessorServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(ScriptProcessor::class, function ($app) {
            return new ScriptProcessor($app->make(ScriptHelper::class));
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
} 