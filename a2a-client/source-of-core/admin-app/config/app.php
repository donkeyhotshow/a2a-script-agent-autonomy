<?php
return [
    /*    'aliases' => [
            'Processor' => App\Facades\ProcessorFacade::class,
            'Storage' => App\Facades\StorageManager::class,
    //        'Str' => Illuminate\Support\Str::class
        ],*/

    /*
    |--------------------------------------------------------------------------
    | Application URL
    |--------------------------------------------------------------------------
    |
    | This URL is used by the console to properly generate URLs when using
    | the Artisan command line tool. You should set this to the root of
    | your application so that it is used when running Artisan tasks.
    |
    */

    'url' => env('APP_URL', 'https://barberxxl.com.ua'),

    'asset_url' => env('ASSET_URL'),

    /*
    |--------------------------------------------------------------------------
    | Application Home Module
    |--------------------------------------------------------------------------
    |
    | This value determines which module will be used for the root URL (/).
    | It should be a valid module name that exists in the system.
    |
    */

    'home_module' => env('APP_HOME_MODULE', 'landing-main-page'),

    'providers' => \Illuminate\Support\ServiceProvider::defaultProviders()->merge([
        /*
         * Package Service Providers...
         */

        /*
         * Application Service Providers...
         */
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
        App\Providers\HelperServiceProvider::class,
        App\Providers\ScriptServiceProvider::class,
        App\Providers\ScriptProcessorServiceProvider::class,
        App\Providers\SearchServiceProvider::class,
    ])->toArray(),

];
