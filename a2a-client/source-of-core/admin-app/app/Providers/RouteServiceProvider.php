<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('panel')
            ->prefix(config('app.backend_prefix'))
            ->group(base_path('routes/panel.php'));
    }
}
