<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Helpers\ScriptHelper;

class ScriptServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(ScriptHelper::class, function ($app) {
            return ScriptHelper::getSingleton();
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