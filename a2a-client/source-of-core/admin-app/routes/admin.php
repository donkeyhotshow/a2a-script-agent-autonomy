<?php

use App\Http\Controllers\Backend\InstallerController;
use App\Http\Controllers\Backend\JsonPathEditorController;
use App\Http\Controllers\Backend\DebugTabsController;

// use App\Http\Controllers\Backend\SceneController; // Moved to planning
use App\Http\Controllers\Backend\ShortcutsController;
use App\Http\Controllers\Backend\FileStorageController;
use App\Http\Controllers\Backend\PlaygroundController;
use App\Http\Controllers\Backend\DashboardController;
use Illuminate\Support\Facades\Route;

// AI-Installer routes
Route::prefix('admin/installer')->group(function () {//
    Route::get('/', [InstallerController::class, 'index'])->name('installer.index');
    Route::get('/module/{moduleName}', [InstallerController::class, 'show'])->name('installer.show');
    Route::post('/module/{moduleName}/install', [InstallerController::class, 'install'])->name('installer.install');
    Route::post('/module/{moduleName}/uninstall', [InstallerController::class, 'uninstall'])->name('installer.uninstall');
    Route::post('/module/{moduleName}/update', [InstallerController::class, 'update'])->name('installer.update');
    Route::post('/upload', [InstallerController::class, 'upload'])->name('installer.upload');
    Route::post('/save', [InstallerController::class, 'saveParamsRequest'])->name('installer.save');
    Route::post('/install', [InstallerController::class, 'install'])->name('installer.install');
});

// Legacy URL Controller Routes (redirects to new permalinks system)
Route::prefix('admin/url')->middleware(['auth'])->group(function () {
    Route::get('/index', function () {
        return redirect()->route('permalinks.index');
    })->name('url.index');
});

// Debug Tabs Controller - COMMENTED OUT due to missing controller
// Route::prefix('admin/debug-tabs')->middleware(['auth'])->group(function () {
//     Route::get('/', [DebugTabsController::class, 'index'])->name('admin.debug-tabs.index');
//     Route::post('/', [DebugTabsController::class, 'parse'])->name('admin.debug-tabs.parse');
// });

// Scene Installer Routes (Moved to planning)
/*
Route::prefix('admin/scene')->middleware(['auth'])->group(function () {
    Route::get('/', [SceneController::class, 'index'])->name('admin.scene.index');
    Route::post('/scene-merge', [SceneController::class, 'sceneMerge'])->name('admin.scene.sceneMerge');
    Route::post('/block-scene-install', [SceneController::class, 'blockSceneInstall'])->name('admin.scene.blockSceneInstall');
    Route::post('/production-copy', [SceneController::class, 'productionCopy'])->name('admin.scene.productionCopyScene');
    Route::post('/clear-scene', [SceneController::class, 'clearScene'])->name('admin.scene.clearScene');
});
*/

// Shortcuts Controller Routes - COMMENTED OUT due to missing controller
/*
Route::prefix('admin/shortcuts')->middleware(['auth'])->group(function () {
    Route::get('/', [ShortcutsController::class, 'index'])->name('admin.shortcuts.index');
});
*/

// File Storage Controller Routes
Route::prefix('admin/file-storage')->middleware(['auth'])->group(function () {
    Route::get('/vueflow', [FileStorageController::class, 'vueflow'])->name('admin.fileStorage.vueflow');
    Route::get('/file-selector', [FileStorageController::class, 'fileSelector'])->name('admin.fileStorage.fileSelector');
});

// Playground Controller Routes - COMMENTED OUT due to missing controller
// Route::prefix('admin/playground')->middleware(['auth'])->group(function () {
//     Route::get('/', [PlaygroundController::class, 'index'])->name('admin.playground.index');
//     Route::post('/preview', [PlaygroundController::class, 'previewComponent'])->name('admin.playground.preview');
// });

// Comment out the entire route group for /permalinks (Moved to planning)
/*
Route::prefix('permalinks')->middleware('auth')->group(function () {
    Route::get('/', [UrlController::class, 'index'])->name('permalinks.index');
    Route::get('/create', [UrlController::class, 'create'])->name('permalinks.create');
    Route::post('/store', [UrlController::class, 'store'])->name('permalinks.store');
    Route::get('/{slug}', [UrlController::class, 'show'])->name('permalinks.show')
        ->where('slug', '.*');
    Route::get('/{slug}/edit', [UrlController::class, 'edit'])->name('permalinks.edit')
        ->where('slug', '.*');
    Route::put('/{slug}', [UrlController::class, 'update'])->name('permalinks.update')
        ->where('slug', '.*');
    Route::delete('/{slug}', [UrlController::class, 'destroy'])->name('permalinks.destroy')
        ->where('slug', '.*');
    Route::get('/reload', [UrlController::class, 'reload'])->name('permalinks.reload');
});
*/

// Comment out the entire route group for /json-path-editor (Moved to planning)
/*
Route::prefix('json-path-editor')->group(function () {
    Route::post('/move', [JsonPathEditorController::class, 'move'])->name('admin.jsonPathEditor.move');
    Route::post('/assign-id', [JsonPathEditorController::class, 'assignId'])->name('admin.jsonPathEditor.assignId');
    Route::get('/{id}', [JsonPathEditorController::class, 'getById'])->name('admin.jsonPathEditor.getById');

    Route::get('/', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'index'])->name('json-editor.index');
    Route::post('/store', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'store'])->name('json-editor.store');
    Route::get('/load', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'load'])->name('json-editor.load');
    Route::get('/query', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'query'])->name('json-editor.query');
    Route::post('/modify', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'modify'])->name('json-editor.modify');
    Route::post('/delete', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'delete'])->name('json-editor.delete');
    Route::post('/validate', [App\Http\Controllers\Backend\JsonPathEditorController::class, 'validate'])->name('json-editor.validate');
});
*/
