<?php

use App\Http\Controllers\Backend\MainController;
use App\Http\Controllers\Backend\DevelopmentController;
use App\Http\Controllers\Common\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Common\ModuleController;
use Illuminate\Support\Facades\Route;

// Dashboard
Route::group(['prefix' => 'panel'], function () {
    // Component playground (uses PlaygroundController)
    Route::get('/playground', function () {
        return redirect('/admin/playground');
    })->name('playground.redirect');

    // Module system - redirects to permalink-based module controller
    Route::match(['get', 'post'], '/PG/{path?}', function ($path = '') {
        return redirect()->route('admin.module.run', ['slug' => $path]);
    })
        ->where('path', '.*')
        ->name('development.redirect');

    // Redirects for moved routes
    Route::get('/json-path-editor', function () {
        return redirect('/admin/json-path-editor');
    })->name('jsonPathEditor.redirect');

    Route::get('/debug-tabs', function () {
        return redirect('/admin/debug-tabs');
    })->name('debug-tabs.redirect');

    Route::get('/scene', function () {
        return redirect('/admin/scene');
    })->name('scene.redirect');

    Route::get('/shortcuts', function () {
        return redirect('/admin/shortcuts');
    })->name('shortcuts.redirect');

    Route::get('/file-selector', function () {
        return redirect('/admin/file-storage/file-selector');
    })->name('fileStorage.fileSelector.redirect');

    Route::get('/vueflow', function () {
        return redirect('/admin/file-storage/vueflow');
    })->name('fileStorage.vueflow.redirect');

    // URL Management redirects
    Route::get('/permalinks', function () {
        return redirect('/admin/permalinks');
    })->name('permalinks.redirect');

    Route::get('/url', function () {
        return redirect('/admin/permalinks');
    })->name('url.redirect');

    // Uncommented Auth Routes
    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login')
        ->middleware('guest');

    Route::post('login', [AuthenticatedSessionController::class, 'store'])
        ->name('login.store')
        ->middleware('guest');

    Route::get('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    // Restore MainController routes
    Route::post('/{path?}', [MainController::class, 'index'])
        ->where('path', '[^/\.]*') // Original regex, might need review
        ->name('dashboard.post');

    // Catch-all route for modules - redirects to permalink-based module controller
    Route::get('/{path?}', function ($path = '') {
        // Restore call to MainController for empty path
        if (empty($path)) {
            return app()->call([MainController::class, 'index']);
        }
        return redirect()->route('admin.module.run', ['slug' => $path]);
    })
        ->where('path', '.*')
        ->name('dashboard.get');
});
