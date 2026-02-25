<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Helpers\Helper;

class HelperServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(Helper::class, function ($app) {
            return Helper::getSingleton();
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